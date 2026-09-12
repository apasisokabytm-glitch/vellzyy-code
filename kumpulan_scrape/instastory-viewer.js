/**
 * Judul : InstaStory Viewer Scraper
 * Base Url : https://instastoryviewer.io
 * Author : Vellzyy
 * Deskripsi : Scraper untuk melihat dan mengunduh profil, stories, posts, reels, dan highlights Instagram secara anonim menggunakan username
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');

const BASE_URL = 'https://instastoryviewer.io';

const DEFAULT_ACTION_IDS = {
  fetchInfo: '7f75e67a343e0236529c899e990780b9ac6b264f24',
  fetchStories: '7f293d9810abb43fdcf56c4f18c32d261920d13eea',
  fetchPosts: '7fbccab7278b7a260eaee1645b8a8c490be14e1b7c',
  fetchReels: '7fd39b2713eb4fd008405e07c201fea1c021fb197a',
  fetchHighlightTray: '7f7f3f007d4295c86e251d52cca053342cc485d343',
  fetchByHighlightID: '7f88fe7bfeb3c3f4f0bdca735a0fad2b12feffe32c'
};

const cachedActionIds = { ...DEFAULT_ACTION_IDS };
let lastActionRefresh = 0;

function parseRSCStream(streamText) {
  const chunks = new Map();
  let pos = 0;
  const len = streamText.length;

  while (pos < len) {
    const colonIdx = streamText.indexOf(':', pos);
    if (colonIdx === -1) break;

    const id = streamText.substring(pos, colonIdx).trim();
    pos = colonIdx + 1;

    if (streamText[pos] === 'T') {
      const commaIdx = streamText.indexOf(',', pos);
      if (commaIdx !== -1) {
        const hexLen = streamText.substring(pos + 1, commaIdx);
        const textLen = parseInt(hexLen, 16);
        if (!isNaN(textLen)) {
          const textStart = commaIdx + 1;
          const textEnd = textStart + textLen;
          const textVal = streamText.substring(textStart, textEnd);
          chunks.set(id, textVal);
          pos = textEnd;
          if (streamText[pos] === '\r') pos++;
          if (streamText[pos] === '\n') pos++;
          continue;
        }
      }
    }

    let nextNewline = streamText.indexOf('\n', pos);
    if (nextNewline === -1) nextNewline = len;

    let lineContent = streamText.substring(pos, nextNewline);
    if (lineContent.endsWith('\r')) lineContent = lineContent.slice(0, -1);
    pos = nextNewline + 1;

    try {
      chunks.set(id, JSON.parse(lineContent));
    } catch {
      chunks.set(id, lineContent);
    }
  }

  function resolveReferences(val) {
    if (typeof val === 'string') {
      if (val.startsWith('$') && !val.startsWith('$$')) {
        const refId = val.slice(1);
        if (chunks.has(refId)) {
          return resolveReferences(chunks.get(refId));
        }
      }
      return val;
    }
    if (Array.isArray(val)) {
      return val.map(resolveReferences);
    }
    if (val !== null && typeof val === 'object') {
      const resolvedObj = {};
      for (const [key, value] of Object.entries(val)) {
        resolvedObj[key] = resolveReferences(value);
      }
      return resolvedObj;
    }
    return val;
  }

  return resolveReferences(chunks.get('1'));
}

async function refreshActionIds() {
  const now = Date.now();
  if (now - lastActionRefresh < 3600000) return cachedActionIds;

  try {
    const pageRes = await axios.get(BASE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    const scriptPaths = [...pageRes.data.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
    for (const src of scriptPaths) {
      const scriptUrl = src.startsWith('http') ? src : `${BASE_URL}${src}`;
      try {
        const scriptRes = await axios.get(scriptUrl, { timeout: 8000 });
        const scriptCode = scriptRes.data;
        const matches = [...scriptCode.matchAll(/createServerReference\)\("([a-f0-9]{40,})",[^)]*?"(fetchInfo|fetchStories|fetchPosts|fetchReels|fetchHighlightTray|fetchByHighlightID)"\)/g)];
        for (const match of matches) {
          cachedActionIds[match[2]] = match[1];
        }
      } catch {}
    }
    lastActionRefresh = now;
  } catch {}

  return cachedActionIds;
}

async function invokeAction(actionName, args = []) {
  const actionIds = await refreshActionIds();
  const actionId = actionIds[actionName] || DEFAULT_ACTION_IDS[actionName];

  if (!actionId) {
    throw new Error(`Action ${actionName} tidak ditemukan.`);
  }

  const response = await axios.post(`${BASE_URL}/`, JSON.stringify(args), {
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      'Next-Action': actionId,
      'Accept': 'text/x-component',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/`
    },
    timeout: 30000
  });

  return parseRSCStream(response.data);
}

function cleanInput(input) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:stories\/)?([a-zA-Z0-9._]+)/);
  if (urlMatch) return urlMatch[1];
  return trimmed.replace(/^@/, '');
}

function formatUserProfile(raw) {
  if (!raw) return null;
  return {
    id: String(raw.id || ''),
    username: raw.username,
    full_name: raw.full_name || '',
    biography: raw.biography || '',
    is_private: Boolean(raw.is_private),
    follower_count: raw.follower_count || 0,
    following_count: raw.following_count || 0,
    media_count: raw.media_count || 0,
    avatar: raw.profile_pictures?.[0]?.url || null
  };
}

async function getProfile(username) {
  const user = cleanInput(username);
  if (!user) throw new Error('Username target harus diisi.');

  const rawInfo = await invokeAction('fetchInfo', [user]);
  if (!rawInfo) {
    throw new Error(`Pengguna @${user} tidak ditemukan.`);
  }

  return {
    status: true,
    data: formatUserProfile(rawInfo)
  };
}

async function getStories(username) {
  const user = cleanInput(username);
  if (!user) throw new Error('Username target harus diisi.');

  const [rawInfo, rawStories] = await Promise.all([
    invokeAction('fetchInfo', [user]),
    invokeAction('fetchStories', [user])
  ]);

  if (!rawInfo) {
    throw new Error(`Pengguna @${user} tidak ditemukan atau akun bersifat private.`);
  }

  const storiesList = Array.isArray(rawStories) ? rawStories.map(item => {
    const isVideo = Boolean(item.is_video);
    const mediaUrl = isVideo && item.videos?.[0]?.url
      ? item.videos[0].url
      : (item.pictures?.[0]?.url || null);

    return {
      id: String(item.id),
      type: isVideo ? 'video' : 'image',
      url: mediaUrl,
      thumbnail: item.pictures?.[0]?.url || null,
      timestamp: item.timestamp,
      date: item.timestamp ? new Date(item.timestamp * 1000).toISOString() : null
    };
  }) : [];

  return {
    status: true,
    user: formatUserProfile(rawInfo),
    stories: storiesList,
    total_stories: storiesList.length
  };
}

async function getPosts(username, nextPageToken = '') {
  const user = cleanInput(username);
  if (!user) throw new Error('Username target harus diisi.');

  const args = nextPageToken ? [user, nextPageToken] : [user];
  const [rawInfo, rawPosts] = await Promise.all([
    invokeAction('fetchInfo', [user]),
    invokeAction('fetchPosts', args)
  ]);

  if (!rawInfo) {
    throw new Error(`Pengguna @${user} tidak ditemukan.`);
  }

  const posts = Array.isArray(rawPosts?.posts) ? rawPosts.posts.map(item => {
    const isVideo = Boolean(item.is_video);
    const mediaUrl = isVideo && item.videos?.[0]?.url
      ? item.videos[0].url
      : (item.pictures?.[0]?.url || null);

    return {
      id: String(item.id),
      type: isVideo ? 'video' : 'image',
      caption: item.caption || '',
      likes: item.like_count || 0,
      comments: item.comment_count || 0,
      url: mediaUrl,
      thumbnail: item.pictures?.[0]?.url || null,
      timestamp: item.timestamp,
      date: item.timestamp ? new Date(item.timestamp * 1000).toISOString() : null
    };
  }) : [];

  return {
    status: true,
    user: formatUserProfile(rawInfo),
    posts,
    has_next_page: Boolean(rawPosts?.has_next_page),
    next_page: rawPosts?.next_page || null,
    total_posts: posts.length
  };
}

async function getReels(username, nextPageToken = '') {
  const user = cleanInput(username);
  if (!user) throw new Error('Username target harus diisi.');

  const args = nextPageToken ? [user, nextPageToken] : [user];
  const [rawInfo, rawReels] = await Promise.all([
    invokeAction('fetchInfo', [user]),
    invokeAction('fetchReels', args)
  ]);

  if (!rawInfo) {
    throw new Error(`Pengguna @${user} tidak ditemukan.`);
  }

  const reels = Array.isArray(rawReels?.reels) ? rawReels.reels.map(item => ({
    id: String(item.id),
    caption: item.caption || '',
    likes: item.like_count || 0,
    comments: item.comment_count || 0,
    url: item.videos?.[0]?.url || null,
    thumbnail: item.pictures?.[0]?.url || null,
    timestamp: item.timestamp,
    date: item.timestamp ? new Date(item.timestamp * 1000).toISOString() : null
  })) : [];

  return {
    status: true,
    user: formatUserProfile(rawInfo),
    reels,
    has_next_page: Boolean(rawReels?.has_next_page),
    next_page: rawReels?.next_page || null,
    total_reels: reels.length
  };
}

async function getHighlights(username) {
  const user = cleanInput(username);
  if (!user) throw new Error('Username target harus diisi.');

  const [rawInfo, rawTray] = await Promise.all([
    invokeAction('fetchInfo', [user]),
    invokeAction('fetchHighlightTray', [user])
  ]);

  if (!rawInfo) {
    throw new Error(`Pengguna @${user} tidak ditemukan.`);
  }

  const highlights = Array.isArray(rawTray?.highlights) ? rawTray.highlights.map(item => ({
    id: String(item.id),
    title: item.title || '',
    cover: item.pictures?.[0]?.url || null
  })) : [];

  return {
    status: true,
    user: formatUserProfile(rawInfo),
    highlights,
    total_highlights: highlights.length
  };
}

const scrape = getStories;
scrape.getStories = getStories;
scrape.getProfile = getProfile;
scrape.getPosts = getPosts;
scrape.getReels = getReels;
scrape.getHighlights = getHighlights;

if (require.main === module) {
  const args = process.argv.slice(2);
  const username = args[0];

  if (!username) {
    console.log('Penggunaan: node instastory-viewer.js <username> [--type=stories|posts|reels|highlights|profile]');
    process.exit(1);
  }

  const typeArg = (args.find(a => a.startsWith('--type=')) || '--type=stories').split('=')[1];

  (async () => {
    try {
      console.log(`Mengambil data ${typeArg} untuk: @${username} ...\n`);
      let result;

      switch (typeArg.toLowerCase()) {
        case 'profile':
          result = await getProfile(username);
          break;
        case 'posts':
          result = await getPosts(username);
          break;
        case 'reels':
          result = await getReels(username);
          break;
        case 'highlights':
          result = await getHighlights(username);
          break;
        case 'stories':
        default:
          result = await getStories(username);
          break;
      }

      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = scrape;
