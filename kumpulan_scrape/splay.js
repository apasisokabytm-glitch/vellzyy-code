/**
 * Judul : SpotiDown Search & Download
 * Base Url : https://spotidown.app
 * Author : Vellzyy
 * Deskripsi : Scraper untuk mencari dan mendownload track dari Spotify melalui SpotiDown.app
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function scrape(query) {
    if (!query) return { status: false, message: "Query or URL is required" };

    try {
        const client = axios.create({
            baseURL: 'https://spotidown.app',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            }
        });

        // 1. Dapatkan token CSRF dan Cookie
        const res1 = await client.get('/');
        const $ = cheerio.load(res1.data);
        
        let tokenName = '', tokenValue = '';
        $('form[name="spotifyurl"] input[type="hidden"]').each((i, el) => {
            const name = $(el).attr('name');
            if (name && name !== 'g-recaptcha-response') {
                tokenName = name;
                tokenValue = $(el).val();
            }
        });
        
        const cookie = res1.headers['set-cookie'] ? res1.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';

        // 2. Submit URL/Query ke /action
        const formData = new URLSearchParams();
        formData.append('url', query);
        if (tokenName) formData.append(tokenName, tokenValue);
        formData.append('g-recaptcha-response', '');
        
        const actionHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookie,
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://spotidown.app/'
        };

        const res2 = await client.post('/action', formData.toString(), { headers: actionHeaders });
        
        if (res2.data.error) {
            return { status: false, message: res2.data.message || "Failed to search track" };
        }

        // 3. Ambil result pertama
        const $2 = cheerio.load(res2.data.data);
        const firstForm = $2('form[name="submitspurl"]').first();
        if (!firstForm.length) {
            return { status: false, message: "No tracks found" };
        }

        const trackData = new URLSearchParams();
        firstForm.find('input[type="hidden"]').each((i, el) => {
            trackData.append($(el).attr('name'), $(el).attr('value'));
        });

        const trackInfoBase64 = firstForm.find('input[name="data"]').val();
        let trackInfo = {};
        if (trackInfoBase64) {
            try {
                trackInfo = JSON.parse(Buffer.from(trackInfoBase64, 'base64').toString('utf8'));
            } catch (e) {}
        }

        // 4. Request link download ke /action/track
        const res3 = await client.post('/action/track', trackData.toString(), { headers: actionHeaders });
        
        if (res3.data.error) {
            return { status: false, message: res3.data.message || "Failed to get download URL" };
        }

        const $3 = cheerio.load(res3.data.data);
        let downloadUrl = '';
        $3('a.abutton').each((i, el) => {
            const text = $(el).text().toLowerCase();
            if (text.includes('download mp3')) {
                downloadUrl = $(el).attr('href');
            }
        });

        if (!downloadUrl) {
            return { status: false, message: "Download URL not found in response" };
        }

        return {
            status: true,
            data: {
                title: trackInfo.name || $3('h3[itemprop="name"]').text().trim(),
                artist: trackInfo.artist || $3('p').first().text().trim(),
                album: trackInfo.album || '',
                duration: trackInfo.duration || '',
                thumbnail: trackInfo.cover || $3('img').first().attr('src'),
                download_url: downloadUrl
            }
        };

    } catch (error) {
        return {
            status: false,
            message: error.response ? (error.response.data.message || error.response.statusText) : error.message
        };
    }
}

module.exports = scrape;

if (require.main === module) {
    const query = process.argv[2] || "faded";
    scrape(query).then(res => console.log(JSON.stringify(res, null, 2))).catch(console.error);
}
