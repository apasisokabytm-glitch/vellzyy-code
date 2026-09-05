/**
 * Judul : Alight Motion Auto Verifier
 * Base Url : https://generator.email/ & https://am.neonode.my.id/
 * Author : Vellzyy
 * Deskripsi : Otomatisasi pendaftaran dan verifikasi akun Alight Motion Pro menggunakan email generator dan verifikasi magic link otomatis
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');
const cheerio = require('cheerio');
const readline = require('readline');

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache'
};

const API_CONFIG = {
  sendLinkUrl: 'https://am.neonode.my.id/api/send-link',
  verifyLinkUrl: 'https://am.neonode.my.id/api/verify-link',
  generatorEmailUrl: 'https://generator.email/'
};

async function generateEmail(customDomain = '', customUsername = '') {
  let targetUrl = API_CONFIG.generatorEmailUrl;
  const headers = { ...DEFAULT_HEADERS };

  if (customDomain && customUsername) {
    targetUrl = `${API_CONFIG.generatorEmailUrl}${customDomain}/${customUsername}`;
    headers['Cookie'] = `inbox_ctx=${encodeURIComponent(customDomain)}%2F${encodeURIComponent(customUsername)}%2F`;
  }

  const response = await axios.get(targetUrl, { headers, timeout: 15000 });
  const html = response.data;
  const setCookies = response.headers['set-cookie'] || [];

  let domain = customDomain;
  let username = customUsername;

  const ctxCookie = setCookies.find(c => c.includes('inbox_ctx='));
  if (ctxCookie) {
    const match = ctxCookie.match(/inbox_ctx=([^%]+)%2F([^%]+)%2F/);
    if (match) {
      domain = domain || decodeURIComponent(match[1]);
      username = username || decodeURIComponent(match[2]);
    }
  }

  const $ = cheerio.load(html);

  if (!username) username = $('#userName').val() || $('input[name=userName]').val();
  if (!domain) domain = $('#domainName2').val() || $('input[name=domainName]').val();

  let email = $('#email_ch_text').text().trim();
  if (!email && username && domain) {
    email = `${username}@${domain}`;
  }

  if (!email) {
    throw new Error('Gagal mendapatkan alamat email dari generator.email');
  }

  const inboxUrl = `${API_CONFIG.generatorEmailUrl}${domain}/${username}`;

  return {
    email,
    username,
    domain,
    inboxUrl
  };
}

async function sendMagicLink(email) {
  const response = await axios.post(
    API_CONFIG.sendLinkUrl,
    { email },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    }
  );

  if (!response.data || response.data.success === false) {
    throw new Error(response.data?.message || 'Gagal mengirim magic link');
  }

  return response.data;
}

async function pollMagicLink(domain, username, options = {}) {
  const intervalMs = options.intervalMs || 3000;
  const maxAttempts = options.maxAttempts || 12;
  const inboxUrl = `${API_CONFIG.generatorEmailUrl}${domain}/${username}`;
  const cookieValue = `inbox_ctx=${encodeURIComponent(domain)}%2F${encodeURIComponent(username)}%2F`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(inboxUrl, {
        headers: {
          ...DEFAULT_HEADERS,
          'Cookie': cookieValue
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      let magicLink = null;

      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && (href.includes('alight-creative.firebaseapp.com/__/auth/links') || href.includes('alightcreative.com/auth_action'))) {
          magicLink = href;
          return false;
        }
      });

      if (!magicLink) {
        const rawMatch = response.data.match(/https?:\/\/(?:alight-creative\.firebaseapp\.com\/__\/auth\/links|alightcreative\.com\/auth_action\/)[^\s"'<>]+/i);
        if (rawMatch) {
          magicLink = rawMatch[0].replace(/&amp;/g, '&');
        }
      }

      if (magicLink) {
        return magicLink;
      }
    } catch (err) {
      if (attempt === maxAttempts) {
        throw new Error(`Gagal membaca inbox: ${err.message}`);
      }
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(`Magic link tidak diterima di inbox setelah ${maxAttempts * (intervalMs / 1000)} detik`);
}

async function verifyMagicLink(email, magicLink) {
  const response = await axios.post(
    API_CONFIG.verifyLinkUrl,
    { email, magicLink },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000
    }
  );

  if (!response.data || response.data.success === false) {
    throw new Error(response.data?.message || 'Gagal memverifikasi magic link');
  }

  return response.data;
}

async function processSingleAccount(currentIndex, totalCount) {
  console.log(`\n======================================================`);
  console.log(`[*] Memproses Akun [${currentIndex}/${totalCount}]`);
  console.log(`======================================================`);

  console.log(`[1/4] Membuat email sementara...`);
  const emailData = await generateEmail();
  console.log(`  -> Email: ${emailData.email}`);
  console.log(`  -> URL Generator: ${emailData.inboxUrl}`);

  console.log(`[2/4] Mengirim magic link ke server Alight Motion...`);
  const sendRes = await sendMagicLink(emailData.email);
  console.log(`  -> Status: ${sendRes.message || 'Link berhasil dikirim'}`);

  console.log(`[3/4] Menunggu email masuk & mengekstrak magic link...`);
  const magicLink = await pollMagicLink(emailData.domain, emailData.username);
  console.log(`  -> Magic Link didapatkan.`);

  console.log(`[4/4] Memverifikasi akun ke Alight Motion...`);
  const verifyRes = await verifyMagicLink(emailData.email, magicLink);
  console.log(`  -> ${verifyRes.message || 'Verifikasi Berhasil'}`);

  const details = verifyRes.data || {};

  return {
    success: true,
    email: emailData.email,
    inbox_url: emailData.inboxUrl,
    magic_link: magicLink,
    account_info: {
      uid: details.uid || null,
      status: details.status || 'ACTIVE',
      membership_status: details.membershipStatus || 'PREMIUM_ACTIVE',
      plan_name: details.planName || 'Alight Motion Pro / Member',
      subscription_type: details.subscriptionType || 'Yearly VIP License',
      order_id: details.orderId || null,
      valid_until: details.validUntil || null,
      activated_at: details.activatedAt || null
    },
    features: details.features || [],
    tokens: {
      token_type: details.tokenType || 'Bearer',
      id_token: details.idToken || details.tokens?.idToken || null,
      refresh_token: details.refreshToken || details.tokens?.refreshToken || null,
      expires_at: details.expiresAt || null
    }
  };
}

async function runBatch(totalCount) {
  const count = parseInt(totalCount, 10);
  if (isNaN(count) || count < 1) {
    throw new Error('Jumlah akun harus berupa bilangan bulat positif minimal 1.');
  }

  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (let i = 1; i <= count; i++) {
    try {
      const result = await processSingleAccount(i, count);
      results.push(result);
      successCount++;
    } catch (err) {
      console.error(`[-] Gagal memproses akun #${i}: ${err.message}`);
      results.push({
        success: false,
        index: i,
        error: err.message
      });
      failedCount++;
    }

    if (i < count) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const finalOutput = {
    status: successCount > 0,
    summary: {
      total_diminta: count,
      total_berhasil: successCount,
      total_gagal: failedCount
    },
    data: results
  };

  return finalOutput;
}

function askQuestion(promptText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(promptText, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let totalInput = args[0];

  if (!totalInput) {
    totalInput = await askQuestion('Masukkan jumlah akun yang ingin dibuat: ');
  }

  const total = parseInt(totalInput, 10) || 1;

  console.log(`\n>>> MEMULAI PEMBUATAN & VERIFIKASI ${total} AKUN ALIGHT MOTION <<<\n`);
  const finalResult = await runBatch(total);

  console.log('\n======================================================');
  console.log('                 HASIL LENGKAP (JSON)                 ');
  console.log('======================================================\n');
  console.log(JSON.stringify(finalResult, null, 2));

  return finalResult;
}

if (require.main === module) {
  main().catch(err => {
    console.error('\nFatal Error:', err.message);
    process.exit(1);
  });
}

module.exports = {
  generateEmail,
  sendMagicLink,
  pollMagicLink,
  verifyMagicLink,
  processSingleAccount,
  runBatch
};
