/**
 * Judul : Photiu AI Background Remover
 * Base Url : https://www.photiu.ai
 * Author : Vellzyy
 * Deskripsi : Scraper background remover menggunakan endpoint internal Photiu AI untuk menghapus latar belakang gambar dan mengunggah hasilnya langsung ke CDN sebagai URL gambar.
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.photiu.ai';
const CDN_UPLOAD_URL = 'https://cdn.zass.in/upload';
const ENDPOINTS = {
  RMBG: 'https://www.photiu.ai/api/tools/img_rmbg',
  CUTOUT: 'https://www.photiu.ai/api/cutout'
};

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Referer': 'https://www.photiu.ai/id/background-remover',
  'Origin': 'https://www.photiu.ai'
};

function getMimeTypeByExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
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
    default:
      return 'image/jpeg';
  }
}

function getExtensionByMimeType(mimeType) {
  switch (mimeType) {
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/jpeg':
    case 'image/jpg':
    default:
      return '.jpg';
  }
}

function extractServerError(response) {
  if (!response) return null;
  const rawParams = response.headers ? response.headers['x-paramsjs'] : null;
  if (rawParams) {
    try {
      const parsed = JSON.parse(rawParams);
      if (parsed.msg) return parsed.msg;
      if (parsed.error_msg) return parsed.error_msg;
    } catch (e) {}
  }
  if (response.data) {
    try {
      const parsed = JSON.parse(Buffer.from(response.data).toString('utf8'));
      if (parsed.msg) return parsed.msg;
      if (parsed.message) return parsed.message;
    } catch (e) {
      const text = Buffer.from(response.data).toString('utf8').trim();
      if (text) return text;
    }
  }
  return null;
}

async function uploadToCdn(buffer, filename = 'nobg.png', timeout = 30000) {
  try {
    const form = new FormData();
    form.append('file', buffer, {
      filename,
      contentType: 'image/png'
    });

    const response = await axios.post(CDN_UPLOAD_URL, form.getBuffer(), {
      headers: {
        ...form.getHeaders(),
        'User-Agent': DEFAULT_HEADERS['User-Agent']
      },
      timeout
    });

    if (response.data && response.data.url) {
      return response.data.url;
    }
    throw new Error('Response CDN tidak berisi URL');
  } catch (err) {
    throw new Error(`Gagal mengupload gambar hasil ke CDN zass.in: ${err.message}`);
  }
}

async function resolveImageSource(source, timeout = 30000) {
  if (!source) {
    throw new Error('Parameter source gambar tidak boleh kosong');
  }

  if (Buffer.isBuffer(source)) {
    return {
      buffer: source,
      filename: 'input.png',
      mimeType: 'image/png',
      sourceType: 'buffer'
    };
  }

  if (typeof source === 'string') {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      const response = await axios.get(source, {
        responseType: 'arraybuffer',
        timeout,
        headers: {
          'User-Agent': DEFAULT_HEADERS['User-Agent']
        }
      });

      let mimeType = 'image/jpeg';
      const headerContentType = response.headers['content-type'];
      if (headerContentType) {
        mimeType = headerContentType.split(';')[0].trim().toLowerCase();
      }

      let filename = 'input_image' + getExtensionByMimeType(mimeType);
      try {
        const urlParsed = new URL(source);
        const base = path.basename(urlParsed.pathname);
        if (base && base.includes('.')) {
          filename = base;
        }
      } catch (err) {}

      return {
        buffer: Buffer.from(response.data),
        filename,
        mimeType,
        sourceType: 'url'
      };
    }

    const resolvedPath = path.resolve(source);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File lokal tidak ditemukan: ${resolvedPath}`);
    }

    const buffer = fs.readFileSync(resolvedPath);
    const filename = path.basename(resolvedPath);
    const mimeType = getMimeTypeByExtension(filename);

    return {
      buffer,
      filename,
      mimeType,
      sourceType: 'file'
    };
  }

  throw new Error('Tipe source tidak didukung. Harap berikan URL gambar, file path, atau Buffer.');
}

async function removeBackground(source, options = {}) {
  const timeout = typeof options.timeout === 'number' ? options.timeout : 60000;
  const imageMeta = await resolveImageSource(source, timeout);

  const pricingParam = JSON.stringify({ model: 'basic' });
  const rmbgForm = new FormData();
  rmbgForm.append('upfile', imageMeta.buffer, {
    filename: imageMeta.filename,
    contentType: imageMeta.mimeType
  });

  const rmbgHeaders = {
    ...rmbgForm.getHeaders(),
    ...DEFAULT_HEADERS,
    'x-fnt': '0',
    'X-Paramsjs': pricingParam,
    'X-PriceParams': pricingParam
  };

  let rmbgResponse;
  try {
    rmbgResponse = await axios.post(ENDPOINTS.RMBG, rmbgForm.getBuffer(), {
      headers: rmbgHeaders,
      responseType: 'arraybuffer',
      timeout
    });
  } catch (err) {
    const serverMsg = extractServerError(err.response);
    const reason = serverMsg || (err.response ? `HTTP ${err.response.status}` : err.message);
    throw new Error(`Gagal memproses gambar pada tahap analisis mask: ${reason}`);
  }

  const fntToken = rmbgResponse.headers['x-photiu-fnt'];
  if (!fntToken) {
    throw new Error('Gagal mendapatkan token sesi pengolahan background (x-photiu-fnt tidak ditemukan)');
  }

  const maskBuffer = Buffer.from(rmbgResponse.data);
  if (maskBuffer.length === 0) {
    throw new Error('Hasil mask dari server kosong');
  }

  const cutoutForm = new FormData();
  cutoutForm.append('params', '{}');
  cutoutForm.append('maskfile', maskBuffer, {
    filename: 'mask.png',
    contentType: 'image/png'
  });

  const cutoutHeaders = {
    ...cutoutForm.getHeaders(),
    ...DEFAULT_HEADERS,
    'x-fnt': fntToken
  };

  let cutoutResponse;
  try {
    cutoutResponse = await axios.post(ENDPOINTS.CUTOUT, cutoutForm.getBuffer(), {
      headers: cutoutHeaders,
      responseType: 'arraybuffer',
      timeout
    });
  } catch (err) {
    const serverMsg = extractServerError(err.response);
    const reason = serverMsg || (err.response ? `HTTP ${err.response.status}` : err.message);
    throw new Error(`Gagal mengekstrak cutout transparan: ${reason}`);
  }

  const resultPngBuffer = Buffer.from(cutoutResponse.data);
  const isPngHeader = resultPngBuffer.length >= 8 &&
    resultPngBuffer[0] === 0x89 &&
    resultPngBuffer[1] === 0x50 &&
    resultPngBuffer[2] === 0x4E &&
    resultPngBuffer[3] === 0x47;

  if (!isPngHeader) {
    throw new Error('Hasil akhir dari server bukan merupakan format gambar PNG yang valid');
  }

  let savedFilePath = null;
  if (options.output) {
    const outputPath = path.resolve(options.output);
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, resultPngBuffer);
    savedFilePath = outputPath;
  }

  const cdnFilename = 'nobg_' + Date.now() + '.png';
  const cdnUrl = await uploadToCdn(resultPngBuffer, cdnFilename, timeout);

  const responseData = {
    url: cdnUrl,
    filename: imageMeta.filename,
    format: 'png',
    mime_type: 'image/png',
    size_bytes: resultPngBuffer.length
  };

  if (savedFilePath) {
    responseData.saved_path = savedFilePath;
  }

  return {
    status: true,
    data: responseData
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const targetSource = args[0] || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png';
  const outputPath = args[1] || null;

  console.log(`[INFO] Memproses background removal untuk: ${targetSource}`);

  removeBackground(targetSource, { output: outputPath })
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

module.exports = removeBackground;
