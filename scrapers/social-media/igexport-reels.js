/**
 * Judul : IGExport Instagram Reels Downloader
 * Base Url : https://igexport.com/id/reels-download/
 * Author : Vellzyy
 * Deskripsi : Scraper untuk mengunduh video Reels Instagram berkualitas tinggi via igexport.com
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');

const BASE_URL = 'https://igexport.com';

function cleanInstagramUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return '';
  const trimmed = inputUrl.trim();
  const match = trimmed.match(/(https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/[a-zA-Z0-9_-]+)/i);
  return match ? match[1] + '/' : trimmed;
}

function extractShortcode(inputUrl) {
  const match = inputUrl.match(/\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : '';
}

async function fetchFromApi(endpoint, targetUrl) {
  const requestUrl = `${BASE_URL}${endpoint}?url=${encodeURIComponent(targetUrl)}`;
  const response = await axios.get(requestUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': `${BASE_URL}/id/reels-download/`,
      'Origin': BASE_URL,
      'Accept': 'application/json, text/plain, */*'
    },
    timeout: 20000
  });

  return response.data;
}

async function igexportReels(reelUrl) {
  if (!reelUrl || typeof reelUrl !== 'string') {
    throw new Error('URL Reels Instagram harus diisi.');
  }

  const cleanedUrl = cleanInstagramUrl(reelUrl);
  const shortcode = extractShortcode(cleanedUrl);

  if (!shortcode) {
    throw new Error('Format URL tidak valid. Masukkan URL Reels Instagram yang valid (contoh: https://www.instagram.com/reel/xxx/).');
  }

  let apiData = null;

  try {
    apiData = await fetchFromApi('/api/ig-reels/', cleanedUrl);
  } catch (err) {
    try {
      apiData = await fetchFromApi('/api/ig-photo/', cleanedUrl);
    } catch {
      throw new Error(`Gagal mengambil data Reels Instagram: ${err.message}`);
    }
  }

  if (!apiData || !apiData.ok) {
    try {
      apiData = await fetchFromApi('/api/ig-photo/', cleanedUrl);
    } catch {}
  }

  if (!apiData || !apiData.ok) {
    const errorMsg = apiData?.error || 'Reels tidak ditemukan atau akun bersifat privat.';
    throw new Error(`Gagal memproses video Reels: ${errorMsg}`);
  }

  const media = apiData.media;
  let videoUrl = null;
  let thumbnailUrl = null;
  let filename = null;

  if (media?.videoUrl) {
    videoUrl = media.videoUrl;
    thumbnailUrl = media.thumbnailUrl || null;
    filename = media.filename || `igexport-${shortcode}.mp4`;
  } else if (Array.isArray(media?.items) && media.items.length > 0) {
    const videoItem = media.items.find(i => i.type === 'video') || media.items[0];
    videoUrl = videoItem.url;
    thumbnailUrl = videoItem.thumbnailUrl || null;
    filename = videoItem.filename || `igexport-${shortcode}.mp4`;
  }

  if (!videoUrl) {
    throw new Error('Video Reels tidak ditemukan di dalam tautan ini.');
  }

  return {
    status: true,
    shortcode: media?.shortcode || shortcode,
    post_url: cleanedUrl,
    video_url: videoUrl,
    thumbnail_url: thumbnailUrl,
    filename
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const urlArg = args[0];

  if (!urlArg) {
    console.log('Penggunaan: node igexport-reels.js <url reels instagram>');
    console.log('Contoh    : node igexport-reels.js "https://www.instagram.com/reel/DbLQHTRzdPm/"');
    process.exit(1);
  }

  (async () => {
    try {
      console.log(`Mengambil video reels dari: ${urlArg} ...\n`);
      const result = await igexportReels(urlArg);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = igexportReels;
