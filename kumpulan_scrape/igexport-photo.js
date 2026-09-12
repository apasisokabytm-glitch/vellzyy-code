/**
 * Judul : IGExport Instagram Photo Downloader
 * Base Url : https://igexport.com/id/photo-download/
 * Author : Vellzyy
 * Deskripsi : Scraper untuk mengunduh postingan foto, carousel, dan video Instagram via igexport.com
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');

const BASE_URL = 'https://igexport.com';

function cleanInstagramUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return '';
  const trimmed = inputUrl.trim();
  const match = trimmed.match(/(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[a-zA-Z0-9_-]+)/i);
  return match ? match[1] + '/' : trimmed;
}

function extractShortcode(inputUrl) {
  const match = inputUrl.match(/\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : '';
}

async function fetchFromApi(endpoint, targetUrl) {
  const requestUrl = `${BASE_URL}${endpoint}?url=${encodeURIComponent(targetUrl)}`;
  const response = await axios.get(requestUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': `${BASE_URL}/id/photo-download/`,
      'Origin': BASE_URL,
      'Accept': 'application/json, text/plain, */*'
    },
    timeout: 20000
  });

  return response.data;
}

async function igexportPhoto(postUrl) {
  if (!postUrl || typeof postUrl !== 'string') {
    throw new Error('URL postingan Instagram harus diisi.');
  }

  const cleanedUrl = cleanInstagramUrl(postUrl);
  const shortcode = extractShortcode(cleanedUrl);

  if (!shortcode) {
    throw new Error('Format URL tidak valid. Masukkan URL postingan Instagram yang valid (contoh: https://www.instagram.com/p/xxx/).');
  }

  let apiData = null;

  try {
    apiData = await fetchFromApi('/api/ig-photo/', cleanedUrl);
  } catch (photoErr) {
    try {
      apiData = await fetchFromApi('/api/ig-reels/', cleanedUrl);
    } catch {
      throw new Error(`Gagal mengambil data postingan Instagram: ${photoErr.message}`);
    }
  }

  if (!apiData || !apiData.ok) {
    try {
      apiData = await fetchFromApi('/api/ig-reels/', cleanedUrl);
    } catch {}
  }

  if (!apiData || !apiData.ok) {
    const errorMsg = apiData?.error || 'Postingan tidak ditemukan atau akun bersifat privat.';
    throw new Error(`Gagal memproses media Instagram: ${errorMsg}`);
  }

  const media = apiData.media;
  let items = [];

  if (Array.isArray(media?.items) && media.items.length > 0) {
    items = media.items.map((item, index) => ({
      index: index + 1,
      type: item.type || 'image',
      url: item.url,
      thumbnail: item.thumbnailUrl || null,
      filename: item.filename || `igexport-${shortcode}-${index + 1}.${item.type === 'video' ? 'mp4' : 'webp'}`
    }));
  } else if (media?.videoUrl) {
    items = [
      {
        index: 1,
        type: 'video',
        url: media.videoUrl,
        thumbnail: media.thumbnailUrl || null,
        filename: media.filename || `igexport-${shortcode}.mp4`
      }
    ];
  }

  if (items.length === 0) {
    throw new Error('Media tidak ditemukan di dalam postingan ini.');
  }

  return {
    status: true,
    shortcode: media?.shortcode || shortcode,
    post_url: cleanedUrl,
    total_items: items.length,
    media: items
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const urlArg = args[0];

  if (!urlArg) {
    console.log('Penggunaan: node igexport-photo.js <url postingan instagram>');
    console.log('Contoh    : node igexport-photo.js "https://www.instagram.com/p/DdGJTxgTkpV/"');
    process.exit(1);
  }

  (async () => {
    try {
      console.log(`Mengambil media dari: ${urlArg} ...\n`);
      const result = await igexportPhoto(urlArg);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = igexportPhoto;
