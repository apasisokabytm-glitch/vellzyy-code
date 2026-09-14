/**
 * Judul : Tempmail Plus Scraper
 * Base Url : https://tempmail.plus/en/#!
 * Author : Vellzyy
 * Deskripsi : Scraper generator email temporary dan auto polling inbox email via tempmail.plus
 * Channel Author : https://whatsapp.com/channel/0029VbD89K11CYoQIft8sQ3b
 * Channel ke dua : https://whatsapp.com/channel/0029VbDl6c1KmCPJErq9ox3F
 */

const axios = require('axios');

const BASE_URL = 'https://tempmail.plus';

const AVAILABLE_DOMAINS = [
  'mailto.plus',
  'fexpost.com',
  'fexbox.org',
  'mailbox.in.ua',
  'rover.info',
  'chitthi.in',
  'fextemp.com',
  'any.pink',
  'merepost.com'
];

function generateRandomName() {
  const len = 5 + Math.floor(Math.random() * 3);
  let word = '';
  const sets = ['aeouy', 'bcdfghkmnpqstvwxz'];
  let type = Math.floor(Math.random() * 2);
  let prob = type ? 5 : 7;

  for (let i = 0; i < len; i++) {
    word += sets[type].charAt(Math.floor(Math.random() * sets[type].length));
    if (Math.floor(Math.random() * prob) > 1) {
      type = 1 - type;
      prob = type ? 5 : 10;
    }
  }
  return word;
}

function generateEmail(username, domain = 'mailto.plus') {
  const selectedDomain = AVAILABLE_DOMAINS.includes(domain) ? domain : AVAILABLE_DOMAINS[0];
  const pre = username && /^[A-Za-z0-9]+([.\-_][A-Za-z0-9]+)*$/.test(username)
    ? username
    : generateRandomName();

  return {
    status: true,
    email: `${pre}@${selectedDomain}`,
    username: pre,
    domain: selectedDomain
  };
}

async function getInbox(email, options = {}) {
  if (!email || typeof email !== 'string') {
    throw new Error('Alamat email harus diisi.');
  }

  const response = await axios.get(`${BASE_URL}/api/mails`, {
    params: {
      email: email.trim(),
      limit: options.limit || 20,
      first_id: options.first_id,
      epin: options.epin || ''
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': `${BASE_URL}/`
    },
    timeout: 15000
  });

  const data = response.data;
  if (!data || data.result === false) {
    const errorMsg = data?.err?.msg || 'Gagal mengambil kotak masuk email.';
    throw new Error(errorMsg);
  }

  const mailList = Array.isArray(data.mail_list) ? data.mail_list.map(mail => ({
    mail_id: mail.mail_id,
    from: mail.from_name ? `${mail.from_name} <${mail.from_mail}>` : mail.from_mail,
    from_mail: mail.from_mail,
    from_name: mail.from_name || '',
    subject: mail.subject || '',
    time: mail.time,
    is_new: Boolean(mail.is_new),
    attachments_count: mail.attachment_count || 0
  })) : [];

  return {
    status: true,
    email: email.trim(),
    count: mailList.length,
    first_id: data.first_id || null,
    last_id: data.last_id || null,
    has_more: Boolean(data.more),
    messages: mailList
  };
}

async function getMail(email, mailId, epin = '') {
  if (!email || !mailId) {
    throw new Error('Parameter email dan mail_id harus diisi.');
  }

  const response = await axios.get(`${BASE_URL}/api/mails/${mailId}`, {
    params: {
      email: email.trim(),
      epin: epin || ''
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': `${BASE_URL}/`
    },
    timeout: 15000
  });

  const data = response.data;
  if (!data || data.result === false) {
    const errorMsg = data?.err?.msg || 'Gagal mengambil detail email.';
    throw new Error(errorMsg);
  }

  const attachments = Array.isArray(data.attachments) ? data.attachments.map(att => ({
    attachment_id: att.attachment_id,
    name: att.name,
    size: att.size,
    download_url: `${BASE_URL}/api/mails/${mailId}/attachments/${att.attachment_id}?email=${encodeURIComponent(email.trim())}&epin=${encodeURIComponent(epin || '')}`
  })) : [];

  return {
    status: true,
    mail_id: data.mail_id || mailId,
    from: data.from || data.from_mail,
    from_mail: data.from_mail,
    from_name: data.from_name || '',
    to: data.to,
    subject: data.subject || '',
    date: data.date,
    is_tls: Boolean(data.is_tls),
    text: data.text || '',
    html: data.html || '',
    attachments_count: attachments.length,
    attachments
  };
}

async function deleteMail(email, mailId, epin = '') {
  if (!email || !mailId) {
    throw new Error('Parameter email dan mail_id harus diisi.');
  }

  const response = await axios.delete(`${BASE_URL}/api/mails/${mailId}`, {
    params: {
      email: email.trim(),
      epin: epin || ''
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': `${BASE_URL}/`
    },
    timeout: 15000
  });

  return {
    status: true,
    result: Boolean(response.data?.result)
  };
}

async function destroyInbox(email, firstId = '', epin = '') {
  if (!email) {
    throw new Error('Parameter email harus diisi.');
  }

  const response = await axios.delete(`${BASE_URL}/api/mails/`, {
    params: {
      email: email.trim(),
      first_id: firstId || '',
      epin: epin || ''
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': `${BASE_URL}/`
    },
    timeout: 15000
  });

  return {
    status: true,
    result: Boolean(response.data?.result)
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForMail(email, options = {}) {
  if (!email || typeof email !== 'string') {
    throw new Error('Alamat email harus diisi.');
  }

  const timeoutMs = options.timeoutMs || 60000;
  const intervalMs = options.intervalMs || 3000;
  const autoRead = options.autoRead !== false;
  const epin = options.epin || '';

  const initialInbox = await getInbox(email, { epin });
  const knownIds = new Set((initialInbox.messages || []).map(m => String(m.mail_id)));

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    await delay(intervalMs);

    try {
      const currentInbox = await getInbox(email, { epin });
      const newMessages = (currentInbox.messages || []).filter(m => !knownIds.has(String(m.mail_id)));

      if (newMessages.length > 0) {
        let fullMails = newMessages;

        if (autoRead) {
          fullMails = await Promise.all(
            newMessages.map(async (msg) => {
              try {
                return await getMail(email, msg.mail_id, epin);
              } catch {
                return msg;
              }
            })
          );
        }

        return {
          status: true,
          email: email.trim(),
          new_count: fullMails.length,
          messages: fullMails,
          elapsed_sec: Number(((Date.now() - startTime) / 1000).toFixed(1))
        };
      }
    } catch {}
  }

  return {
    status: false,
    email: email.trim(),
    timeout: true,
    message: `Tidak ada email baru masuk setelah ${timeoutMs / 1000} detik.`,
    elapsed_sec: Number(((Date.now() - startTime) / 1000).toFixed(1))
  };
}

const scrape = {
  generateEmail,
  getInbox,
  getMail,
  deleteMail,
  destroyInbox,
  waitForMail,
  AVAILABLE_DOMAINS
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'auto';

  (async () => {
    try {
      switch (command.toLowerCase()) {
        case 'generate': {
          const customName = args[1];
          const customDomain = args[2];
          const result = generateEmail(customName, customDomain);
          console.log(JSON.stringify(result, null, 2));
          break;
        }

        case 'inbox': {
          const targetEmail = args[1];
          if (!targetEmail) {
            console.log('Penggunaan: node tempmail-plus.js inbox <email>');
            process.exit(1);
          }
          const result = await getInbox(targetEmail);
          console.log(JSON.stringify(result, null, 2));
          break;
        }

        case 'read': {
          const targetEmail = args[1];
          const mailId = args[2];
          if (!targetEmail || !mailId) {
            console.log('Penggunaan: node tempmail-plus.js read <email> <mail_id>');
            process.exit(1);
          }
          const result = await getMail(targetEmail, mailId);
          console.log(JSON.stringify(result, null, 2));
          break;
        }

        case 'poll': {
          const targetEmail = args[1];
          if (!targetEmail) {
            console.log('Penggunaan: node tempmail-plus.js poll <email> [--timeout=60]');
            process.exit(1);
          }
          const timeoutArg = args.find(a => a.startsWith('--timeout='));
          const timeoutSec = timeoutArg ? parseInt(timeoutArg.split('=')[1], 10) : 30;

          console.log(`Menunggu email masuk ke ${targetEmail} (timeout: ${timeoutSec}s) ...\n`);
          const result = await waitForMail(targetEmail, { timeoutMs: timeoutSec * 1000 });
          console.log(JSON.stringify(result, null, 2));
          break;
        }

        case 'auto':
        default: {
          const newAccount = generateEmail();
          console.log('=== EMAIL TEMPORARY DIGENERATE ===');
          console.log(JSON.stringify(newAccount, null, 2));

          console.log(`\nMenunggu email masuk ke ${newAccount.email} (timeout: 20s) ...`);
          const pollResult = await waitForMail(newAccount.email, { timeoutMs: 20000 });
          console.log(JSON.stringify(pollResult, null, 2));
          break;
        }
      }
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = scrape;
