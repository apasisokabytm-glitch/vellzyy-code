/*
* Judul : ChatEverywhere Scraper
* Base Url : https://chateverywhere.app/id
* Author : Vellzyy
* Channel Author : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
* Deskripsi : Scraper dasar untuk mengambil informasi aplikasi ChatEverywhere menggunakan Playwright karena proteksi Cloudflare.
* Note : Jangan hapus watermark
*/

const { chromium } = require('playwright');

async function scrapeChatEverywhere() {
    console.log('Memulai browser...');
    const browser = await chromium.launch({ headless: true });
    
    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();
        
        console.log('Navigasi ke https://chateverywhere.app/id ...');
        // Rule 6: Set navigation timeout
        await page.goto('https://chateverywhere.app/id', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Tunggu sebentar untuk bypass Cloudflare (jika memungkinkan secara otomatis) atau render JS
        await page.waitForTimeout(5000);
        
        // Ekstraksi data dasar (Rule 8: Extract only required/available fields)
        const title = await page.title();
        const description = await page.evaluate(() => {
            const meta = document.querySelector('meta[name="description"]');
            return meta ? meta.content : null;
        });

        // Mencari elemen teks utama atau prompt contoh di halaman utama
        const mainHeading = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            return h1 ? h1.innerText.trim() : null;
        });

        // Rule 26: Output harus berformat JSON terstruktur
        const result = {
            success: true,
            source: 'https://chateverywhere.app/id',
            timestamp: new Date().toISOString(),
            data: {
                title: title,
                description: description,
                mainHeading: mainHeading
            }
        };

        // Rule 21: Validation
        if (!title || title.toLowerCase().includes('cloudflare') || title.toLowerCase().includes('just a moment')) {
            result.success = false;
            result.error = 'Terhalang proteksi Cloudflare (WAF/Anti-Bot). Tidak dapat mengambil data murni.';
            result.data = null;
        }

        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error(JSON.stringify({
            success: false,
            source: 'https://chateverywhere.app/id',
            error: error.message
        }, null, 2));
    } finally {
        await browser.close();
    }
}

scrapeChatEverywhere();
