/**
 * Judul : IDLIX Streaming Movie, Series & Shorts Scraper
 * Base Url : https://z2.idlixku.com
 * Author : Vellzyy
 * Deskripsi : Scraper untuk mengambil daftar home page, pencarian film & serial, detail movie/series lengkap dengan episode & link stream (HLS/m3u8), serta Shorts dari IDLIX.
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');

const BASE_URL = 'https://z2.idlixku.com';
const API_BASE_URL = 'https://api.idlixku.com';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Origin': BASE_URL,
  'Referer': `${BASE_URL}/`,
  'Accept': 'application/json, text/plain, */*'
};

const jar = {};

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: DEFAULT_HEADERS,
  timeout: 20000,
  withCredentials: true
});

client.interceptors.response.use(
  res => {
    const setCookies = res.headers['set-cookie'];
    if (setCookies) {
      for (const c of setCookies) {
        const parts = c.split(';')[0].split('=');
        jar[parts[0].trim()] = parts.slice(1).join('=');
      }
    }
    return res;
  },
  async error => {
    const config = error.config;
    if (!config || config.__isRetry) {
      return Promise.reject(error);
    }
    if (error.response && error.response.status === 429) {
      config.__isRetry = true;
      const retryAfter = parseInt(error.response.headers['retry-after'] || '2', 10);
      const delayMs = (retryAfter > 0 ? retryAfter : 2) * 1000;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return client(config);
    }
    return Promise.reject(error);
  }
);

client.interceptors.request.use(cfg => {
  const cookieStr = Object.entries(jar).map(([k, v]) => k + '=' + v).join('; ');
  if (cookieStr) cfg.headers['Cookie'] = cookieStr;
  return cfg;
});

function formatImageUrl(path, size = 'w500') {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

function cleanSlug(input) {
  if (!input) return '';
  let clean = input.trim();
  clean = clean.replace(/^https?:\/\/[^/]+/i, '');
  clean = clean.replace(/^\/(movie|series|shorts|watch)\//i, '');
  clean = clean.replace(/\/season\/.*$/i, '');
  clean = clean.replace(/\?.*$/i, '');
  clean = clean.replace(/^\/+|\/+$/g, '');
  return clean;
}

async function extractStream(type, contentId, episodeId = null) {
  try {
    const trackBody = {
      contentType: type === 'movie' ? 'movie' : 'tv_series',
      contentId,
      ...(episodeId ? { episodeId } : {})
    };
    await client.post('/api/views/track', trackBody);

    const playInfoType = type === 'movie' ? 'movie' : 'episode';
    const playInfoId = type === 'movie' ? contentId : episodeId;
    const playRes = await client.get(`/api/watch/play-info/${playInfoType}/${playInfoId}`);
    const playInfo = playRes.data;

    if (!playInfo || !playInfo.gateToken) return null;

    const waitMs = Math.max(0, (playInfo.unlockAt - playInfo.serverNow) + 500);
    await new Promise(r => setTimeout(r, Math.min(waitMs, 16000)));

    const claimRes = await client.post('/api/watch/session/claim', { gateToken: playInfo.gateToken });
    const claimData = claimRes.data;

    if (claimData && claimData.redeemUrl && claimData.claim) {
      const redeemRes = await axios.post(claimData.redeemUrl, { claim: claimData.claim }, {
        headers: {
          'Content-Type': 'text/plain',
          'Origin': BASE_URL,
          'Referer': `${BASE_URL}/`
        },
        timeout: 10000
      });

      if (redeemRes.data && redeemRes.data.url) {
        return {
          stream_url: redeemRes.data.url,
          video_id: redeemRes.data.videoId || null,
          max_height: claimData.maxHeight || null,
          subtitles: (redeemRes.data.subtitles || []).map(s => ({
            lang: s.lang,
            label: s.label,
            url: s.path
          }))
        };
      }
    }
  } catch (err) {
    // fallback gracefully
  }
  return null;
}

function mapMediaItem(item) {
  if (!item) return null;

  if (item.contentType === 'episode') {
    const epNum = item.episodeNumber || 1;
    const seasonNum = item.season?.seasonNumber || 1;
    const seriesTitle = item.series?.title || 'Series';
    const epTitle = item.name ? `: ${item.name}` : '';
    const seriesSlug = item.series?.slug || '';
    const poster = formatImageUrl(item.stillPath || item.series?.posterPath, 'w500');

    return {
      id: item.id || null,
      title: `${seriesTitle} S${seasonNum}E${epNum}${epTitle}`,
      original_title: item.name || '',
      type: 'episode',
      slug: seriesSlug,
      overview: item.overview || null,
      rating: item.voteAverage ? parseFloat(item.voteAverage) : null,
      release_date: item.airDate || item.series?.firstAirDate || null,
      year: item.airDate ? parseInt(String(item.airDate).substring(0, 4), 10) : null,
      quality: item.quality || null,
      views: item.viewCount !== undefined ? item.viewCount : null,
      poster,
      still_poster: formatImageUrl(item.stillPath, 'w500'),
      url: `${BASE_URL}/series/${seriesSlug}/season/${seasonNum}/episode/${epNum}`,
      stream_url: `${BASE_URL}/series/${seriesSlug}/season/${seasonNum}/episode/${epNum}`
    };
  }

  const dataItem = item.content || item;
  const isSeries = dataItem.contentType === 'tv_series' || dataItem.contentType === 'series' || !!dataItem.numberOfSeasons || !!dataItem.firstAirDate;
  const type = isSeries ? 'series' : 'movie';
  const slug = dataItem.slug || cleanSlug(dataItem.title);
  const releaseDate = dataItem.releaseDate || dataItem.firstAirDate || null;
  const year = releaseDate ? parseInt(String(releaseDate).substring(0, 4), 10) : null;

  return {
    id: dataItem.id || null,
    title: dataItem.title || dataItem.name || '',
    original_title: dataItem.originalTitle || dataItem.title || '',
    type,
    slug,
    overview: dataItem.overview || null,
    rating: dataItem.voteAverage ? parseFloat(dataItem.voteAverage) : null,
    release_date: releaseDate,
    year,
    quality: dataItem.quality || null,
    country: dataItem.country || null,
    language: dataItem.originalLanguage || null,
    views: dataItem.viewCount !== undefined ? dataItem.viewCount : null,
    genres: (dataItem.genres || []).map(g => (typeof g === 'object' ? g.name : g)).filter(Boolean),
    poster: formatImageUrl(dataItem.posterPath, 'w500'),
    backdrop: formatImageUrl(dataItem.backdropPath, 'original'),
    url: `${BASE_URL}/${type}/${slug}`,
    stream_url: `${BASE_URL}/${type}/${slug}`
  };
}

async function getHome() {
  try {
    const res = await client.get('/api/homepage');
    const above = res.data.above || [];
    const below = res.data.below || [];
    const allSections = [...above, ...below];

    const structuredSections = {};

    for (const section of allSections) {
      const sectionName = section.title && section.title.trim() ? section.title.trim() : (section.slug || 'Trending');
      const items = (section.data || []).map(mapMediaItem).filter(Boolean);
      if (items.length > 0) {
        const key = sectionName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        structuredSections[key] = {
          title: sectionName,
          total: items.length,
          items
        };
      }
    }

    return {
      status: true,
      source: BASE_URL,
      sections: structuredSections
    };
  } catch (err) {
    throw new Error(`Gagal mengambil data home IDLIX: ${err.message}`);
  }
}

async function searchContent(query) {
  if (!query || !query.trim()) {
    throw new Error('Parameter query pencarian tidak boleh kosong');
  }

  try {
    const res = await client.get(`/api/search?q=${encodeURIComponent(query.trim())}`);
    const results = (res.data.results || []).map(mapMediaItem).filter(Boolean);

    return {
      status: true,
      query: query.trim(),
      total: results.length,
      data: results
    };
  } catch (err) {
    throw new Error(`Gagal melakukan pencarian IDLIX: ${err.message}`);
  }
}

async function getDetail(targetUrl) {
  if (!targetUrl || !targetUrl.trim()) {
    throw new Error('Parameter target URL atau slug tidak boleh kosong');
  }

  const raw = targetUrl.trim();
  const slug = cleanSlug(raw);

  if (!slug) {
    throw new Error(`URL atau slug tidak valid: ${targetUrl}`);
  }

  const isExplicitSeries = raw.includes('/series/');
  const isExplicitMovie = raw.includes('/movie/');

  let movieData = null;
  let seriesData = null;

  if (isExplicitMovie) {
    try {
      const res = await client.get(`/api/movies/${slug}`);
      movieData = res.data;
    } catch (e) {
      movieData = null;
    }
  } else if (isExplicitSeries) {
    try {
      const res = await client.get(`/api/series/${slug}`);
      seriesData = res.data;
    } catch (e) {
      seriesData = null;
    }
  } else {
    try {
      const res = await client.get(`/api/movies/${slug}`);
      movieData = res.data;
    } catch (e) {
      try {
        const res = await client.get(`/api/series/${slug}`);
        seriesData = res.data;
      } catch (err) {
        throw new Error(`Konten tidak ditemukan untuk slug "${slug}": ${err.message}`);
      }
    }
  }

  if (movieData) {
    const m = movieData;
    const releaseDate = m.releaseDate || null;
    const year = releaseDate ? parseInt(String(releaseDate).substring(0, 4), 10) : null;

    let directStream = null;
    if (m.hasVideo && m.id) {
      directStream = await extractStream('movie', m.id);
    }

    return {
      status: true,
      type: 'movie',
      title: m.title || '',
      original_title: m.originalTitle || m.title || '',
      slug: m.slug || slug,
      tagline: m.tagline || null,
      overview: m.overview || null,
      release_date: releaseDate,
      year,
      runtime_minutes: m.runtime || null,
      quality: m.quality || null,
      rating: m.voteAverage ? parseFloat(m.voteAverage) : null,
      views: m.viewCount || 0,
      country: m.country || null,
      language: m.originalLanguage || null,
      status_film: m.status || null,
      genres: (m.genres || []).map(g => (typeof g === 'object' ? g.name : g)).filter(Boolean),
      director: m.director || null,
      production_companies: (m.productionCompanies || []).map(p => p.name).filter(Boolean),
      cast: (m.cast || []).map(c => ({
        name: c.name,
        character: c.character || null,
        photo: formatImageUrl(c.profilePath, 'w185')
      })),
      poster: formatImageUrl(m.posterPath, 'w500'),
      backdrop: formatImageUrl(m.backdropPath, 'original'),
      backdrops: (m.backdrops || []).map(b => formatImageUrl(b, 'original')),
      url: `${BASE_URL}/movie/${slug}`,
      stream_url: directStream ? directStream.stream_url : `${BASE_URL}/movie/${slug}`,
      subtitles: directStream ? directStream.subtitles : [],
      stream_data: directStream ? {
        video_id: directStream.video_id,
        max_height: directStream.max_height
      } : null,
      trailer_url: m.trailerUrl || null,
      play_info_api: m.id ? `${API_BASE_URL}/api/watch/play-info/movie/${m.id}` : null,
      has_video: Boolean(m.hasVideo)
    };
  }

  if (seriesData) {
    const s = seriesData;
    const firstAirDate = s.firstAirDate || null;
    const year = firstAirDate ? parseInt(String(firstAirDate).substring(0, 4), 10) : null;

    const seasons = [];
    let firstEpisodeResolvedStream = null;

    for (const sea of (s.seasons || [])) {
      const seasonNum = sea.seasonNumber || 1;
      let episodes = [];

      try {
        const epRes = await client.get(`/api/series/${slug}/season/${seasonNum}`);
        if (epRes.data && epRes.data.season && Array.isArray(epRes.data.season.episodes)) {
          episodes = epRes.data.season.episodes.map(e => ({
            id: e.id,
            episode_number: e.episodeNumber,
            title: e.name || `Episode ${e.episodeNumber}`,
            overview: e.overview || null,
            air_date: e.airDate || null,
            runtime_minutes: e.runtime || null,
            still_poster: formatImageUrl(e.stillPath, 'w500'),
            stream_url: `${BASE_URL}/series/${slug}/season/${seasonNum}/episode/${e.episodeNumber}`,
            play_info_api: e.id ? `${API_BASE_URL}/api/watch/play-info/episode/${e.id}` : null,
            has_video: Boolean(e.hasVideo)
          }));
        }
      } catch (e) {
        episodes = [];
      }

      if (seasonNum === 1 && episodes.length > 0 && episodes[0].has_video && !firstEpisodeResolvedStream) {
        firstEpisodeResolvedStream = await extractStream('tv_series', s.id, episodes[0].id);
        if (firstEpisodeResolvedStream) {
          episodes[0].stream_url = firstEpisodeResolvedStream.stream_url;
          episodes[0].subtitles = firstEpisodeResolvedStream.subtitles;
          episodes[0].stream_data = {
            video_id: firstEpisodeResolvedStream.video_id,
            max_height: firstEpisodeResolvedStream.max_height
          };
        }
      }

      seasons.push({
        id: sea.id || null,
        season_number: seasonNum,
        name: sea.name || `Season ${seasonNum}`,
        overview: sea.overview || null,
        poster: formatImageUrl(sea.posterPath, 'w500'),
        episode_count: sea.episodeCount || episodes.length,
        episodes
      });
    }

    const defaultStreamUrl = firstEpisodeResolvedStream 
      ? firstEpisodeResolvedStream.stream_url 
      : `${BASE_URL}/series/${slug}`;

    return {
      status: true,
      type: 'series',
      title: s.title || '',
      original_title: s.originalTitle || s.title || '',
      slug: s.slug || slug,
      tagline: s.tagline || null,
      overview: s.overview || null,
      first_air_date: firstAirDate,
      year,
      number_of_seasons: s.numberOfSeasons || seasons.length,
      number_of_episodes: s.numberOfEpisodes || 0,
      rating: s.voteAverage ? parseFloat(s.voteAverage) : null,
      views: s.viewCount || 0,
      country: s.country || null,
      language: s.originalLanguage || null,
      status_series: s.status || null,
      networks: (s.networks || []).map(n => n.name).filter(Boolean),
      genres: (s.genres || []).map(g => (typeof g === 'object' ? g.name : g)).filter(Boolean),
      cast: (s.cast || []).map(c => ({
        name: c.name,
        character: c.character || null,
        photo: formatImageUrl(c.profilePath, 'w185')
      })),
      poster: formatImageUrl(s.posterPath, 'w500'),
      backdrop: formatImageUrl(s.backdropPath, 'original'),
      url: `${BASE_URL}/series/${slug}`,
      stream_url: defaultStreamUrl,
      subtitles: firstEpisodeResolvedStream ? firstEpisodeResolvedStream.subtitles : [],
      trailer_url: s.trailerUrl || null,
      seasons
    };
  }

  throw new Error(`Data tidak ditemukan untuk "${targetUrl}"`);
}

async function getShorts() {
  try {
    const res = await client.get('/api/search?q=shorts');
    const items = (res.data.results || []).map(item => {
      const isSeries = item.contentType === 'tv_series' || item.contentType === 'series' || !!item.numberOfSeasons;
      const type = isSeries ? 'series' : 'movie';
      const slug = item.slug;
      const releaseDate = item.releaseDate || item.firstAirDate || null;
      const year = releaseDate ? parseInt(String(releaseDate).substring(0, 4), 10) : null;

      return {
        id: item.id,
        title: item.title || '',
        original_title: item.originalTitle || item.title || '',
        type,
        slug,
        overview: item.overview || null,
        release_date: releaseDate,
        year,
        rating: item.voteAverage ? parseFloat(item.voteAverage) : null,
        views: item.viewCount || 0,
        genres: (item.genres || []).map(g => (typeof g === 'object' ? g.name : g)).filter(Boolean),
        poster: formatImageUrl(item.posterPath, 'w500'),
        backdrop: formatImageUrl(item.backdropPath, 'original'),
        shorts_url: `${BASE_URL}/shorts/${slug}`,
        stream_url: `${BASE_URL}/${type}/${slug}`
      };
    });

    return {
      status: true,
      category: 'Shorts & Short Drama',
      total: items.length,
      data: items
    };
  } catch (err) {
    throw new Error(`Gagal mengambil data Shorts IDLIX: ${err.message}`);
  }
}

async function getDetailShorts(targetUrl) {
  if (!targetUrl || !targetUrl.trim()) {
    throw new Error('Parameter URL atau slug shorts tidak boleh kosong');
  }

  const detail = await getDetail(targetUrl);
  return {
    status: true,
    category: 'Shorts Detail',
    data: detail
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`Penggunaan IDLIX Scraper:
  node kumpulan_scrape/idlix.js --home
  node kumpulan_scrape/idlix.js --search <query>
  node kumpulan_scrape/idlix.js --detail <url_movie_or_series>
  node kumpulan_scrape/idlix.js --shorts
  node kumpulan_scrape/idlix.js --detailshorts <url_shorts>
`);
    process.exit(0);
  }

  if (command === '--home') {
    getHome()
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
        console.log('\nTEST RESULT: TRUE');
      })
      .catch(err => {
        console.error(JSON.stringify({ status: false, error: err.message }, null, 2));
        console.log('\nTEST RESULT: FALSE');
        process.exit(1);
      });
  } else if (command === '--search') {
    const query = args.slice(1).join(' ') || 'avatar';
    searchContent(query)
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
        console.log('\nTEST RESULT: TRUE');
      })
      .catch(err => {
        console.error(JSON.stringify({ status: false, error: err.message }, null, 2));
        console.log('\nTEST RESULT: FALSE');
        process.exit(1);
      });
  } else if (command === '--detail') {
    const targetUrl = args[1] || 'libang-libu-2026';
    getDetail(targetUrl)
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
        console.log('\nTEST RESULT: TRUE');
      })
      .catch(err => {
        console.error(JSON.stringify({ status: false, error: err.message }, null, 2));
        console.log('\nTEST RESULT: FALSE');
        process.exit(1);
      });
  } else if (command === '--shorts') {
    getShorts()
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
        console.log('\nTEST RESULT: TRUE');
      })
      .catch(err => {
        console.error(JSON.stringify({ status: false, error: err.message }, null, 2));
        console.log('\nTEST RESULT: FALSE');
        process.exit(1);
      });
  } else if (command === '--detailshorts') {
    const targetUrl = args[1] || 'i-am-groot-2022';
    getDetailShorts(targetUrl)
      .then(res => {
        console.log(JSON.stringify(res, null, 2));
        console.log('\nTEST RESULT: TRUE');
      })
      .catch(err => {
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
  searchContent,
  getDetail,
  getShorts,
  getDetailShorts
};
