/**
 * Judul : Chordtela Guitar Chord & Lyrics Scraper
 * Base Url : https://www.chordtela.com
 * Author : Vellzyy
 * Deskripsi : Scraper untuk mengambil kunci gitar (chord) dan lirik lagu dari Chordtela.
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.chordtela.com';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
};

/**
 * Mengambil konten HTML dari URL target.
 * Menggunakan direct request terlebih dahulu, kemudian fallback ke proxy web reader jika diblokir oleh Cloudflare WAF.
 */
async function fetchPage(targetUrl, timeout = 15000) {
  try {
    const res = await axios.get(targetUrl, {
      headers: DEFAULT_HEADERS,
      timeout: timeout
    });
    if (res.data && typeof res.data === 'string' && !res.data.includes('Attention Required! | Cloudflare')) {
      return res.data;
    }
    throw new Error('Cloudflare challenge detected');
  } catch (err) {
    const fallbackUrl = `https://r.jina.ai/${targetUrl}`;
    const res = await axios.get(fallbackUrl, {
      headers: {
        'X-Return-Format': 'html'
      },
      timeout: timeout + 5000
    });
    return res.data;
  }
}

/**
 * Menentukan section direktori alfabet berdasarkan karakter pertama artist.
 */
function getSectionForChar(char) {
  const c = (char || '').toLowerCase();
  if (/[ab]/.test(c)) return 'a-b';
  if (/[cd]/.test(c)) return 'c-d';
  if (/[ef]/.test(c)) return 'e-f';
  if (/[gh]/.test(c)) return 'g-h';
  if (/[ij]/.test(c)) return 'i-j';
  if (/[kl]/.test(c)) return 'k-l';
  if (/[mn]/.test(c)) return 'm-n';
  if (/[op]/.test(c)) return 'o-p';
  if (/[qr]/.test(c)) return 'q-r';
  if (/[st]/.test(c)) return 's-t';
  if (/[uv]/.test(c)) return 'u-v';
  if (/[wx]/.test(c)) return 'w-x';
  if (/[yz]/.test(c)) return 'y-z';
  return '0-9';
}

/**
 * Mengambil detail chord dan lirik dari halaman lagu Chordtela.
 * @param {string} songUrl URL lagu chordtela (contoh: https://www.chordtela.com/2014/10/last-child-indahkah-perbedaan.html)
 */
async function getChord(songUrl) {
  if (!songUrl || typeof songUrl !== 'string') {
    throw new Error('Parameter songUrl harus berupa string URL yang valid.');
  }

  const cleanUrl = songUrl.trim();
  const html = await fetchPage(cleanUrl);
  const $ = cheerio.load(html);

  const rawTitle = $('h1.entry-title, h1.post-title, h1').first().text().trim();
  const cleanTitle = rawTitle
    .replace(/©?ChordTela\.com/gi, '')
    .replace(/Kunci Gitar/gi, '')
    .replace(/Chord Dasar/gi, '')
    .trim();

  let artist = $('.breadcrumb-item a').eq(1).text().trim();
  if (!artist || artist.toLowerCase() === 'home') {
    const parts = cleanTitle.split('-');
    artist = parts.length > 1 ? parts[0].trim() : '';
  }

  const pre = $('div.telabox pre, .entry-content pre').first();
  if (!pre.length) {
    throw new Error('Struktur chord (<pre>) tidak ditemukan pada halaman ini.');
  }

  // Bersihkan elemen script atau style yang disisipkan di dalam pre
  pre.find('script, style, iframe').remove();

  let capo = null;
  pre.find('b, span').each((_, el) => {
    const t = $(el).text().trim();
    if (/capo/i.test(t)) {
      capo = t;
    }
  });

  const chordsSet = new Set();
  pre.find('a.tbi-tooltip').each((_, el) => {
    const chordName = $(el).clone().children().remove().end().text().trim();
    if (chordName) chordsSet.add(chordName);
  });

  // 1. Full Chord Sheet dengan posisi kunci di atas lirik
  const preChord = pre.clone();
  preChord.find('a.tbi-tooltip span').remove();
  const fullChordText = preChord.text().trim();

  let easyChord = fullChordText;
  let originalChord = null;
  if (fullChordText.includes('===ORIGINAL CHORD===')) {
    const parts = fullChordText.split(/[-=\s]*===ORIGINAL CHORD===*[-=\s]*/);
    easyChord = parts[0].trim();
    originalChord = parts[1] ? parts[1].trim() : null;
  }

  // 2. Lirik murni tanpa simbol chord
  const lyricsLines = easyChord.split('\n')
    .map(line => {
      if (/capo/i.test(line)) return '';
      if (/^(intro|outro|interlude|solo|bridge|musik)\s*[:.]/i.test(line.trim())) return '';
      const chordTokens = line.trim().split(/\s+/);
      const isAllChords = chordTokens.length > 0 && chordTokens.every(token => {
        const cleanToken = token.replace(/[-.:~[\]()0-9x\/]/gi, '');
        return cleanToken === '' || chordsSet.has(cleanToken);
      });
      if (isAllChords) return '';
      return line.trim();
    })
    .filter(line => line.length > 0);

  const cleanLyrics = lyricsLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  return {
    status: true,
    data: {
      title: cleanTitle,
      artist: artist || null,
      url: cleanUrl,
      capo: capo,
      chords_used: Array.from(chordsSet),
      chord: easyChord,
      original_chord: originalChord,
      lyrics: cleanLyrics
    }
  };
}

/**
 * Mengambil daftar Chord Terbaru dan Chord Pilihan dari homepage.
 */
async function getHome() {
  const html = await fetchPage(BASE_URL);
  const $ = cheerio.load(html);

  const latest = [];
  $('.widget_recent_entries').first().find('li a').each((_, el) => {
    const title = $(el).text().replace(/^Chord\s*/i, '').trim();
    const url = $(el).attr('href');
    if (title && url) {
      latest.push({ title, url });
    }
  });

  const popular = [];
  $('.widget_recent_entries').last().find('li a').each((_, el) => {
    const title = $(el).text().replace(/^Chord\s*/i, '').trim();
    const url = $(el).attr('href');
    if (title && url) {
      popular.push({ title, url });
    }
  });

  return {
    status: true,
    data: {
      latest,
      popular
    }
  };
}

/**
 * Mengambil semua daftar lagu chord dari seorang artis.
 * @param {string} artistSlugOrUrl Slug atau URL artis (contoh: "last-child" atau "https://www.chordtela.com/chord/last-child")
 */
async function getArtistChords(artistSlugOrUrl) {
  let targetUrl = artistSlugOrUrl;
  if (!targetUrl.startsWith('http')) {
    targetUrl = `${BASE_URL}/chord/${artistSlugOrUrl.replace(/^\/+/, '')}`;
  }

  const html = await fetchPage(targetUrl);
  const $ = cheerio.load(html);

  const rawTitle = $('h1.entry-title, h1.post-title, h1').first().text().trim();
  const artistName = rawTitle.replace(/Daftar Koleksi Chord \/ Kunci Gitar/gi, '').trim();

  const songs = [];
  $('a[href*=".html"]').each((_, el) => {
    const href = $(el).attr('href');
    const songTitle = $(el).text().trim();
    if (href && href.match(/\/\d{4}\/\d{2}\//) && songTitle) {
      if (!songs.some(s => s.url === href)) {
        songs.push({
          title: songTitle.replace(/^Chord\s*/i, '').trim(),
          url: href
        });
      }
    }
  });

  return {
    status: true,
    data: {
      artist: artistName || artistSlugOrUrl,
      url: targetUrl,
      total_songs: songs.length,
      songs
    }
  };
}

/**
 * Mencari artis dan lagu di Chordtela berdasarkan query pencarian.
 * @param {string} query Kata kunci pencarian
 */
async function searchChord(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('Query pencarian wajib diisi.');
  }

  const q = query.trim().toLowerCase();
  const words = q.split(/\s+/);
  const section = getSectionForChar(words[0].charAt(0));

  const html = await fetchPage(`${BASE_URL}/chord-gitar-${section}`);
  const $ = cheerio.load(html);

  const matchedArtists = [];
  $('a[href*="/chord/"], a[href*="/kumpulan-chord/"]').each((_, el) => {
    const name = $(el).text().trim();
    const href = $(el).attr('href');
    if (!name || !href) return;
    const lowerName = name.toLowerCase();

    if (lowerName === q || lowerName.includes(q) || q.includes(lowerName) || lowerName.includes(words[0])) {
      if (!matchedArtists.some(a => a.url === href)) {
        matchedArtists.push({ name, url: href });
      }
    }
  });

  const songs = [];
  if (matchedArtists.length > 0) {
    const topArtist = matchedArtists[0];
    const artistHtml = await fetchPage(topArtist.url);
    const $artist = cheerio.load(artistHtml);

    $artist('a[href*=".html"]').each((_, el) => {
      const songTitle = $artist(el).text().trim();
      const href = $artist(el).attr('href');
      if (href && href.match(/\/\d{4}\/\d{2}\//) && songTitle) {
        if (!songs.some(s => s.url === href)) {
          const remainingKeywords = words.filter(w => !topArtist.name.toLowerCase().includes(w));
          const matchSong = remainingKeywords.length === 0 || remainingKeywords.some(k => songTitle.toLowerCase().includes(k));
          if (matchSong) {
            songs.push({
              title: songTitle.replace(/^Chord\s*/i, '').trim(),
              artist: topArtist.name,
              url: href
            });
          }
        }
      }
    });
  }

  return {
    status: true,
    data: {
      query,
      matched_artists: matchedArtists.slice(0, 5),
      total_songs: songs.length,
      songs: songs.slice(0, 15)
    }
  };
}

// Eksekusi CLI
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Penggunaan CLI Chordtela Scraper:');
    console.log('  node chordtela.js --url "<song_url>"       : Ambil detail chord dan lirik lagu');
    console.log('  node chordtela.js --home                   : Ambil daftar chord terbaru & pilihan');
    console.log('  node chordtela.js --artist "<artist_slug>" : Ambil semua lagu dari artis tertentu');
    console.log('  node chordtela.js --search "<query>"       : Cari artis dan lagu chord');
    console.log('\nMenjalankan demo chord terbaru...');
    getHome()
      .then(res => console.log(JSON.stringify(res, null, 2)))
      .catch(err => {
        console.error('[ERROR]', err.message);
        process.exit(1);
      });
  } else {
    const flag = args[0];
    const val = args.slice(1).join(' ');

    if (flag === '--home' || flag === '--latest') {
      getHome()
        .then(res => console.log(JSON.stringify(res, null, 2)))
        .catch(err => {
          console.error('[ERROR]', err.message);
          process.exit(1);
        });
    } else if (flag === '--url' || (flag.startsWith('http') && flag.includes('.html'))) {
      const targetUrl = flag === '--url' ? val : flag;
      getChord(targetUrl)
        .then(res => console.log(JSON.stringify(res, null, 2)))
        .catch(err => {
          console.error('[ERROR]', err.message);
          process.exit(1);
        });
    } else if (flag === '--artist') {
      getArtistChords(val)
        .then(res => console.log(JSON.stringify(res, null, 2)))
        .catch(err => {
          console.error('[ERROR]', err.message);
          process.exit(1);
        });
    } else if (flag === '--search') {
      searchChord(val)
        .then(res => console.log(JSON.stringify(res, null, 2)))
        .catch(err => {
          console.error('[ERROR]', err.message);
          process.exit(1);
        });
    } else {
      // Jika langsung memberikan query atau URL
      if (flag.startsWith('http')) {
        getChord(flag)
          .then(res => console.log(JSON.stringify(res, null, 2)))
          .catch(err => {
            console.error('[ERROR]', err.message);
            process.exit(1);
          });
      } else {
        searchChord(args.join(' '))
          .then(res => console.log(JSON.stringify(res, null, 2)))
          .catch(err => {
            console.error('[ERROR]', err.message);
            process.exit(1);
          });
      }
    }
  }
}

module.exports = {
  getChord,
  getHome,
  getArtistChords,
  searchChord
};
