/*
* Judul : Anichin Scraper
* Base Url : https://anichin.ro/
* Author : Vellzyy
* Channel Author : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
* Deskripsi : Scraper untuk Anichin (donghua) termasuk ekstrak link streaming dan daftar episode.
* Note : Jangan hapus watermark
*/

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://anichin.ro/';

function cleanText(text) {
    return text ? text.replace(/\s+/g, ' ').trim() : null;
}

const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

async function fetchHome() {
    try {
        const { data } = await axios.get(BASE_URL, { headers, timeout: 15000 });
        const $ = cheerio.load(data);
        const items = [];

        $('.bsx').each((i, el) => {
            const url = $(el).find('a').attr('href');
            const title = $(el).find('a').attr('title');
            const image = $(el).find('img').attr('src');
            const episode = cleanText($(el).find('.epx').text());
            const type = cleanText($(el).find('.typez').text() || $(el).find('.type').text());

            if (title && url) {
                items.push({
                    title,
                    url,
                    image: image || null,
                    episode: episode || null,
                    type: type || null
                });
            }
        });

        console.log(JSON.stringify({
            success: true,
            type: 'home',
            source: BASE_URL,
            count: items.length,
            data: items
        }, null, 2));

    } catch (err) {
        handleError(err, BASE_URL);
    }
}

async function fetchSearch(query) {
    try {
        const searchUrl = `https://anichin.ro/?s=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, { headers, timeout: 15000 });
        const $ = cheerio.load(data);
        const items = [];

        $('.bsx').each((i, el) => {
            const url = $(el).find('a').attr('href');
            const title = $(el).find('a').attr('title');
            const image = $(el).find('img').attr('src');
            const status = cleanText($(el).find('.epx').text()); // Biasanya berisi status Ongoing/Completed di hasil pencarian
            
            if (title && url) {
                items.push({
                    title,
                    url,
                    image: image || null,
                    status: status || null
                });
            }
        });

        console.log(JSON.stringify({
            success: true,
            type: 'search',
            query: query,
            source: searchUrl,
            count: items.length,
            data: items
        }, null, 2));

    } catch (err) {
        handleError(err, `https://anichin.ro/?s=${encodeURIComponent(query)}`);
    }
}

async function fetchDetail(detailUrl) {
    try {
        const { data } = await axios.get(detailUrl, { headers, timeout: 15000 });
        const $ = cheerio.load(data);
        
        const title = cleanText($('h1.entry-title').text());
        const streamUrl = $('.player-embed iframe, #pembed iframe').attr('src') || null;
        
        // Coba ekstrak image dari thumbnail halaman
        const image = $('.thumb img').attr('src') || $('meta[property="og:image"]').attr('content') || null;
        
        const episodes = [];
        $('.ep-item').each((i, el) => {
            const epNum = $(el).attr('data-number');
            const epUrl = $(el).attr('href');
            if (epNum && epUrl) {
                episodes.push({
                    episode: epNum,
                    url: epUrl
                });
            }
        });

        // Alternatif jika format episodes beda (jika di halaman series utama)
        if (episodes.length === 0) {
            $('.eplister ul li').each((i, el) => {
                const epUrl = $(el).find('a').attr('href');
                const epNum = cleanText($(el).find('.epl-num').text());
                const epTitle = cleanText($(el).find('.epl-title').text());
                
                if (epUrl) {
                    episodes.push({
                        episode: epNum || epTitle,
                        url: epUrl
                    });
                }
            });
        }

        const result = {
            title,
            image,
            stream_url: streamUrl,
            episodes: episodes
        };

        console.log(JSON.stringify({
            success: true,
            type: 'detail',
            source: detailUrl,
            data: result
        }, null, 2));

    } catch (err) {
        handleError(err, detailUrl);
    }
}

function handleError(err, url) {
    console.log(JSON.stringify({
        success: false,
        source: url,
        error: err.message
    }, null, 2));
}

// CLI Arg Parsing
const args = process.argv.slice(2);
const command = args[0];
const param = args.slice(1).join(' ');

if (command === '--home') {
    fetchHome();
} else if (command === '--search' && param) {
    const query = param.includes('?s=') ? new URL(param).searchParams.get('s') : param;
    fetchSearch(query);
} else if (command === '--detail' && param) {
    fetchDetail(param);
} else {
    console.log("Usage:");
    console.log("node anichin_scraper.js --home");
    console.log("node anichin_scraper.js --search <query_atau_url>");
    console.log("node anichin_scraper.js --detail <url_detail>");
}
