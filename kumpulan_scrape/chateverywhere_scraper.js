/*
* Judul : ChatEverywhere Bot Interactive
* Base Url : https://chateverywhere.app/id
* Author : Vellzyy
* Channel Author : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
* Deskripsi : Scraper chat interaktif menggunakan argumen terminal (node chat.js <query>) dengan puppeteer-extra-plugin-stealth
* Note : Jangan hapus watermark
*/

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function chat(query) {
    console.log(`[INFO] Mengirim query: "${query}"...`);
        const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 375, height: 812, isMobile: true });
        
        // Membuka target dengan user-agent standard
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto('https://chateverywhere.app/id', { waitUntil: 'networkidle2', timeout: 30000 });
        
        console.log('[INFO] Menunggu render UI Chat...');
        
        // Mencari elemen textarea (Kotak input chat)
        const inputSelector = 'textarea';
        await page.waitForSelector(inputSelector, { timeout: 15000 });
        
        // Mengetikkan query
        await page.type(inputSelector, query, { delay: 30 });
        console.log('[INFO] Mengetik pesan...');
        
        // Menekan tombol Enter
        await page.keyboard.press('Enter');
        console.log('[INFO] Pesan terkirim! Menunggu balasan AI...');
        
        // Menunggu agar elemen chat response muncul (contoh class '.prose' untuk markdown text)
        // Kita gunakan setTimeout sementara dan menangkap semua elemen balasan
        await new Promise(r => setTimeout(r, 10000)); 

        // Ekstrak hasil balasan AI (Mengambil elemen prose terakhir)
        const responseText = await page.evaluate(() => {
            const paragraphs = Array.from(document.querySelectorAll('.prose, .markdown, p'));
            // Mengambil teks dari elemen chat/paragraf terakhir yang dirender
            if (paragraphs.length > 0) {
                return paragraphs[paragraphs.length - 1].innerText;
            }
            return null;
        });

        const result = {
            success: true,
            source: 'https://chateverywhere.app/id',
            timestamp: new Date().toISOString(),
            query: query,
            data: {
                ai_response: responseText || 'Tidak ada balasan yang terdeteksi. Mungkin CF memblokir atau query terlalu singkat.'
            }
        };

        // Output akhir berupa JSON terstruktur
        console.log('\n--- HASIL SCRAPE ---\n');
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('\n[ERROR] Gagal melakukan operasi scraping:');
        console.error(JSON.stringify({
            success: false,
            source: 'https://chateverywhere.app/id',
            error: error.message
        }, null, 2));
    } finally {
        await browser.close();
    }
}

// Ambil input query dari argumen node (misal: node chat.js "Halo apa kabar?")
const args = process.argv.slice(2);
const userQuery = args.join(' ');

if (!userQuery) {
    console.log('Gunakan format: node chateverywhere_bot.js "<query_kamu>"');
    process.exit(1);
}

chat(userQuery);
