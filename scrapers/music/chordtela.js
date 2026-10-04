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
 * Mencari URL lagu di Chordtela berdasarkan nama lagu.
 * Memadukan query lagu, prediksi artis, dan penelusuran direktori Chordtela.
 * @param {string} songQuery Nama lagu atau artis + judul
 */
async function findSongUrl(songQuery) {
  const q = songQuery.trim();
  if (q.startsWith('http')) return q;

  const words = q.split(/\s+/);
  const candidateArtists = [];
  let trackTitle = q;

  // 1. Cek iTunes Search API untuk membantu menebak artis dan judul lagu resmi
  try {
    const itunesRes = await axios.get(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=10`,
      { timeout: 5000 }
    );
    if (itunesRes.data && itunesRes.data.results && Array.isArray(itunesRes.data.results)) {
      for (const item of itunesRes.data.results) {
        if (item.artistName && !candidateArtists.includes(item.artistName)) {
          candidateArtists.push(item.artistName);
        }
        if (item.trackName && trackTitle === q) {
          trackTitle = item.trackName;
        }
      }
    }
  } catch (_) {}

  // 2. Tambahkan variasi dari query input user
  if (!candidateArtists.includes(q)) candidateArtists.push(q);
  if (words.length > 1) {
    candidateArtists.push(words.slice(0, 2).join(' '));
    candidateArtists.push(words[0]);
  }

  // 3. Telusuri direktori alfabet Chordtela untuk menemukan halaman artis
  for (const artistName of candidateArtists) {
    if (!artistName || artistName.length < 2) continue;
    const firstChar = artistName.trim().charAt(0);
    const section = getSectionForChar(firstChar);

    try {
      const dirHtml = await fetchPage(`${BASE_URL}/chord-gitar-${section}`);
      const $dir = cheerio.load(dirHtml);

      const aLower = artistName.toLowerCase();
      let artistPageUrl = '';

      $dir('a[href*="/chord/"], a[href*="/kumpulan-chord/"]').each((_, el) => {
        const text = $dir(el).text().trim().toLowerCase();
        const href = $dir(el).attr('href');
        if (!href) return;
        if (text === aLower || text.includes(aLower) || aLower.includes(text)) {
          artistPageUrl = href;
          return false;
        }
      });

      // Jika halaman artis ditemukan, cari lagu di daftar lagu artis tersebut
      if (artistPageUrl) {
        const artistHtml = await fetchPage(artistPageUrl);
        const $artist = cheerio.load(artistHtml);

        let bestSongUrl = null;
        let bestScore = 0;
        const songKeywords = words.filter(w => !aLower.includes(w.toLowerCase()) && w.length >= 2);

        $artist('a[href*=".html"]').each((_, el) => {
          const songText = $artist(el).text().trim().toLowerCase();
          const href = $artist(el).attr('href');
          if (!href || !href.match(/\/\d{4}\/\d{2}\//)) return;

          let score = 0;
          if (trackTitle && songText.includes(trackTitle.toLowerCase())) {
            score += 50;
          }
          if (songText.includes(q.toLowerCase())) {
            score += 40;
          }
          for (const kw of songKeywords) {
            if (songText.includes(kw.toLowerCase())) {
              score += 20;
            }
          }
          if (songKeywords.length === 0 && score === 0) {
            score = 1;
          }

          if (score > bestScore) {
            bestScore = score;
            bestSongUrl = href;
          }
        });

        if (bestSongUrl && bestScore > 0) {
          return bestSongUrl;
        }
      }
    } catch (_) {}
  }

  return null;
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
  let fullChordText = preChord.text().trim();
  fullChordText = fullChordText.replace(/<iframe[\s\S]*?<\/iframe>/gi, '').trim();

  let easyChord = fullChordText;
  let originalChord = null;
  const splitRegex = /(?:[-=\s]*===ORIGINAL CHORD===*[-=\s]*|[-=\s]*\|\|\s*sebelum di sederhanakan[\s\S]*?\|\|[-=\s]*)/i;
  if (splitRegex.test(fullChordText)) {
    const parts = fullChordText.split(splitRegex);
    easyChord = parts[0].trim();
    originalChord = parts[1] ? parts[1].trim() : null;
  }

  // Bersihkan baris judul yang berulang di baris pertama
  if (easyChord.toLowerCase().startsWith(cleanTitle.toLowerCase())) {
    easyChord = easyChord.slice(cleanTitle.length).trim();
  }
  if (originalChord && originalChord.toLowerCase().startsWith(cleanTitle.toLowerCase())) {
    originalChord = originalChord.slice(cleanTitle.length).trim();
  }

  // 2. Lirik murni tanpa simbol chord
  const lyricsLines = easyChord.split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (/capo/i.test(trimmed)) return '';
      if (/<iframe/i.test(trimmed) || /youtube\.com/i.test(trimmed)) return '';
      if (/^[-=|_~]{2,}/.test(trimmed)) return '';
      if (/^(intro|outro|interlude|solo|bridge|musik)\s*[:.]/i.test(trimmed)) return '';

      const chordTokens = trimmed.split(/\s+/);
      const isAllChords = chordTokens.length > 0 && chordTokens.every(token => {
        const cleanToken = token.replace(/[-.:~[\]()0-9x\/]/gi, '');
        return cleanToken === '' || chordsSet.has(cleanToken);
      });
      if (isAllChords) return '';
      return trimmed;
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
 * Mengambil chord dan lirik lagu berdasarkan nama lagu atau URL langsung.
 * @param {string} songNameOrUrl Judul lagu (misal: "semua tentang kita") atau URL langsung
 */
async function getChordBySong(songNameOrUrl) {
  if (!songNameOrUrl || typeof songNameOrUrl !== 'string') {
    throw new Error('Nama lagu atau URL wajib diisi.');
  }

  const query = songNameOrUrl.trim();
  if (query.startsWith('http')) {
    return await getChord(query);
  }

  const foundUrl = await findSongUrl(query);
  if (!foundUrl) {
    throw new Error(`Lagu "${query}" tidak ditemukan di Chordtela.`);
  }

  return await getChord(foundUrl);
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

// Eksekusi CLI
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Penggunaan CLI Chordtela:');
    console.log('  node chordtela.js <nama lagu>');
    console.log('  node chordtela.js <url lagu>');
    console.log('\nContoh:');
    console.log('  node chordtela.js semua tentang kita');
    console.log('  node chordtela.js komang');
    console.log('  node chordtela.js last child duka');
    console.log('  node chordtela.js https://www.chordtela.com/2014/12/semua-tentang-kita-peterpan.html');
    process.exit(0);
  }

  // Jika input adalah opsi --home atau --latest
  if (args[0] === '--home' || args[0] === '--latest') {
    getHome()
      .then(res => console.log(JSON.stringify(res, null, 2)))
      .catch(err => {
        console.error('[ERROR]', err.message);
        process.exit(1);
      });
  } else if (args[0] === '--artist') {
    const artist = args.slice(1).join(' ');
    getArtistChords(artist)
      .then(res => console.log(JSON.stringify(res, null, 2)))
      .catch(err => {
        console.error('[ERROR]', err.message);
        process.exit(1);
      });
  } else {
    // Default: Ambil nama lagu atau URL langsung dari argumen
    const songInput = args[0] === '--url' ? args.slice(1).join(' ') : args.join(' ');
    getChordBySong(songInput)
      .then(res => console.log(JSON.stringify(res, null, 2)))
      .catch(err => {
        console.error('[ERROR]', err.message);
        process.exit(1);
      });
  }
}

module.exports = {
  getChordBySong,
  getChord,
  findSongUrl,
  getHome,
  getArtistChords
};
