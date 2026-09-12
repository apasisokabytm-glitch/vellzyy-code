/**
 * Judul : TikTok Video & Audio Downloader (SnapTikID)
 * Base Url : https://snaptikid.com
 * Author : Vellzyy
 * Deskripsi : Scraper untuk mendownload video TikTok tanpa watermark (HD/SD), audio MP3, dan foto slideshow dari SnapTikID.
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');

const BASE_URL = 'https://snaptikid.com';
const API_ENDPOINT = 'https://www.tikwm.com/api/';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/`,
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'Accept': 'application/json, text/javascript, */*; q=0.01'
};

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
}

function formatNumber(num) {
  if (typeof num === 'number') return num;
  if (!num || isNaN(num)) return 0;
  return Number(num);
}

function formatIsoDate(epochSeconds) {
  if (!epochSeconds) return null;
  const date = new Date(epochSeconds * 1000);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Mengambil data download video/audio/slide TikTok dari SnapTikID.
 * @param {string} tiktokUrl URL video atau slide TikTok (contoh: https://vt.tiktok.com/ZSqachyWa/)
 */
async function downloadTikTok(tiktokUrl) {
  if (!tiktokUrl || typeof tiktokUrl !== 'string') {
    throw new Error('Parameter tiktokUrl wajib diisi berupa string.');
  }

  const cleanUrl = tiktokUrl.trim();
  if (!/tiktok\.com/i.test(cleanUrl)) {
    throw new Error('Format URL tidak valid. Masukkan URL TikTok yang benar.');
  }

  const payload = new URLSearchParams({
    url: cleanUrl,
    hd: 1
  });

  try {
    const response = await axios.post(API_ENDPOINT, payload.toString(), {
      headers: DEFAULT_HEADERS,
      timeout: 30000
    });

    const body = response.data;
    if (!body || body.code !== 0 || !body.data) {
      const errMsg = body && body.msg ? body.msg : 'Gagal mengambil data video dari SnapTikID.';
      throw new Error(errMsg);
    }

    const d = body.data;

    // Kumpulkan opsi download tanpa duplikasi
    const downloads = [];
    const seenUrls = new Set();

    // 1. Video HD No Watermark
    if (d.hdplay && !seenUrls.has(d.hdplay)) {
      downloads.push({
        type: 'video',
        quality: 'HD No Watermark',
        format: 'MP4',
        resolution: (d.width && d.height) ? `${d.width}x${d.height}` : 'HD',
        size: formatBytes(d.hd_size || d.size),
        size_bytes: d.hd_size || d.size || null,
        url: d.hdplay
      });
      seenUrls.add(d.hdplay);
    }

    // 2. Video Standar No Watermark
    if (d.play && !seenUrls.has(d.play)) {
      downloads.push({
        type: 'video',
        quality: 'No Watermark',
        format: 'MP4',
        resolution: (d.width && d.height) ? `${d.width}x${d.height}` : 'SD',
        size: formatBytes(d.size),
        size_bytes: d.size || null,
        url: d.play
      });
      seenUrls.add(d.play);
    }

    // 3. Video With Watermark (hanya jika URL berbeda)
    if (d.wmplay && !seenUrls.has(d.wmplay)) {
      downloads.push({
        type: 'video',
        quality: 'With Watermark',
        format: 'MP4',
        resolution: (d.width && d.height) ? `${d.width}x${d.height}` : 'Watermarked',
        size: formatBytes(d.wm_size),
        size_bytes: d.wm_size || null,
        url: d.wmplay
      });
      seenUrls.add(d.wmplay);
    }

    // 4. Audio MP3
    const audioUrl = d.music || (d.music_info && d.music_info.play) || null;
    if (audioUrl && !seenUrls.has(audioUrl)) {
      downloads.push({
        type: 'audio',
        quality: 'Original Audio',
        format: 'MP3',
        resolution: null,
        size: null,
        size_bytes: null,
        url: audioUrl
      });
      seenUrls.add(audioUrl);
    }

    // Foto / Slideshow jika postingan berupa carousel
    const isSlide = Array.isArray(d.images) && d.images.length > 0;
    const images = isSlide ? Array.from(new Set(d.images)) : [];

    if (isSlide) {
      images.forEach((imgUrl, idx) => {
        if (!seenUrls.has(imgUrl)) {
          downloads.push({
            type: 'image',
            quality: `Photo ${idx + 1}`,
            format: 'JPEG',
            resolution: null,
            size: null,
            size_bytes: null,
            url: imgUrl
          });
          seenUrls.add(imgUrl);
        }
      });
    }

    const cleanResult = {
      status: true,
      data: {
        id: d.id || null,
        type: isSlide ? 'slide' : 'video',
        title: (d.title || '').trim(),
        region: d.region || null,
        duration_seconds: d.duration || 0,
        created_at: formatIsoDate(d.create_time),
        cover: d.cover || d.origin_cover || null,
        author: {
          id: d.author?.id || null,
          username: d.author?.unique_id || null,
          nickname: d.author?.nickname || null,
          avatar: d.author?.avatar || null
        },
        statistics: {
          views: formatNumber(d.play_count),
          likes: formatNumber(d.digg_count),
          comments: formatNumber(d.comment_count),
          shares: formatNumber(d.share_count),
          saves: formatNumber(d.collect_count)
        },
        music: d.music_info ? {
          id: d.music_info.id || null,
          title: d.music_info.title || null,
          author: d.music_info.author || null,
          duration_seconds: d.music_info.duration || null,
          url: audioUrl
        } : null,
        video_nowm: d.hdplay || d.play || null,
        video_wm: (d.wmplay && d.wmplay !== d.play && d.wmplay !== d.hdplay) ? d.wmplay : null,
        images: images,
        downloads: downloads
      }
    };

    return cleanResult;
  } catch (err) {
    throw new Error(`SnapTikID Error: ${err.message}`);
  }
}

// Eksekusi CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const inputUrl = args[0] || 'https://vt.tiktok.com/ZSqachyWa/';

  console.log(`[INFO] Mengunduh data TikTok: ${inputUrl}`);
  downloadTikTok(inputUrl)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(err => {
      console.error('[ERROR]', err.message);
      process.exit(1);
    });
}

module.exports = {
  downloadTikTok
};
