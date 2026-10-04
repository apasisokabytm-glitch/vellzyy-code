/**
 * Judul : MPL Schedule Scraper
 * Base Url : https://id-mpl.com/schedule
 * Author : Vellzyy
 * Deskripsi : Scraper untuk mengambil jadwal pertandingan lengkap dari website MPL Indonesia.
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function scrape(url = 'https://id-mpl.com/schedule') {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const matches = [];
    let currentDate = '';

    $('.match').each((i, el) => {
      if ($(el).hasClass('date')) {
        currentDate = $(el).text().trim();
      } else {
        const team1 = $(el).find('.team1 .name').text().trim();
        const score1 = $(el).find('.score1').text().trim();
        const team2 = $(el).find('.team2 .name').text().trim();
        const score2 = $(el).find('.score2').text().trim();
        
        // Time might be in '.time .pt-1' or just '.time'
        let time = '';
        const pt1 = $(el).find('.time .pt-1');
        if (pt1.length > 0) {
            time = pt1.text().trim();
        } else {
            // Clean up text if not in pt-1
            time = $(el).find('.time').first().text().replace(/\s+/g, ' ').trim();
            // Try to extract HH:MM
            const timeMatch = time.match(/\d{2}:\d{2}/);
            if (timeMatch) time = timeMatch[0];
        }

        if (team1 && team2) {
          matches.push({
            date: currentDate,
            time: time,
            team1: team1,
            score1: score1,
            team2: team2,
            score2: score2
          });
        }
      }
    });

    if (matches.length === 0) {
       throw new Error('Data tidak ditemukan atau struktur website telah berubah');
    }

    return matches;
  } catch (error) {
    throw new Error(`Gagal mengambil data: ${error.message}`);
  }
}

// Test runner
if (require.main === module) {
  (async () => {
    try {
      console.log('Mengambil data dari https://id-mpl.com/schedule ...');
      const data = await scrape();
      console.log(JSON.stringify({
        status: true,
        data: data
      }, null, 2));
    } catch (e) {
      console.error(JSON.stringify({
        status: false,
        message: e.message
      }, null, 2));
    }
  })();
}

module.exports = scrape;
