/*
* Judul : BMKG Data Scraper
* Base Url : https://data.bmkg.go.id
* Author : Vellzyy
* Channel Author : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
* Deskripsi : Scraper untuk mengambil data cuaca, udara, dan gempa dari BMKG.
* Note : Jangan hapus watermark
*/

const axios = require('axios');
const cheerio = require('cheerio');

// --- 1. REQUEST CONFIGURATION ---
// HTTP requests must have a timeout and appropriate headers (Rule 12).
const client = axios.create({
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    }
});

// --- 2. DATA CLEANING ---
// Normalize whitespace and null values (Rule 19).
function normalizeText(text) {
    return text?.replace(/\s+/g, ' ').trim() || null;
}

// --- 3. DATA EXTRACTION MODULES ---
// Menggunakan Data Source Priority: Official API > Static HTML (Rule 2).

/**
 * Scrape Data Gempabumi Terbaru
 * Target: JSON API BMKG
 */
async function getGempa() {
    try {
        const url = 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json';
        const response = await client.get(url);
        
        const gempa = response.data?.Infogempa?.gempa;
        
        // VALIDATION (Rule 21)
        if (!gempa) {
            throw new Error('Struktur data gempa tidak valid');
        }

        return {
            tanggal: gempa.Tanggal,
            jam: gempa.Jam,
            datetime: gempa.DateTime,
            coordinates: gempa.Coordinates,
            lintang: gempa.Lintang,
            bujur: gempa.Bujur,
            magnitude: parseFloat(gempa.Magnitude),
            kedalaman: gempa.Kedalaman,
            wilayah: normalizeText(gempa.Wilayah),
            potensi: normalizeText(gempa.Potensi),
            dirasakan: normalizeText(gempa.Dirasakan),
            shakemap: gempa.Shakemap ? `https://data.bmkg.go.id/DataMKG/TEWS/${gempa.Shakemap}` : null
        };
    } catch (error) {
        return { error: `Gagal mengambil data gempa: ${error.message}` };
    }
}

/**
 * Scrape Data Cuaca
 * Target: XML API BMKG
 * Menggunakan Cheerio untuk parsing XML (Rule 4)
 */
async function getCuaca() {
    try {
        // Contoh mengambil data cuaca spesifik Provinsi (misal: DKI Jakarta) untuk efisiensi
        const url = 'https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/DigitalForecast-DKIJakarta.xml';
        const response = await client.get(url);
        
        // Load XML
        const $ = cheerio.load(response.data, { xmlMode: true });
        const cuacaList = [];

        $('area').each((_, el) => {
            const area = $(el);
            const wilayah = area.attr('description');
            const domain = area.attr('domain');
            
            // Ambil parameter cuaca (id="weather")
            const prakiraan = [];
            area.find('parameter[id="weather"] timerange').each((_, tr) => {
                const trEl = $(tr);
                prakiraan.push({
                    datetime: trEl.attr('datetime'),
                    kode_cuaca: trEl.find('value').text()
                });
            });

            if (wilayah && prakiraan.length > 0) {
                cuacaList.push({
                    wilayah: normalizeText(wilayah),
                    domain: normalizeText(domain),
                    prakiraan
                });
            }
        });

        // VALIDATION (Rule 21)
        if (cuacaList.length === 0) {
            throw new Error('Data cuaca kosong');
        }

        return cuacaList;
    } catch (error) {
        return { error: `Gagal mengambil data cuaca: ${error.message}` };
    }
}

/**
 * Scrape Data Kualitas Udara (PM2.5)
 * Target: JSON Terbuka BMKG / Fallback info
 */
async function getUdara() {
    try {
        // Mencoba mengambil data JSON ISPU
        const url = 'https://data.bmkg.go.id/DataMKG/MEWS/Kualitas_Udara/ispu.json';
        const response = await client.get(url);
        
        if (response.data && Array.isArray(response.data)) {
            return response.data.map(item => ({
                stasiun: normalizeText(item.stasiun),
                waktu: item.waktu,
                pm10: item.pm10,
                pm25: item.pm25,
                kategori: normalizeText(item.kategori)
            }));
        } else {
             throw new Error('Format data tidak sesuai ekspektasi');
        }
    } catch (error) {
        // DEBUGGING & HTTP STATUS Handling (Rule 15 & 22)
        // Kadang endpoint kualitas udara berubah atau dilimitasi (403/404)
        return { 
            error: `Data udara tidak dapat diakses secara langsung via JSON (${error.message}).`,
            saran: 'Silakan cek langsung ke portal https://www.bmkg.go.id/kualitas-udara/informasi-partikulat-pm25.bmkg'
        };
    }
}

// --- 4. MAIN EXECUTION ---
async function scrapeBMKG() {
    // Jalankan semua modul secara paralel
    const [gempa, cuaca, udara] = await Promise.all([
        getGempa(),
        getCuaca(),
        getUdara()
    ]);

    // OUTPUT FORMAT (Rule 26)
    const result = {
        success: true,
        source: 'https://data.bmkg.go.id',
        timestamp: new Date().toISOString(),
        data: {
            gempa,
            cuaca,
            udara
        }
    };

    // Output JSON lengkap rapih
    console.log(JSON.stringify(result, null, 2));
}

scrapeBMKG();
