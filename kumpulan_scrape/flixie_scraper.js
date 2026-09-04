/*
* Judul : Flixie Scraper
* Base Url : https://flixie.watch/
* Author : Vellzyy
* Channel Author : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
* Deskripsi : Scraper Flixie menggunakan internal API TMDB yang digunakan oleh Flixie untuk melewati pemblokiran Ad-Block Popup & Cloudflare.
* Note : Jangan hapus watermark
*/

const axios = require('axios');

// Flixie Internal API Key (Berasal dari intercept jaringan)
const API_KEY = '4a1e36ee37d8dbb5691e45ecf61c7dcb';

async function fetchHome() {
    try {
        const url = `https://api.themoviedb.org/3/trending/movie/day?api_key=${API_KEY}&language=en-US`;
        const { data } = await axios.get(url);
        
        const results = data.results.map(item => ({
            id: item.id,
            title: item.title || item.name,
            overview: item.overview,
            release_date: item.release_date || item.first_air_date,
            rating: item.vote_average,
            poster: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
            flixie_url: `https://flixie.watch/title/${(item.title || item.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-m${item.id}`
        }));

        console.log(JSON.stringify({
            success: true,
            type: 'home',
            source: 'https://flixie.watch/',
            count: results.length,
            data: results
        }, null, 2));

    } catch (err) {
        handleError(err);
    }
}

async function fetchSearch(query) {
    try {
        const url = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1&api_key=${API_KEY}`;
        const { data } = await axios.get(url);
        
        const results = data.results.filter(i => i.media_type === 'movie' || i.media_type === 'tv').map(item => ({
            id: item.id,
            type: item.media_type,
            title: item.title || item.name,
            overview: item.overview,
            release_date: item.release_date || item.first_air_date,
            poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            flixie_url: `https://flixie.watch/title/${(item.title || item.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${item.media_type === 'movie' ? 'm' : 't'}${item.id}`
        }));

        console.log(JSON.stringify({
            success: true,
            type: 'search',
            query: query,
            source: `https://flixie.watch/search?q=${encodeURIComponent(query)}`,
            count: results.length,
            data: results
        }, null, 2));

    } catch (err) {
        handleError(err);
    }
}

async function fetchDetail(flixieUrl) {
    try {
        // Parse format url: https://flixie.watch/title/the-runner-m1386315
        const match = flixieUrl.match(/-([mt])(\d+)$/);
        if (!match) throw new Error("Format URL tidak valid. Harus mengandung -m[ID] atau -t[ID]");
        
        const type = match[1] === 'm' ? 'movie' : 'tv';
        const id = match[2];
        
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${API_KEY}&language=en-US&append_to_response=credits,videos`;
        const { data } = await axios.get(url);

        // Typical streaming fallback used by Flixie clones
        const streamUrl = type === 'movie' 
            ? `https://vidsrc.to/embed/movie/${id}`
            : `https://vidsrc.to/embed/tv/${id}`;

        const result = {
            id: data.id,
            type: type,
            title: data.title || data.name,
            tagline: data.tagline,
            overview: data.overview,
            genres: data.genres.map(g => g.name),
            release_date: data.release_date || data.first_air_date,
            rating: data.vote_average,
            poster: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
            backdrop: `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`,
            stream_url: streamUrl,
            trailer: data.videos?.results?.find(v => v.type === 'Trailer')?.key 
                ? `https://www.youtube.com/watch?v=${data.videos.results.find(v => v.type === 'Trailer').key}` 
                : null
        };

        console.log(JSON.stringify({
            success: true,
            type: 'detail',
            source: flixieUrl,
            data: result
        }, null, 2));

    } catch (err) {
        handleError(err);
    }
}

function handleError(err) {
    console.log(JSON.stringify({
        success: false,
        error: err.response?.data?.status_message || err.message
    }, null, 2));
}

// Arg parsing
const args = process.argv.slice(2);
const command = args[0];
const param = args.slice(1).join(' ');

if (command === '--home') {
    fetchHome();
} else if (command === '--search' && param) {
    // Bisa --search <url> atau --search <query>
    const query = param.includes('search?q=') ? new URL(param).searchParams.get('q') : param;
    fetchSearch(query);
} else if (command === '--detail' && param) {
    fetchDetail(param);
} else {
    console.log("Usage:");
    console.log("node flixie_scraper.js --home");
    console.log("node flixie_scraper.js --search <query_atau_url>");
    console.log("node flixie_scraper.js --detail <url_detail>");
}
