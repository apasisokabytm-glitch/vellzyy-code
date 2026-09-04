/*
* Judul : Detik Scraper
* Base Url : https://detik.com
* Author : Vellzyy
* Channel Author : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
* Deskripsi : Scraper untuk mengambil data berita terbaru dari Detik.com.
* Note : Jangan hapus watermark
*/

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://detik.com';

function cleanText(text) {
    return text?.replace(/\s+/g, ' ').trim() || null;
}

async function scrapeDetik() {
    try {
        const response = await axios.get(BASE_URL, {
            timeout: 15000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
        
        if (response.status !== 200) {
            throw new Error(`Gagal memuat halaman, status: ${response.status}`);
        }

        const $ = cheerio.load(response.data);
        const items = [];

        // Detik menggunakan tag <article> untuk berita
        $('article').each((_, element) => {
            const urlRaw = $(element).find('.media__title a, .media__link').attr('href');
            if (!urlRaw) return; // Lewati jika tidak ada link

            const url = new URL(urlRaw, BASE_URL).href;
            const title = cleanText($(element).find('.media__title').text() || $(element).find('h2, h3').text());
            const image = $(element).find('.media__image img').attr('src') || $(element).find('img').attr('src') || null;
            
            // Extract kategori dan waktu
            const dateStrRaw = $(element).find('.media__date').text();
            let category = null;
            let date = null;
            
            if (dateStrRaw) {
                const parts = dateStrRaw.split('|').map(s => s.trim());
                if (parts.length > 1) {
                    category = cleanText(parts[0]);
                    // Kita bisa ambil waktu absolute dari attribute title pada span
                    const spanTitle = $(element).find('.media__date span').attr('title');
                    date = spanTitle ? cleanText(spanTitle) : cleanText(parts[1]);
                } else {
                    date = cleanText(parts[0]);
                }
            } else {
                // Alternatif pencarian kategori
                category = cleanText($(element).find('.media__tag, .tag').text());
                date = cleanText($(element).find('.date').text());
            }

            // Deduplikasi dan validasi sederhana
            if (title && url) {
                items.push({
                    title,
                    category,
                    date,
                    url,
                    image
                });
            }
        });

        // Deduplikasi
        const uniqueItems = [
            ...new Map(
                items.map(item => [item.url, item])
            ).values()
        ];
        
        if (!uniqueItems.length) {
            throw new Error("Tidak ada data yang berhasil diekstrak. Struktur web mungkin berubah.");
        }

        // Return structured JSON
        const result = {
            success: true,
            source: BASE_URL,
            count: uniqueItems.length,
            data: uniqueItems
        };

        // Output JSON ke stdout
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        const errorResult = {
            success: false,
            source: BASE_URL,
            count: 0,
            data: [],
            error: error.message
        };
        console.log(JSON.stringify(errorResult, null, 2));
    }
}

scrapeDetik();
