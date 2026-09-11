/**
 * Judul : OCR Image to Text (ocr.ac)
 * Base Url : https://ocr.ac/id
 * Author : Vellzyy
 * Deskripsi : Scraper OCR untuk mengekstrak teks dari gambar secara akurat berdasarkan file path lokal atau URL gambar online.
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_ORIGIN = 'https://ocr.ac';
const BASE_URL = `${BASE_ORIGIN}/id`;
const ACTION_URL = `${BASE_ORIGIN}/action`;

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
};

function getMimeType(filePathOrUrl) {
  const ext = path.extname(filePathOrUrl.split('?')[0]).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.bmp':
      return 'image/bmp';
    case '.gif':
      return 'image/gif';
    case '.jfif':
      return 'image/jpeg';
    case '.heic':
      return 'image/heic';
    case '.heif':
      return 'image/heif';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'image/png';
  }
}

async function resolveImageSource(source, timeout = 30000) {
  if (!source) {
    throw new Error('Harap berikan path file gambar lokal atau URL gambar online.');
  }

  if (Buffer.isBuffer(source)) {
    return {
      base64: `data:image/png;base64,${source.toString('base64')}`,
      filename: `upload_${Date.now()}.png`,
      mimeType: 'image/png',
      sourceType: 'buffer'
    };
  }

  if (typeof source === 'string') {
    const trimmed = source.trim();

    if (trimmed.startsWith('data:image/')) {
      const mimeMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      return {
        base64: trimmed,
        filename: `upload_${Date.now()}.png`,
        mimeType,
        sourceType: 'base64'
      };
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const response = await axios.get(trimmed, {
        responseType: 'arraybuffer',
        timeout,
        headers: {
          'User-Agent': DEFAULT_HEADERS['User-Agent'],
          'Accept': 'image/*,*/*'
        }
      });

      const contentType = response.headers['content-type']
        ? response.headers['content-type'].split(';')[0].trim()
        : getMimeType(trimmed);

      const urlPath = new URL(trimmed).pathname;
      const originalName = path.basename(urlPath) || 'image.png';
      const filename = originalName.includes('.') ? originalName : `${originalName}.png`;

      return {
        base64: `data:${contentType};base64,${Buffer.from(response.data).toString('base64')}`,
        filename,
        mimeType: contentType,
        sourceType: 'url'
      };
    }

    const resolvedPath = path.resolve(trimmed);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File lokal tidak ditemukan: ${resolvedPath}`);
    }

    const buffer = fs.readFileSync(resolvedPath);
    const filename = path.basename(resolvedPath);
    const mimeType = getMimeType(filename);

    return {
      base64: `data:${mimeType};base64,${buffer.toString('base64')}`,
      filename,
      mimeType,
      sourceType: 'file'
    };
  }

  throw new Error('Format source tidak valid. Harap berikan path file, URL gambar, atau Buffer.');
}

async function getSessionAndToken(timeout = 15000) {
  try {
    const response = await axios.get(BASE_URL, {
      headers: {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...DEFAULT_HEADERS
      },
      timeout
    });

    const cookies = response.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

    const $ = cheerio.load(response.data);
    const token = $('meta[name="_token"]').attr('content') || $('input[name="_token"]').val();

    if (!token) {
      throw new Error('Gagal mendapatkan token CSRF dari halaman ocr.ac');
    }

    return {
      token,
      cookieHeader
    };
  } catch (err) {
    throw new Error(`Gagal menginisialisasi sesi ocr.ac: ${err.message}`);
  }
}

async function ocrImage(source, options = {}) {
  const timeout = typeof options.timeout === 'number' ? options.timeout : 45000;

  const imageMeta = await resolveImageSource(source, timeout);
  const session = await getSessionAndToken(timeout);

  const form = new FormData();
  form.append('name', imageMeta.filename);
  form.append('file', imageMeta.base64);
  form.append('_token', session.token);
  form.append('tool', 'imagetotext');

  let response;
  try {
    response = await axios.post(ACTION_URL, form, {
      headers: {
        ...form.getHeaders(),
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        'Origin': BASE_ORIGIN,
        'Referer': BASE_URL,
        'Cookie': session.cookieHeader,
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout
    });
  } catch (err) {
    const serverData = err.response ? err.response.data : null;
    let errMsg = err.message;
    if (serverData) {
      if (typeof serverData === 'string') {
        errMsg = serverData;
      } else if (serverData.message) {
        errMsg = serverData.message;
      }
    }
    throw new Error(`Gagal memproses OCR pada server ocr.ac: ${errMsg}`);
  }

  const rawResult = response.data;
  if (!rawResult || rawResult === 'insufficient_credits') {
    throw new Error('Server ocr.ac mengembalikan respon kosong atau limit kredit tercapai.');
  }

  let textResult = '';
  if (typeof rawResult === 'object') {
    if (rawResult.type === 'error' || rawResult.message) {
      throw new Error(rawResult.message || 'Terjadi kesalahan pada ekstraksi OCR');
    }
    textResult = JSON.stringify(rawResult);
  } else {
    try {
      const parsed = JSON.parse(rawResult);
      if (parsed && (parsed.type === 'error' || parsed.error || parsed.message)) {
        throw new Error(parsed.message || parsed.error || 'Terjadi kesalahan pada ekstraksi OCR');
      }
    } catch (_) {}
    textResult = String(rawResult).trim();
  }

  return {
    status: true,
    result: textResult,
    total_characters: textResult.length,
    total_words: textResult ? textResult.split(/\s+/).filter(Boolean).length : 0,
    source: imageMeta.sourceType === 'file' ? imageMeta.filename : (imageMeta.sourceType === 'url' ? source : 'buffer')
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const targetSource = args[0] || 'https://tesseract.projectnaptha.com/img/eng_bw.png';

  console.log(`[INFO] Memproses OCR untuk: ${targetSource}`);

  ocrImage(targetSource)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      console.log('\nTEST RESULT: TRUE');
    })
    .catch((error) => {
      console.error(JSON.stringify({ status: false, error: error.message }, null, 2));
      console.log('\nTEST RESULT: FALSE');
      process.exit(1);
    });
}

module.exports = ocrImage;
ocrImage.ocrImage = ocrImage;
