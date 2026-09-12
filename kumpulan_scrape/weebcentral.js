/**
 * Judul : WeebCentral Manga Scraper
 * Base Url : https://weebcentral.com
 * Author : Vellzyy
 * Deskripsi : Scraper untuk mengambil data home, detail manga & chapter, serta pencarian manga dari WeebCentral.
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://weebcentral.com';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,id;q=0.8'
};

async function getHome(options = {}) {
  const timeout = typeof options.timeout === 'number' ? options.timeout : 25000;

  try {
    const res = await axios.get(BASE_URL, {
      headers: DEFAULT_HEADERS,
      timeout
    });

    const $ = cheerio.load(res.data);

    // 1. Hot Updates
    const hotUpdates = [];
    const hotSec = $('h2:contains("Hot Updates")').closest('section');
    hotSec.find('a[href*="/series/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const fullUrl = new URL(href, BASE_URL).href;
      const img = $(el).find('img');
      const title = img.attr('alt') ? img.attr('alt').replace(/ cover$/i, '').trim() : '';
      const cover = $(el).find('source').first().attr('srcset') || img.attr('src') || null;

      if (title && !hotUpdates.some(item => item.url === fullUrl)) {
        hotUpdates.push({
          title,
          url: fullUrl,
          cover
        });
      }
    });

    // 2. Latest Updates
    const latestUpdates = [];
    const latestSec = $('h2:contains("Latest Updates")').closest('section');
    latestSec.find('a[href*="/series/"]').each((_, el) => {
      const seriesLink = $(el);
      const row = seriesLink.parent();
      const chapterLink = row.find('a[href*="/chapters/"]').first();

      const href = seriesLink.attr('href');
      if (!href) return;
      const fullUrl = new URL(href, BASE_URL).href;

      const title = chapterLink.find('.truncate').text().trim() ||
        seriesLink.find('img').attr('alt')?.replace(/ cover$/i, '').trim() || '';
      const cover = seriesLink.find('source').first().attr('srcset') || seriesLink.find('img').attr('src') || null;

      let chapter = null;
      let chapterUrl = null;
      let updatedAt = null;

      if (chapterLink.length) {
        chapter = chapterLink.find('span:contains("Chapter")').first().text().trim() ||
          chapterLink.find('.opacity-70 span').text().trim() || null;
        const chHref = chapterLink.attr('href');
        if (chHref) chapterUrl = new URL(chHref, BASE_URL).href;
        updatedAt = chapterLink.find('time').attr('datetime') || chapterLink.find('time').text().trim() || null;
      }

      const status = row.find('img[src*="icon-ongoing"]').length
        ? 'Ongoing'
        : (row.find('img[src*="icon-complete"]').length ? 'Complete' : null);

      if (title && !latestUpdates.some(item => item.url === fullUrl)) {
        latestUpdates.push({
          title,
          url: fullUrl,
          cover,
          latest_chapter: chapter,
          latest_chapter_url: chapterUrl,
          status,
          updated_at: updatedAt
        });
      }
    });

    // 3. Recently Added
    const recentlyAdded = [];
    const recAddedSec = $('h2:contains("Recently Added")').closest('section');
    recAddedSec.find('a[href*="/series/"]').each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr('href');
      if (!href || !title) return;
      const url = new URL(href, BASE_URL).href;

      if (!recentlyAdded.some(item => item.url === url)) {
        recentlyAdded.push({
          title,
          url
        });
      }
    });

    // 4. Recommendations
    const recommendations = [];
    const recSec = $('h2:contains("Recommendations")').closest('section');
    recSec.find('a[href*="/series/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      const fullUrl = new URL(href, BASE_URL).href;
      const title = $(el).find('.truncate').text().trim() ||
        $(el).find('img').attr('alt')?.replace(/ cover$/i, '').trim() || '';
      const cover = $(el).find('source').first().attr('srcset') || $(el).find('img').attr('src') || null;

      if (title && !recommendations.some(item => item.url === fullUrl)) {
        recommendations.push({
          title,
          url: fullUrl,
          cover
        });
      }
    });

    return {
      status: true,
      data: {
        hot_updates: hotUpdates,
        latest_updates: latestUpdates,
        recently_added: recentlyAdded,
        recommendations: recommendations
      }
    };
  } catch (err) {
    throw new Error(`Gagal mengambil data home WeebCentral: ${err.message}`);
  }
}

async function searchManga(query, options = {}) {
  if (!query || !query.trim()) {
    throw new Error('Query pencarian manga tidak boleh kosong.');
  }

  const timeout = typeof options.timeout === 'number' ? options.timeout : 25000;
  const searchUrl = `${BASE_URL}/search/data?text=${encodeURIComponent(query.trim())}`;

  try {
    const res = await axios.get(searchUrl, {
      headers: {
        ...DEFAULT_HEADERS,
        'HX-Request': 'true'
      },
      timeout
    });

    const $ = cheerio.load(res.data);
    const results = [];

    $('article.bg-base-300').each((_, el) => {
      const titleEl = $(el).find('a.link.link-hover').first();
      const title = titleEl.text().trim();
      const seriesUrl = titleEl.attr('href') || $(el).find('a[href*="/series/"]').first().attr('href');
      if (!seriesUrl || !title) return;

      const fullUrl = new URL(seriesUrl, BASE_URL).href;
      const cover = $(el).find('picture source').first().attr('srcset') ||
        $(el).find('picture img').attr('src') || null;

      let year = null;
      let status = null;
      let type = null;
      const authors = [];
      const tags = [];

      $(el).find('.opacity-70, div').each((_, div) => {
        const strong = $(div).find('strong').text().trim();
        const txt = $(div).text().replace(strong, '').trim();

        if (strong.startsWith('Year')) {
          year = $(div).find('span').text().trim() || txt;
        } else if (strong.startsWith('Status')) {
          status = $(div).find('span').text().trim() || txt;
        } else if (strong.startsWith('Type')) {
          type = $(div).find('span').text().trim() || txt;
        } else if (strong.startsWith('Author')) {
          $(div).find('a').each((_, a) => {
            const authorName = $(a).text().trim();
            if (authorName) authors.push(authorName);
          });
        } else if (strong.startsWith('Tag')) {
          const rawTags = txt.split(',').map(t => t.trim()).filter(Boolean);
          tags.push(...rawTags);
        }
      });

      const isOfficial = $(el).find('[data-tip*="Official"]').length > 0;
      const hasAnime = $(el).find('[data-tip*="Anime"]').length > 0;

      results.push({
        title,
        url: fullUrl,
        cover,
        type,
        status,
        year,
        authors: [...new Set(authors)],
        tags: [...new Set(tags)],
        is_official: isOfficial,
        has_anime: hasAnime
      });
    });

    return {
      status: true,
      query: query.trim(),
      total_results: results.length,
      data: results
    };
  } catch (err) {
    throw new Error(`Gagal melakukan pencarian manga untuk "${query}": ${err.message}`);
  }
}

async function getSeriesDetail(url, options = {}) {
  const timeout = typeof options.timeout === 'number' ? options.timeout : 30000;
  const cleanUrl = url.startsWith('http') ? url : `${BASE_URL}/series/${url}`;

  try {
    const res = await axios.get(cleanUrl, {
      headers: DEFAULT_HEADERS,
      timeout
    });

    const $ = cheerio.load(res.data);
    const title = $('h1').first().text().trim();
    const mainSec = $('section.flex.flex-col.md\\:flex-row');
    const cover = mainSec.find('picture source').first().attr('srcset') ||
      mainSec.find('picture img').attr('src') || null;

    let synopsis = '';
    let type = null;
    let status = null;
    let released = null;
    let officialTranslation = false;
    let animeAdaptation = false;
    let adultContent = false;
    let altNames = [];
    const authors = [];
    const tags = [];
    const relatedSeries = [];

    mainSec.find('strong').each((_, st) => {
      const label = $(st).text().trim().toLowerCase();
      const parent = $(st).parent();
      const valText = parent.text().replace($(st).text(), '').trim().replace(/\s+/g, ' ');

      if (label.includes('author')) {
        parent.find('a').each((_, a) => {
          const name = $(a).text().trim();
          if (name) authors.push(name);
        });
      } else if (label.includes('tag')) {
        parent.find('a').each((_, a) => {
          const t = $(a).text().trim();
          if (t) tags.push(t);
        });
        if (!tags.length && valText) {
          tags.push(...valText.split(',').map(s => s.trim()).filter(Boolean));
        }
      } else if (label.includes('type')) {
        type = parent.find('a').text().trim() || valText;
      } else if (label.includes('status')) {
        status = parent.find('a').text().trim() || valText;
      } else if (label.includes('released')) {
        released = parent.find('a').text().trim() || valText;
      } else if (label.includes('official translation')) {
        officialTranslation = valText.toLowerCase().includes('yes');
      } else if (label.includes('anime adaptation')) {
        animeAdaptation = valText.toLowerCase().includes('yes');
      } else if (label.includes('adult content')) {
        adultContent = valText.toLowerCase().includes('yes');
      } else if (label.includes('description')) {
        synopsis = valText;
      } else if (label.includes('associated name')) {
        altNames = valText.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      } else if (label.includes('related series')) {
        parent.find('a').each((_, a) => {
          const rTitle = $(a).text().trim();
          const rUrl = new URL($(a).attr('href'), BASE_URL).href;
          if (rTitle) relatedSeries.push({ title: rTitle, url: rUrl });
        });
      }
    });

    if (!synopsis) {
      synopsis = mainSec.find('p').first().text().trim();
    }

    // Extract series ID to fetch full chapter list
    const seriesIdMatch = cleanUrl.match(/\/series\/([^\/?#]+)/);
    const seriesId = seriesIdMatch ? seriesIdMatch[1] : null;
    const chapters = [];

    if (seriesId) {
      try {
        const chListRes = await axios.get(`${BASE_URL}/series/${seriesId}/full-chapter-list`, {
          headers: {
            ...DEFAULT_HEADERS,
            'HX-Request': 'true'
          },
          timeout
        });

        const $ch = cheerio.load(chListRes.data);
        $ch('a[href*="/chapters/"]').each((_, chEl) => {
          const chHref = $ch(chEl).attr('href');
          if (!chHref) return;
          const chUrl = new URL(chHref, BASE_URL).href;
          const chName = $ch(chEl).find('span.grow > span').first().text().trim() ||
            $ch(chEl).text().trim().replace(/\s+/g, ' ');
          const chDate = $ch(chEl).find('time').attr('datetime') || $ch(chEl).find('time').text().trim() || null;
          const isOfficial = $ch(chEl).find('img[src*="official"]').length > 0;

          chapters.push({
            chapter: chName,
            url: chUrl,
            date: chDate,
            is_official: isOfficial
          });
        });
      } catch (err) {
        // Fallback to chapters embedded in main page if full-chapter-list fails
        $('a[href*="/chapters/"]').each((_, chEl) => {
          const chHref = $(chEl).attr('href');
          if (!chHref) return;
          const chUrl = new URL(chHref, BASE_URL).href;
          const chName = $(chEl).find('span.grow > span').first().text().trim() ||
            $(chEl).text().trim().replace(/\s+/g, ' ');
          const chDate = $(chEl).find('time').attr('datetime') || $(chEl).find('time').text().trim() || null;
          const isOfficial = $(chEl).find('img[src*="official"]').length > 0;

          if (!chapters.some(item => item.url === chUrl)) {
            chapters.push({
              chapter: chName,
              url: chUrl,
              date: chDate,
              is_official: isOfficial
            });
          }
        });
      }
    }

    const firstChapter = chapters.length ? chapters[chapters.length - 1] : null;
    const latestChapter = chapters.length ? chapters[0] : null;

    return {
      status: true,
      data: {
        title,
        url: cleanUrl,
        cover,
        synopsis,
        alt_names: altNames,
        authors: [...new Set(authors)],
        tags: [...new Set(tags)],
        type,
        status,
        released,
        official_translation: officialTranslation,
        anime_adaptation: animeAdaptation,
        adult_content: adultContent,
        related_series: relatedSeries,
        total_chapters: chapters.length,
        read_first_url: firstChapter ? firstChapter.url : null,
        read_latest_url: latestChapter ? latestChapter.url : null,
        first_chapter: firstChapter,
        latest_chapter: latestChapter,
        chapters
      }
    };
  } catch (err) {
    throw new Error(`Gagal mengambil detail manga dari "${url}": ${err.message}`);
  }
}

async function getChapterDetail(url, options = {}) {
  const timeout = typeof options.timeout === 'number' ? options.timeout : 30000;
  const cleanUrl = url.startsWith('http') ? url : `${BASE_URL}/chapters/${url}`;
  const chapterIdMatch = cleanUrl.match(/\/chapters\/([^\/?#]+)/);
  const chapterId = chapterIdMatch ? chapterIdMatch[1] : null;

  try {
    const [pageRes, imgRes] = await Promise.all([
      axios.get(cleanUrl, {
        headers: DEFAULT_HEADERS,
        timeout
      }),
      chapterId ? axios.get(`${BASE_URL}/chapters/${chapterId}/images`, {
        headers: DEFAULT_HEADERS,
        timeout
      }) : Promise.resolve({ data: '' })
    ]);

    const $ = cheerio.load(pageRes.data);
    const title = $('title').text().trim();
    const seriesLink = $('a[href*="/series/"]').filter((_, el) => !$(el).attr('href').includes('/series/random')).first();
    const seriesUrl = seriesLink.length ? new URL(seriesLink.attr('href'), BASE_URL).href : null;
    const seriesTitle = seriesLink.text().trim() || null;

    let prevChapterUrl = null;
    let nextChapterUrl = null;

    const prevMatch = pageRes.data.match(/is_first_chapter\s*\)[\s\S]*?window\.location\.href\s*=\s*"([^"]+)"/) ||
      pageRes.data.match(/previousPage\(\)[\s\S]*?window\.location\.href\s*=\s*"([^"]+)"/);
    const nextMatch = pageRes.data.match(/nextPage\(\)[\s\S]*?window\.location\.href\s*=\s*"([^"]+)"/);

    if (prevMatch && prevMatch[1] && !prevMatch[1].includes('/chapters/None')) {
      prevChapterUrl = prevMatch[1];
    }
    if (nextMatch && nextMatch[1] && !nextMatch[1].includes('/chapters/None')) {
      nextChapterUrl = nextMatch[1];
    }

    const $img = cheerio.load(imgRes.data);
    const pages = [];
    $img('img').each((_, img) => {
      const src = $img(img).attr('src');
      if (src && !src.includes('broken_image') && !src.includes('/static/images')) {
        pages.push(src);
      }
    });

    return {
      status: true,
      data: {
        type: 'chapter_reader',
        title,
        series_title: seriesTitle,
        series_url: seriesUrl,
        chapter_url: cleanUrl,
        total_pages: pages.length,
        pages,
        prev_chapter_url: prevChapterUrl ? new URL(prevChapterUrl, BASE_URL).href : null,
        next_chapter_url: nextChapterUrl ? new URL(nextChapterUrl, BASE_URL).href : null
      }
    };
  } catch (err) {
    throw new Error(`Gagal mengambil detail chapter dari "${url}": ${err.message}`);
  }
}

async function getDetail(url, options = {}) {
  if (!url || !url.trim()) {
    throw new Error('URL detail manga atau chapter tidak boleh kosong.');
  }

  const trimmed = url.trim();
  if (trimmed.includes('/chapters/')) {
    return await getChapterDetail(trimmed, options);
  }
  return await getSeriesDetail(trimmed, options);
}

if (require.main === module) {
  const args = process.argv.slice(2);

  let mode = '--home';
  let queryOrUrl = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--home') {
      mode = '--home';
    } else if (args[i] === '--search') {
      mode = '--search';
      queryOrUrl = args[i + 1] || '';
      i++;
    } else if (args[i] === '--detail') {
      mode = '--detail';
      queryOrUrl = args[i + 1] || '';
      i++;
    }
  }

  // If arguments passed without flags
  if (!args.includes('--home') && !args.includes('--search') && !args.includes('--detail')) {
    if (args[0]) {
      if (args[0].startsWith('http') || args[0].includes('/series/') || args[0].includes('/chapters/')) {
        mode = '--detail';
        queryOrUrl = args[0];
      } else {
        mode = '--search';
        queryOrUrl = args.join(' ');
      }
    }
  }

  (async () => {
    try {
      let result;
      if (mode === '--search') {
        const query = queryOrUrl || 'solo leveling';
        console.log(`[INFO] Menjalankan pencarian manga: "${query}"`);
        result = await searchManga(query);
      } else if (mode === '--detail') {
        const targetUrl = queryOrUrl || 'https://weebcentral.com/series/01J76XYCPSY3C4BNPBRY8JMCBE/Solo-Leveling';
        console.log(`[INFO] Mengambil detail manga: "${targetUrl}"`);
        result = await getDetail(targetUrl);
      } else {
        console.log('[INFO] Mengambil data home WeebCentral...');
        result = await getHome();
      }

      console.log(JSON.stringify(result, null, 2));
      console.log('\nTEST RESULT: TRUE');
    } catch (err) {
      console.error(JSON.stringify({ status: false, error: err.message }, null, 2));
      console.log('\nTEST RESULT: FALSE');
      process.exit(1);
    }
  })();
}

module.exports = {
  getHome,
  searchManga,
  getDetail,
  getSeriesDetail,
  getChapterDetail
};
