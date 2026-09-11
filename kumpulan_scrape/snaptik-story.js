/**
 * Judul : TikTok Story Viewer & Downloader (SnapTikID)
 * Base Url : https://snaptikid.com/tiktok-story-viewer
 * Author : Vellzyy
 * Deskripsi : Scraper untuk mengambil dan mendownload story TikTok tanpa watermark secara anonim berdasarkan username atau profil TikTok.
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');

const BASE_URL = 'https://snaptikid.com';
const STORY_VIEWER_URL = `${BASE_URL}/tiktok-story-viewer`;
const AJAX_URL = `${BASE_URL}/wp-admin/admin-ajax.php`;

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
};

function cleanUsername(input) {
  if (!input) return '';
  let clean = input.trim();
  clean = clean.replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, '');
  clean = clean.replace(/^@/, '');
  clean = clean.split(/[/?#]/)[0];
  return clean.trim();
}

function formatTimestamp(epochSeconds) {
  if (!epochSeconds) return null;
  const date = new Date(epochSeconds * 1000);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

async function getNonce() {
  try {
    const response = await axios.get(STORY_VIEWER_URL, {
      headers: DEFAULT_HEADERS,
      timeout: 15000
    });

    const nonceMatch = response.data.match(/var\s+tiktokSV\s*=\s*\{[^}]*"nonce"\s*:\s*"([^"]+)"/);
    if (nonceMatch && nonceMatch[1]) {
      return nonceMatch[1];
    }

    const fallbackMatch = response.data.match(/"nonce"\s*:\s*"([a-f0-9]{10})"/i);
    if (fallbackMatch && fallbackMatch[1]) {
      return fallbackMatch[1];
    }

    throw new Error('Gagal mengekstrak security nonce dari halaman SnapTikID');
  } catch (err) {
    throw new Error(`Gagal membuka halaman SnapTikID: ${err.message}`);
  }
}

async function getTikTokStories(usernameOrUrl) {
  const username = cleanUsername(usernameOrUrl);
  if (!username) {
    throw new Error('Username atau URL TikTok tidak boleh kosong');
  }

  const nonce = await getNonce();

  const formData = new URLSearchParams();
  formData.append('action', 'fetch_tiktok_stories');
  formData.append('nonce', nonce);
  formData.append('input', username);

  try {
    const response = await axios.post(AJAX_URL, formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Origin': BASE_URL,
        'Referer': STORY_VIEWER_URL,
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 25000
    });

    const body = response.data;

    if (!body || !body.success) {
      const errMsg = (body && body.data && body.data.message)
        ? body.data.message
        : `Tidak ditemukan story aktif untuk akun @${username}. Akun mungkin bersifat private atau belum membuat story 24 jam terakhir.`;
      throw new Error(errMsg);
    }

    const resultData = body.data || {};
    const rawItems = Array.isArray(resultData.items) ? resultData.items : [];
    const firstAuthor = rawItems[0] && rawItems[0].author ? rawItems[0].author : {};

    const authorProfile = {
      id: firstAuthor.id || null,
      username: firstAuthor.unique_id || resultData.username || username,
      nickname: firstAuthor.nickname || null,
      avatar: firstAuthor.avatar || null,
      profile_url: `https://www.tiktok.com/@${firstAuthor.unique_id || resultData.username || username}`
    };

    const stories = rawItems.map((item, index) => {
      const hasImages = Array.isArray(item.images) && item.images.length > 0;
      const mediaType = hasImages ? 'image' : 'video';
      const coverUrl = item.cover || item.origin_cover || item.ai_dynamic_cover || null;
      const videoStreamUrl = item.hdplay || item.play || null;

      let music = null;
      if (item.music_info) {
        music = {
          id: item.music_info.id || null,
          title: item.music_info.title || null,
          author: item.music_info.author || null,
          duration: item.music_info.duration || 0,
          music_url: item.music_info.play || item.music || null,
          cover: item.music_info.cover || null
        };
      }

      return {
        index: index + 1,
        id: item.video_id || null,
        type: mediaType,
        title: item.title || item.desc || `Story ${index + 1}`,
        created_at: formatTimestamp(item.create_time),
        timestamp: item.create_time || null,
        duration: item.duration || 0,
        cover: coverUrl,
        download_url: mediaType === 'video' ? videoStreamUrl : (item.images && item.images[0] ? item.images[0] : coverUrl),
        video_url: videoStreamUrl,
        images: hasImages ? item.images : [],
        stats: {
          views: item.play_count !== undefined ? item.play_count : 0,
          likes: item.digg_count !== undefined ? item.digg_count : 0,
          comments: item.comment_count !== undefined ? item.comment_count : 0,
          shares: item.share_count !== undefined ? item.share_count : 0,
          downloads: item.download_count !== undefined ? item.download_count : 0,
          bookmarks: item.collect_count !== undefined ? item.collect_count : 0
        },
        music
      };
    });

    return {
      status: true,
      query: username,
      category: resultData.type || 'stories',
      author: authorProfile,
      total_stories: stories.length,
      stories
    };
  } catch (err) {
    throw new Error(`Gagal mengambil story TikTok @${username}: ${err.message}`);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const targetUsername = args[0] || 'apparelselects';

  getTikTokStories(targetUsername)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      console.log('\nTEST RESULT: TRUE');
    })
    .catch(err => {
      console.error(JSON.stringify({ status: false, error: err.message }, null, 2));
      console.log('\nTEST RESULT: FALSE');
      process.exit(1);
    });
}

module.exports = {
  getTikTokStories,
  cleanUsername
};
