/**
 * Judul : TopDonghua Scraper
 * Base Url : https://topdonghua.com
 * Author : Vellzyy
 * Deskripsi : Scraper untuk mengambil data home (hot series, latest, ongoing, completed, popular) dan detail episode atau series (stream URL, server, episode list) dari topdonghua.com
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://topdonghua.com';

const HTTP_CLIENT = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    'Referer': BASE_URL
  }
});

function cleanText(text) {
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : null;
}

function resolveUrl(relativeUrl) {
  if (!relativeUrl) return null;
  try {
    return new URL(relativeUrl, BASE_URL).href;
  } catch (err) {
    return null;
  }
}

function decodeObfuscatedStream(encoded) {
  if (!encoded || typeof encoded !== 'string') return null;
  try {
    const step1 = Buffer.from(encoded, 'base64').toString('utf8');
    const reversed = step1.split('').reverse().join('');
    const decodedUrl = Buffer.from(reversed, 'base64').toString('utf8');
    return decodedUrl.startsWith('http') ? decodedUrl : null;
  } catch (err) {
    return null;
  }
}

function parseStreamProvider(url) {
  if (!url) return { provider: null, video_id: null };
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('dailymotion.com')) {
      const videoId = parsed.searchParams.get('video') || parsed.pathname.split('/').filter(Boolean).pop();
      return { provider: 'dailymotion', video_id: videoId };
    }
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
      const videoId = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();
      return { provider: 'youtube', video_id: videoId };
    }
    return { provider: parsed.hostname, video_id: null };
  } catch (err) {
    return { provider: null, video_id: null };
  }
}

function extractCardsFromGrid($, $grid) {
  const items = [];
  $grid.find('a').each((_, el) => {
    const $link = $(el);
    const href = $link.attr('href');
    if (!href || href === '#') return;

    const title = cleanText($link.find('.nova-title').text());
    if (!title) return;

    const poster = $link.find('.nova-poster-container img').attr('src') ||
                   $link.find('img').attr('src') ||
                   null;
    const type = cleanText($link.find('.type-badge').text()) || null;
    const sub = cleanText($link.find('.badge-sub').text()) || null;
    const ep = cleanText($link.find('.nv-ep').text()) || null;
    const isHot = $link.find('.hot-badge-icon').length > 0;

    items.push({
      title,
      episode: ep,
      type,
      sub,
      is_hot: isHot,
      url: resolveUrl(href),
      poster
    });
  });
  return items;
}

function extractCardsFromSlider($, $slider) {
  const items = [];
  $slider.find('a').each((_, el) => {
    const $link = $(el);
    const href = $link.attr('href');
    if (!href || href === '#') return;

    const title = cleanText($link.find('.nova-title').text());
    if (!title) return;

    const poster = $link.find('.nova-poster-container img').attr('src') ||
                   $link.find('img').attr('src') ||
                   null;
    const status = cleanText($link.find('.bdg').text()) || null;
    const type = cleanText($link.find('.type-badge').text()) || null;
    const sub = cleanText($link.find('.badge-sub').text()) || null;

    items.push({
      title,
      status,
      type,
      sub,
      url: resolveUrl(href),
      poster
    });
  });
  return items;
}

function extractPopularTab($, $tabPane) {
  const items = [];
  $tabPane.find('a').each((_, el) => {
    const $link = $(el);
    const href = $link.attr('href');
    if (!href || href === '#') return;

    const rankRaw = cleanText($link.find('.popular-rank').text());
    const rank = rankRaw ? parseInt(rankRaw, 10) : null;
    const title = cleanText($link.find('.popular-title').text());
    if (!title) return;

    const poster = $link.find('.popular-poster img').attr('src') || null;
    const genreText = cleanText($link.find('.genre-tags').text()?.replace(/Genre:\s*/i, ''));
    const genres = genreText ? genreText.split(',').map((g) => g.trim()).filter(Boolean) : [];
    const rating = cleanText($link.find('.rating-score').text()) || null;

    items.push({
      rank,
      title,
      genres,
      rating,
      url: resolveUrl(href),
      poster
    });
  });
  return items;
}

async function scrapeHome() {
  try {
    const response = await HTTP_CLIENT.get('/');
    if (response.status !== 200) {
      throw new Error(`HTTP Status ${response.status}`);
    }

    const $ = cheerio.load(response.data);

    let hotSeries = [];
    let recentlyUpdated = [];
    let ongoing = [];
    let upcoming = [];
    let completed = [];

    $('.section-header').each((_, el) => {
      const headerTitle = cleanText($(el).find('h2').text()) || '';
      const $nextContainer = $(el).next();

      if (/hot series/i.test(headerTitle)) {
        hotSeries = extractCardsFromGrid($, $nextContainer);
      } else if (/recently updated/i.test(headerTitle)) {
        recentlyUpdated = extractCardsFromGrid($, $nextContainer);
      } else if (/ongoing/i.test(headerTitle)) {
        ongoing = extractCardsFromSlider($, $nextContainer);
      } else if (/upcoming/i.test(headerTitle)) {
        upcoming = extractCardsFromSlider($, $nextContainer);
      } else if (/completed/i.test(headerTitle)) {
        completed = extractCardsFromSlider($, $nextContainer);
      }
    });

    const popular = {
      weekly: extractPopularTab($, $('#weekly-popular')),
      monthly: extractPopularTab($, $('#monthly-popular')),
      all_time: extractPopularTab($, $('#alltime-popular'))
    };

    return {
      status: true,
      source: BASE_URL,
      data: {
        hot_series: hotSeries,
        recently_updated: recentlyUpdated,
        ongoing,
        upcoming,
        completed,
        popular
      }
    };
  } catch (err) {
    throw new Error(`Gagal mengambil data home topdonghua.com: ${err.message}`);
  }
}

async function scrapeWatchDetail(url) {
  try {
    const response = await HTTP_CLIENT.get(url);
    if (response.status !== 200) {
      throw new Error(`HTTP Status ${response.status}`);
    }

    const html = response.data;
    const $ = cheerio.load(html);

    const title = cleanText($('.wat-episode-main-title').text()) ||
                  cleanText($('title').text().replace(/\s*–\s*English Sub.*$/i, ''));

    const subBadge = cleanText($('.wat-sub-badge').text()) || null;

    let releaseDate = null;
    const metaDateText = $('.wat-meta-row').text();
    const releaseMatch = metaDateText.match(/Released on\s+([A-Za-z]+\s+\d{1,2},\s*\d{4})/i) ||
                         metaDateText.match(/Released on\s+([A-Za-z0-9,\s]+?)(?=\s*series|$)/i);
    if (releaseMatch) {
      releaseDate = cleanText(releaseMatch[1]);
    }

    const $seriesLink = $('.wat-meta-row a[href*="/anime/"]');
    const series = {
      title: cleanText($seriesLink.text()) || null,
      url: resolveUrl($seriesLink.attr('href'))
    };

    let prevUrl = null;
    let nextUrl = null;
    $('a.wat-ui-btn').each((_, el) => {
      const text = $(el).text();
      const href = $(el).attr('href');
      if (!href || href === '#' || href.includes('javascript')) return;

      if (/previous/i.test(text)) {
        prevUrl = resolveUrl(href);
      } else if (/next/i.test(text)) {
        nextUrl = resolveUrl(href);
      }
    });

    const isLocked = html.includes('window.__episodeLocked = true') ||
                     $('#lockCountdown').length > 0;
    const countdown = cleanText($('#lockCountdown').text()) || null;

    let decodedServers = [];
    const sdMatch = html.match(/var _sd\s*=\s*(\[[^\]]+\]);/);
    if (sdMatch) {
      try {
        const rawArray = JSON.parse(sdMatch[1]);
        decodedServers = rawArray.map(decodeObfuscatedStream).filter(Boolean);
      } catch (err) {}
    }

    const servers = [];
    $('.wat-server-buttons button').each((index, btn) => {
      const name = cleanText($(btn).text());
      const btnLocked = $(btn).attr('disabled') !== undefined || $(btn).find('[data-lucide="lock"]').length > 0;
      const streamUrl = !btnLocked && decodedServers[index] ? decodedServers[index] : null;
      const streamInfo = parseStreamProvider(streamUrl);

      servers.push({
        index,
        name,
        is_locked: btnLocked || isLocked,
        stream_url: streamUrl,
        provider: streamInfo.provider,
        video_id: streamInfo.video_id
      });
    });

    if (servers.length === 0 && decodedServers.length > 0) {
      decodedServers.forEach((streamUrl, index) => {
        const streamInfo = parseStreamProvider(streamUrl);
        servers.push({
          index,
          name: `Server ${index + 1}`,
          is_locked: false,
          stream_url: streamUrl,
          provider: streamInfo.provider,
          video_id: streamInfo.video_id
        });
      });
    }

    const episodes = [];
    $('.wat-ep-link').each((_, el) => {
      const $ep = $(el);
      const epNum = cleanText($ep.attr('data-num')) || cleanText($ep.text());
      const epTitle = cleanText($ep.attr('title')) || `Episode ${epNum}`;
      const epHref = $ep.attr('href');
      const isCurrent = $ep.hasClass('wat-active');
      const isEpLocked = $ep.find('[data-lucide="lock"]').length > 0 || /members only/i.test(epTitle);

      episodes.push({
        episode: epNum,
        title: epTitle,
        url: resolveUrl(epHref),
        is_current: isCurrent,
        is_locked: isEpLocked
      });
    });

    const currentEpisodeObj = episodes.find((e) => e.is_current);
    const episodeNum = currentEpisodeObj ? currentEpisodeObj.episode : (url.match(/episode-(\d+)/i)?.[1] || null);

    return {
      status: true,
      type: 'episode',
      source: url,
      data: {
        title,
        episode: episodeNum,
        sub: subBadge,
        release_date: releaseDate,
        is_locked: isLocked,
        unlock_countdown: countdown,
        series,
        navigation: {
          previous: prevUrl,
          next: nextUrl
        },
        servers,
        total_episodes: episodes.length,
        episodes
      }
    };
  } catch (err) {
    throw new Error(`Gagal mengambil data episode watch topdonghua.com: ${err.message}`);
  }
}

async function scrapeAnimeDetail(url) {
  try {
    const response = await HTTP_CLIENT.get(url);
    if (response.status !== 200) {
      throw new Error(`HTTP Status ${response.status}`);
    }

    const $ = cheerio.load(response.data);

    const title = cleanText($('.anime-main-title').text()) || cleanText($('h1').text());
    const poster = $('.anime-poster-wrapper img').attr('src') || null;
    const ratingMatch = $('.anime-rating-stars, .anime-rating-box').text().match(/\d+(\.\d+)?/);
    const rating = ratingMatch ? ratingMatch[0] : null;

    const info = {};
    $('.anime-info-item').each((_, el) => {
      const key = cleanText($(el).find('.anime-info-label').text())?.replace(':', '').toLowerCase().replace(/\s+/g, '_');
      const val = cleanText($(el).find('.anime-info-value').text());
      if (key && val) {
        info[key] = val;
      }
    });

    const genres = [];
    $('.anime-type-pills .type-pill').each((_, el) => {
      const g = cleanText($(el).text());
      if (g) genres.push(g);
    });

    const synopsis = cleanText($('.anime-synopsis-text').text()) || null;

    const episodes = [];
    $('.anime-ep-grid a').each((_, el) => {
      const epNum = cleanText($(el).text());
      const epHref = $(el).attr('href');
      episodes.push({
        episode: epNum,
        url: resolveUrl(epHref)
      });
    });

    return {
      status: true,
      type: 'series',
      source: url,
      data: {
        title,
        poster,
        rating,
        genres,
        info,
        synopsis,
        total_episodes: episodes.length,
        episodes
      }
    };
  } catch (err) {
    throw new Error(`Gagal mengambil data series anime topdonghua.com: ${err.message}`);
  }
}

async function scrapeDetail(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL detail tidak boleh kosong');
  }

  const targetUrl = url.startsWith('http') ? url : resolveUrl(url);

  if (targetUrl.includes('/watch/')) {
    return scrapeWatchDetail(targetUrl);
  }

  if (targetUrl.includes('/anime/')) {
    return scrapeAnimeDetail(targetUrl);
  }

  return scrapeWatchDetail(targetUrl);
}

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--home')) {
    scrapeHome()
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((err) => {
        console.error(JSON.stringify({ status: false, error: err.message }, null, 2));
        process.exit(1);
      });
  } else if (args.includes('--detail')) {
    const detailIndex = args.indexOf('--detail');
    const detailUrl = args[detailIndex + 1];

    if (!detailUrl) {
      console.error(JSON.stringify({
        status: false,
        error: 'Argumen URL diperlukan setelah --detail. Contoh: node topdonghua.js --detail "https://topdonghua.com/watch/the-demon-hunter-season-3-episode-27"'
      }, null, 2));
      process.exit(1);
    }

    scrapeDetail(detailUrl)
      .then((result) => {
        console.log(JSON.stringify(result, null, 2));
      })
      .catch((err) => {
        console.error(JSON.stringify({ status: false, error: err.message }, null, 2));
        process.exit(1);
      });
  } else {
    console.log(JSON.stringify({
      status: false,
      message: 'Perintah tidak dikenal. Gunakan flag --home atau --detail <url>',
      usage: [
        'node topdonghua.js --home',
        'node topdonghua.js --detail "https://topdonghua.com/watch/the-demon-hunter-season-3-episode-27"'
      ]
    }, null, 2));
    process.exit(1);
  }
}

module.exports = {
  scrapeHome,
  scrapeDetail,
  scrapeWatchDetail,
  scrapeAnimeDetail
};
