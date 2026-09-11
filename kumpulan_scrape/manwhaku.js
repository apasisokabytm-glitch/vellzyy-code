/**
 * Judul : Manwhaku Manga & Manhwa Scraper
 * Base Url : https://manwhaku.my.id
 * Author : Vellzyy
 * Deskripsi : Scraper untuk mengambil daftar komik home, pencarian komik, dan detail komik beserta link baca chapter dari MANWHAKU.
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://manwhaku.my.id';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Sec-Ch-Ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1'
};

function extractMangaFromRaw(rawHtml) {
  const list = [];
  const seen = new Set();
  const regex = /\\?"title\\?":\\?"([^"\\\n]+)\\?",\\?"slug\\?":\\?"([^"\\\n]+)\\?"/g;
  let match;

  while ((match = regex.exec(rawHtml)) !== null) {
    const slug = match[2];
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    const snippet = rawHtml.slice(match.index, match.index + 800);
    const chapterMatch = snippet.match(/\\?"chapter\\?":\\?"([^"\\\n]*)\\?"/);
    const thumbMatch = snippet.match(/\\?"thumb\\?":\\?"([^"\\\n]*)\\?"/);
    const typeMatch = snippet.match(/\\?"type\\?":\\?"([^"\\\n]*)\\?"/);
    const ratingMatch = snippet.match(/\\?"rating\\?":\\?"([^"\\\n]*)\\?"/);
    const sourceMatch = snippet.match(/\\?"source\\?":\\?"([^"\\\n]*)\\?"/);

    list.push({
      title: match[1],
      slug,
      url: `${BASE_URL}/manga/${slug}`,
      poster: thumbMatch && thumbMatch[1] ? thumbMatch[1].replace(/\\/g, '') : null,
      latest_chapter: chapterMatch && chapterMatch[1] ? chapterMatch[1] : null,
      type: typeMatch && typeMatch[1] ? typeMatch[1] : null,
      rating: ratingMatch && ratingMatch[1] ? ratingMatch[1] : null,
      source: sourceMatch && sourceMatch[1] ? sourceMatch[1] : null
    });
  }

  return list;
}

async function getHome(options = {}) {
  const timeout = options.timeout || 15000;
  try {
    const response = await axios.get(BASE_URL, {
      headers: BROWSER_HEADERS,
      timeout
    });

    const html = response.data;
    const idxFeat = html.lastIndexOf('Pilihan Redaksi');
    const idxPop = html.lastIndexOf('Populer Hari Ini');
    const idxUpdate = html.lastIndexOf('Update Terbaru');

    let featured = [];
    let popular = [];
    let latest = [];

    if (idxFeat !== -1 && idxPop !== -1 && idxUpdate !== -1) {
      featured = extractMangaFromRaw(html.slice(idxFeat, idxPop));
      popular = extractMangaFromRaw(html.slice(idxPop, idxUpdate));
      latest = extractMangaFromRaw(html.slice(idxUpdate));
    } else {
      latest = extractMangaFromRaw(html);
    }

    const totalCount = featured.length + popular.length + latest.length;

    return {
      status: true,
      total: totalCount,
      data: {
        featured,
        popular,
        latest_updates: latest
      }
    };
  } catch (err) {
    throw new Error(`Gagal mengambil data home: ${err.message}`);
  }
}

async function searchManga(query, options = {}) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Kata kunci pencarian tidak boleh kosong');
  }

  const timeout = options.timeout || 15000;
  const searchUrl = `${BASE_URL}/manga?q=${encodeURIComponent(query.trim())}`;

  try {
    const response = await axios.get(searchUrl, {
      headers: BROWSER_HEADERS,
      timeout
    });

    const results = extractMangaFromRaw(response.data);

    return {
      status: true,
      query: query.trim(),
      total: results.length,
      data: results
    };
  } catch (err) {
    throw new Error(`Gagal mencari komik: ${err.message}`);
  }
}

async function getDetail(targetUrl, options = {}) {
  if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.trim()) {
    throw new Error('URL atau slug manga tidak boleh kosong');
  }

  let slug = targetUrl.trim();
  if (slug.startsWith('http://') || slug.startsWith('https://')) {
    try {
      const parsed = new URL(slug);
      const parts = parsed.pathname.split('/').filter(Boolean);
      slug = parts[parts.length - 1];
    } catch (e) {
      slug = targetUrl.trim();
    }
  } else if (slug.startsWith('/manga/')) {
    slug = slug.replace('/manga/', '');
  }

  const detailUrl = `${BASE_URL}/manga/${slug}`;
  const timeout = options.timeout || 15000;

  try {
    const response = await axios.get(detailUrl, {
      headers: BROWSER_HEADERS,
      timeout
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const title = $('h1').first().text().trim() ||
      $('title').text().replace(/\|.*/, '').replace('Baca', '').replace('Bahasa Indonesia', '').trim();

    let poster = null;
    const imgEl = $('img[alt="' + title + '"]').first();
    if (imgEl.length) {
      const srcset = imgEl.attr('srcset');
      if (srcset) {
        const match = srcset.match(/url=(https%3A%2F%2F[^&]+)/);
        if (match) {
          poster = decodeURIComponent(match[1]);
        }
      }
      if (!poster) {
        poster = imgEl.attr('src');
      }
    }
    if (!poster) {
      const rscThumb = html.match(/\\?"thumb\\?":\\?"(https:[^"\\\n]+)\\?"/);
      if (rscThumb) {
        poster = rscThumb[1].replace(/\\/g, '');
      }
    }

    let type = null;
    let status = null;
    let rating = null;
    let totalChapters = null;
    const genres = [];

    $('span').each((i, el) => {
      const text = $(el).text().trim();
      if (['Manhwa', 'Manga', 'Manhua'].includes(text)) {
        type = text;
      } else if (['Ongoing', 'Completed'].includes(text)) {
        status = text;
      } else if (/^\d+\.\d+$/.test(text)) {
        if (!rating) rating = text;
      } else if (text.includes('Total Chapter')) {
        const numMatch = text.match(/\d+/);
        if (numMatch) totalChapters = parseInt(numMatch[0], 10);
      }
    });

    const genreCandidates = [
      'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
      'Martial Arts', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life',
      'Sports', 'Supernatural', 'Thriller', 'Seinen', 'Shounen', 'Shoujo',
      'Josei', 'Isekai', 'Reincarnation', 'School Life', 'Mafia',
      'Delinquent', 'Fight', 'Historical', 'Ecchi', 'Harem', 'Psychological'
    ];

    $('span').each((i, el) => {
      const text = $(el).text().trim();
      if (genreCandidates.includes(text) && !genres.includes(text)) {
        genres.push(text);
      }
    });

    let synopsis = null;
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 50 && !text.includes('©') && !text.includes('MANWHAKU') && !synopsis) {
        synopsis = text;
      }
    });

    const chapters = [];
    const chRegex = /\\?"slug\\?":\\?"([^"\\\n]+chapter-[^"\\\n]+)\\?",\\?"title\\?":\\?"([^"\\\n]+)\\?",\\?"chapterNumber\\?":\\?"([^"\\\n]+)\\?"/g;
    let chMatch;
    const seenChapters = new Set();

    while ((chMatch = chRegex.exec(html)) !== null) {
      const chSlug = chMatch[1];
      if (seenChapters.has(chSlug)) continue;
      seenChapters.add(chSlug);

      chapters.push({
        title: chMatch[2],
        chapter_number: chMatch[3],
        slug: chSlug,
        read_url: `${BASE_URL}/read/${chSlug}`
      });
    }

    if (!totalChapters && chapters.length > 0) {
      totalChapters = chapters.length;
    }

    return {
      status: true,
      data: {
        title,
        slug,
        url: detailUrl,
        poster,
        type,
        status,
        rating,
        total_chapters: totalChapters,
        genres,
        synopsis,
        chapters
      }
    };
  } catch (err) {
    throw new Error(`Gagal mengambil detail komik: ${err.message}`);
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`Penggunaan MANWHAKU Scraper:
  node kumpulan_scrape/manwhaku.js --home
  node kumpulan_scrape/manwhaku.js --search <query>
  node kumpulan_scrape/manwhaku.js --detail <url_or_slug>
`);
    process.exit(0);
  }

  if (command === '--home') {
    getHome()
      .then((res) => {
        console.log(JSON.stringify(res, null, 2));
        console.log('\nTEST RESULT: TRUE');
      })
      .catch((err) => {
        console.error(JSON.stringify({ status: false, error: err.message }, null, 2));
        console.log('\nTEST RESULT: FALSE');
        process.exit(1);
      });
  } else if (command === '--search') {
    const query = args.slice(1).join(' ') || 'solo';
    searchManga(query)
      .then((res) => {
        console.log(JSON.stringify(res, null, 2));
        console.log('\nTEST RESULT: TRUE');
      })
      .catch((err) => {
        console.error(JSON.stringify({ status: false, error: err.message }, null, 2));
        console.log('\nTEST RESULT: FALSE');
        process.exit(1);
      });
  } else if (command === '--detail') {
    const targetUrl = args[1] || 'baek-xx';
    getDetail(targetUrl)
      .then((res) => {
        console.log(JSON.stringify(res, null, 2));
        console.log('\nTEST RESULT: TRUE');
      })
      .catch((err) => {
        console.error(JSON.stringify({ status: false, error: err.message }, null, 2));
        console.log('\nTEST RESULT: FALSE');
        process.exit(1);
      });
  } else {
    console.error(`Command tidak dikenal: ${command}`);
    console.log('TEST RESULT: FALSE');
    process.exit(1);
  }
}

module.exports = {
  getHome,
  searchManga,
  getDetail
};
