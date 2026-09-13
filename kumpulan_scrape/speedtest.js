/**
 * Judul : Speedtest.net Speed Checker & Scraper
 * Base Url : https://www.speedtest.net
 * Author : Vellzyy
 * Deskripsi : Scraper dan network benchmark client resmi Ookla Speedtest.net untuk mengukur ping, jitter, kecepatan download, upload, serta mendaftarkan hasil uji kecepatan secara lengkap
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const axios = require('axios');

const SPEEDTEST_CONFIG_URL = 'https://www.speedtest.net/speedtest-config.php';
const SPEEDTEST_SERVERS_URL = 'https://www.speedtest.net/api/js/servers?engine=js';
const SPEEDTEST_RESULTS_URL = 'https://www.speedtest.net/api/results.php';
const HASH_SECRET = '817d699764d33f89c';

async function fetchClientConfig() {
  const response = await axios.get(SPEEDTEST_CONFIG_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://www.speedtest.net/'
    },
    timeout: 10000
  });

  const xml = response.data;
  const match = xml.match(/<client ip="([^"]*)" lat="([^"]*)" lon="([^"]*)" isp="([^"]*)"(?: isprating="([^"]*)")?(?: rating="([^"]*)")?(?: ispdlavg="([^"]*)")?(?: ispulavg="([^"]*)")?(?: loggedin="([^"]*)")? country="([^"]*)"/);

  if (!match) {
    throw new Error('Gagal mengambil informasi IP dan ISP dari speedtest.net');
  }

  return {
    ip: match[1],
    lat: parseFloat(match[2]),
    lon: parseFloat(match[3]),
    isp: match[4],
    country: match[10]
  };
}

async function fetchServersList() {
  const response = await axios.get(SPEEDTEST_SERVERS_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://www.speedtest.net/'
    },
    timeout: 10000
  });

  return Array.isArray(response.data) ? response.data : [];
}

function resolveServerBaseUrl(server) {
  if (server.https_functional === 1 && server.host) {
    return `https://${server.host}/speedtest`;
  }
  if (server.host) {
    return `http://${server.host}/speedtest`;
  }
  return server.url.replace(/\/speedtest\/upload\.php.*/, '') + '/speedtest';
}

async function measurePing(serverBaseUrl, sampleCount = 5) {
  const latencySamples = [];
  const latencyUrl = `${serverBaseUrl}/latency.txt`;

  for (let i = 0; i < sampleCount; i++) {
    const start = Date.now();
    try {
      await axios.get(`${latencyUrl}?x=${Date.now()}_${i}`, {
        timeout: 3000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      latencySamples.push(Date.now() - start);
    } catch {}
  }

  if (latencySamples.length === 0) {
    return { latency: 999, min: 999, jitter: 0, samples: [] };
  }

  const minLatency = Math.min(...latencySamples);
  const avgLatency = Math.round(latencySamples.reduce((sum, val) => sum + val, 0) / latencySamples.length);

  let jitterSum = 0;
  for (let i = 1; i < latencySamples.length; i++) {
    jitterSum += Math.abs(latencySamples[i] - latencySamples[i - 1]);
  }
  const jitter = latencySamples.length > 1 ? Math.round(jitterSum / (latencySamples.length - 1)) : 0;

  return {
    latency: avgLatency,
    min: minLatency,
    jitter,
    samples: latencySamples
  };
}

function measureDownloadSpeed(serverBaseUrl, durationMs = 6000, concurrency = 3) {
  return new Promise((resolve) => {
    const chunkPaths = [
      '/random2000x2000.jpg',
      '/random2500x2500.jpg',
      '/random3000x3000.jpg'
    ];

    let totalBytes = 0;
    const startTime = Date.now();
    let isRunning = true;

    const timer = setTimeout(() => {
      isRunning = false;
    }, durationMs);

    let activeWorkers = 0;

    function executeDownload() {
      if (!isRunning) {
        if (activeWorkers === 0) complete();
        return;
      }

      activeWorkers++;
      const randomPath = chunkPaths[Math.floor(Math.random() * chunkPaths.length)];
      const targetUrl = `${serverBaseUrl}${randomPath}?x=${Date.now()}_${Math.random()}`;

      const urlObj = new URL(targetUrl);
      const client = urlObj.protocol === 'https:' ? https : http;

      const req = client.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      }, (res) => {
        res.on('data', (chunk) => {
          totalBytes += chunk.length;
        });
        res.on('end', () => {
          activeWorkers--;
          executeDownload();
        });
        res.on('error', () => {
          activeWorkers--;
          executeDownload();
        });
      });

      req.on('error', () => {
        activeWorkers--;
        if (isRunning) executeDownload();
      });

      req.setTimeout(4000, () => {
        req.destroy();
      });
    }

    function complete() {
      clearTimeout(timer);
      const elapsedSec = (Date.now() - startTime) / 1000;
      const bytesPerSec = Math.round(totalBytes / Math.max(0.1, elapsedSec));
      const mbps = Number(((bytesPerSec * 8) / 1000000).toFixed(2));

      resolve({
        totalBytes,
        elapsedSec: Number(elapsedSec.toFixed(2)),
        bandwidth: bytesPerSec,
        mbps,
        formatted: `${mbps} Mbps`
      });
    }

    for (let i = 0; i < concurrency; i++) {
      executeDownload();
    }
  });
}

function measureUploadSpeed(serverBaseUrl, durationMs = 6000, concurrency = 2) {
  return new Promise((resolve) => {
    const uploadUrl = `${serverBaseUrl}/upload.php`;
    const chunkSize = 250 * 1024;
    const uploadPayload = 'content1=' + 'x'.repeat(chunkSize);
    const payloadLength = Buffer.byteLength(uploadPayload);

    let totalBytes = 0;
    const startTime = Date.now();
    let isRunning = true;

    const timer = setTimeout(() => {
      isRunning = false;
    }, durationMs);

    let activeWorkers = 0;

    function executeUpload() {
      if (!isRunning) {
        if (activeWorkers === 0) complete();
        return;
      }

      activeWorkers++;
      const urlObj = new URL(uploadUrl);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.request({
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': payloadLength,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      }, (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          totalBytes += payloadLength;
          activeWorkers--;
          executeUpload();
        });
        res.on('error', () => {
          activeWorkers--;
          executeUpload();
        });
      });

      req.on('error', () => {
        activeWorkers--;
        if (isRunning) executeUpload();
      });

      req.setTimeout(4000, () => {
        req.destroy();
      });

      req.write(uploadPayload);
      req.end();
    }

    function complete() {
      clearTimeout(timer);
      const elapsedSec = (Date.now() - startTime) / 1000;
      const bytesPerSec = Math.round(totalBytes / Math.max(0.1, elapsedSec));
      const mbps = Number(((bytesPerSec * 8) / 1000000).toFixed(2));

      resolve({
        totalBytes,
        elapsedSec: Number(elapsedSec.toFixed(2)),
        bandwidth: bytesPerSec,
        mbps,
        formatted: `${mbps} Mbps`
      });
    }

    for (let i = 0; i < concurrency; i++) {
      executeUpload();
    }
  });
}

async function registerSpeedtestResult(serverId, pingMs, downloadMbps, uploadMbps) {
  const pingInt = Math.round(pingMs);
  const downloadKbps = Math.round((downloadMbps * 1000000) / 1000);
  const uploadKbps = Math.round((uploadMbps * 1000000) / 1000);

  const hashString = [pingInt, uploadKbps, downloadKbps, HASH_SECRET].join('-');
  const hash = crypto.createHash('md5').update(hashString).digest('hex');

  const payload = {
    serverid: String(serverId),
    ping: pingInt,
    upload: uploadKbps,
    download: downloadKbps,
    hash
  };

  try {
    const res = await axios.post(SPEEDTEST_RESULTS_URL, payload, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.speedtest.net/',
        'Origin': 'https://www.speedtest.net',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (res.data?.resultid) {
      return {
        id: String(res.data.resultid),
        url: `https://www.speedtest.net/result/${res.data.resultid}`,
        image: `https://www.speedtest.net/result/${res.data.resultid}.png`
      };
    }
  } catch {}

  return null;
}

async function runSpeedtest(options = {}) {
  const duration = options.duration || 5000;

  const client = await fetchClientConfig();
  const servers = await fetchServersList();

  if (servers.length === 0) {
    throw new Error('Tidak ada server speedtest yang tersedia.');
  }

  const selectedServer = options.serverId
    ? (servers.find(s => String(s.id) === String(options.serverId)) || servers[0])
    : servers[0];

  const serverBaseUrl = resolveServerBaseUrl(selectedServer);

  const pingResult = await measurePing(serverBaseUrl, options.pingSamples || 5);
  const downloadResult = await measureDownloadSpeed(serverBaseUrl, duration);
  const uploadResult = await measureUploadSpeed(serverBaseUrl, duration);

  const shareResult = await registerSpeedtestResult(
    selectedServer.id,
    pingResult.latency,
    downloadResult.mbps,
    uploadResult.mbps
  );

  return {
    status: true,
    client: {
      ip: client.ip,
      isp: client.isp,
      country: client.country,
      lat: client.lat,
      lon: client.lon
    },
    server: {
      id: String(selectedServer.id),
      name: selectedServer.name,
      sponsor: selectedServer.sponsor,
      country: selectedServer.country,
      distance_km: selectedServer.distance,
      host: selectedServer.host
    },
    ping: {
      latency_ms: pingResult.latency,
      min_ms: pingResult.min,
      jitter_ms: pingResult.jitter,
      samples: pingResult.samples
    },
    download: {
      bandwidth: downloadResult.bandwidth,
      mbps: downloadResult.mbps,
      formatted: downloadResult.formatted
    },
    upload: {
      bandwidth: uploadResult.bandwidth,
      mbps: uploadResult.mbps,
      formatted: uploadResult.formatted
    },
    share: shareResult,
    timestamp: new Date().toISOString()
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const durationArg = args.find(a => a.startsWith('--duration='));
  const duration = durationArg ? parseInt(durationArg.split('=')[1], 10) * 1000 : 5000;

  (async () => {
    try {
      console.log('Memulai Ookla Speedtest.net benchmark ...');
      const result = await runSpeedtest({ duration });
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  })();
}

const scrape = runSpeedtest;
scrape.runSpeedtest = runSpeedtest;
scrape.fetchClientConfig = fetchClientConfig;
scrape.fetchServersList = fetchServersList;

module.exports = scrape;
