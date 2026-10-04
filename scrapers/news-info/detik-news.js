/**
 * Judul : Detikcom Latest News Scraper
 * Base Url : https://detik.com
 * Author : Vellzyy
 * Deskripsi : Scraper untuk mengambil daftar berita terbaru hari ini dari detik.com secara realtime.
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://news.detik.com/indeks';

const KANAL_URLS = {
  news: 'https://news.detik.com/indeks',
  finance: 'https://finance.detik.com/indeks',
  sport: 'https://sport.detik.com/indeks',
  hot: 'https://hot.detik.com/indeks'
};

function cleanText(text) {
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : null;
}

function extractImage($element) {
  let image = $element.find('.media__image img').attr('src') ||
              $element.find('img').attr('src') ||
              $element.find('img').attr('data-src') ||
              $element.attr('i-img') ||
              null;

  const imgQs = $element.attr('i-img-qs');
  if (image && imgQs && !image.includes('?')) {
    image += imgQs;
  }

  return image;
}

function extractCategory(url, fallbackTag) {
  if (fallbackTag) {
    return cleanText(fallbackTag);
  }

  try {
    const parsedUrl = new URL(url);
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    if (segments.length > 0 && !segments[0].startsWith('d-')) {
      return segments[0];
    }
  } catch (err) {
    return 'news';
  }

  return 'news';
}

async function scrapeDetikNews(options = {}) {
  let targetUrl = BASE_URL;
  let page = 1;

  if (typeof options === 'string') {
    targetUrl = options;
  } else if (typeof options === 'object' && options !== null) {
    if (options.url) {
      targetUrl = options.url;
    } else {
      const kanal = (options.category || 'news').toLowerCase();
      targetUrl = KANAL_URLS[kanal] || BASE_URL;
    }

    if (options.page && Number.isInteger(Number(options.page))) {
      page = Math.max(1, parseInt(options.page, 10));
    }
  }

  const queryParams = {};
  if (page > 1) {
    queryParams.page = page;
  }

  if (options.date && typeof options.date === 'string') {
    queryParams.date = options.date;
  }

  try {
    const response = await axios.get(targetUrl, {
      params: queryParams,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Detikcom mengembalikan status HTTP ${response.status}`);
    }

    const $ = cheerio.load(response.data);
    const rawArticles = [];

    $('article').each((_, element) => {
      const $el = $(element);
      const rawLink = $el.find('.media__title a, .media__link, a.media__title').attr('href');

      if (!rawLink || rawLink.includes('/tag/') || rawLink.includes('/search/')) {
        return;
      }

      const fullUrl = new URL(rawLink, targetUrl).href;
      const title = cleanText($el.find('.media__title').text() || $el.find('h2, h3').text());

      if (!title) {
        return;
      }

      const dateContainer = $el.find('.media__date');
      const dateSpan = dateContainer.find('span');
      const timeAgo = cleanText(dateSpan.text()) || cleanText(dateContainer.text());
      const publishedAt = cleanText(dateSpan.attr('title')) || null;
      const dTime = dateSpan.attr('d-time');
      const timestamp = dTime ? parseInt(dTime, 10) : null;

      const tagText = $el.find('.media__tag, .tag').text();
      const category = extractCategory(fullUrl, tagText);
      const image = extractImage($el);

      rawArticles.push({
        title,
        category,
        time_ago: timeAgo,
        published_at: publishedAt,
        timestamp,
        url: fullUrl,
        image
      });
    });

    const uniqueArticles = [
      ...new Map(rawArticles.map((item) => [item.url, item])).values()
    ];

    if (uniqueArticles.length === 0) {
      throw new Error('Tidak ada artikel yang berhasil diambil dari halaman target');
    }

    return {
      status: true,
      source: targetUrl,
      page,
      total: uniqueArticles.length,
      data: uniqueArticles
    };
  } catch (error) {
    throw new Error(`Gagal mengambil data detik.com: ${error.message}`);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const inputArg = args[0];
  const pageArg = inputArg ? parseInt(inputArg, 10) || 1 : 1;

  scrapeDetikNews({ page: pageArg })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(JSON.stringify({ status: false, message: error.message }, null, 2));
      process.exit(1);
    });
}

module.exports = scrapeDetikNews;
