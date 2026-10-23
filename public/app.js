/* ============================================================================
 * PHP THREAT RADAR — 3D WebGL Globe + Apache ECharts SOC Controller
 * ============================================================================ */

lucide.createIcons();

// Global Dashboard State
let isStreamPaused = false;
let isGlobeRotating = true;
let filterKeyword = '';
let allEvents = [];
let activeArcs = [];
let activeRings = [];
let honeypotPoints = [];
let yearlyHistoryData = [];

// Category tallies for dynamic charts
const categoryCounts = {
  RCE: 340,
  LFI: 215,
  EnvProbe: 280,
  Webshell: 190,
  Deserialization: 145,
  SQLi: 175,
  BruteForce: 160
};

// Target Stack tallies
const stackCounts = {
  'Core PHP-CGI': 310,
  'Laravel Framework': 275,
  'WordPress / Plugins': 340,
  'Composer / PHPUnit': 195,
  'Symfony / Monolog': 140,
  'Custom PHP / .env': 220
};

// Signature tallies
const signatureCounts = {
  'CVE-2024-4577 (PHP-CGI)': 412,
  '/.env Credential Probe': 368,
  'eval-stdin.php (PHPUnit)': 319,
  'php://filter Chain RCE': 274,
  '/_ignition/execute-solution': 241,
  '/xmlrpc.php Multicall': 198,
  'Alfa/WSO Webshell Drop': 176
};

// Time series buffers (last 25 ticks)
const velocityTimestamps = [];
const seriesRce = [];
const seriesLfiEnv = [];
const seriesWebshellSqli = [];

const nowBase = Date.now();
for (let i = 24; i >= 0; i--) {
  const t = new Date(nowBase - i * 1000).toLocaleTimeString('pt-BR', { hour12: false });
  velocityTimestamps.push(t);
  seriesRce.push(Math.floor(Math.random() * 18) + 14);
  seriesLfiEnv.push(Math.floor(Math.random() * 15) + 10);
  seriesWebshellSqli.push(Math.floor(Math.random() * 12) + 8);
}

// ============================================================================
// 1. INITIALIZE 3D INTERACTIVE CYBER THREAT GLOBE (Globe.gl / Three.js)
// ============================================================================
const globeContainer = document.getElementById('globe-container');
const world = Globe()(globeContainer)
  .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
  .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundColor('rgba(0,0,0,0)')
  .showAtmosphere(true)
  .atmosphereColor('#06b6d4')
  .atmosphereAltitude(0.18)
  .pointOfView({ lat: 22, lng: 10, altitude: 2.05 })
  // Ballistic Attack Arcs
  .arcsData([])
  .arcStartLat(d => d.srcLat)
  .arcStartLng(d => d.srcLng)
  .arcEndLat(d => d.destLat)
  .arcEndLng(d => d.destLng)
  .arcColor(d => [d.color, '#ffffff', d.color])
  .arcAltitudeAutoScale(0.42)
  .arcStroke(0.75)
  .arcDashLength(0.45)
  .arcDashGap(0.2)
  .arcDashInitialGap(() => Math.random())
  .arcDashAnimateTime(1350)
  .arcLabel(d => `
    <div style="background: rgba(3,7,18,0.92); border: 1px solid ${d.color}; padding: 8px 10px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #f8fafc;">
      <div style="color:${d.color}; font-weight:700;">[${d.cve}] ${d.attackName}</div>
      <div>Origem: ${d.sourceIp} (${d.originCountry})</div>
      <div>Alvo: Sensor ${d.destCity} (${d.destCountry})</div>
      <div style="color:#94a3b8; margin-top:3px;">URI: ${d.uri}</div>
    </div>
  `)
  // Shockwave Rings on Impact
  .ringsData([])
  .ringLat(d => d.lat)
  .ringLng(d => d.lng)
  .ringColor(d => t => `${d.color}${Math.round((1 - t) * 255).toString(16).padStart(2, '0')}`)
  .ringMaxRadius(5.5)
  .ringPropagationSpeed(2.6)
  .ringRepeatPeriod(700)
  // Honeypot Sensor Nodes
  .pointsData([])
  .pointLat(d => d.lat)
  .pointLng(d => d.lng)
  .pointColor(d => d.color || '#00ff9d')
  .pointAltitude(0.02)
  .pointRadius(0.55)
  .pointLabel(d => `
    <div style="background: rgba(3,7,18,0.92); border: 1px solid #00ff9d; padding: 6px 9px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #e2e8f0;">
      <strong style="color:#00ff9d;">● HONEYPOT PHP SENSOR</strong><br/>
      ${d.city}, ${d.country} (${d.asn})
    </div>
  `);

// Configure smooth auto-rotation
const controls = world.controls();
controls.autoRotate = true;
controls.autoRotateSpeed = 0.65;
controls.enableZoom = true;

function resizeGlobe() {
  if (!globeContainer) return;
  const rect = globeContainer.getBoundingClientRect();
  world.width(rect.width);
  world.height(rect.height);
}
window.addEventListener('resize', resizeGlobe);
setTimeout(resizeGlobe, 100);

// ============================================================================
// 2. INITIALIZE APACHE ECHARTS (5 HIGH-IMPACT SOC CHARTS)
// ============================================================================

// 2.1 OWASP PHP Attack Vector Radar Chart
const radarChart = echarts.init(document.getElementById('chart-radar'));
const radarOption = {
  backgroundColor: 'transparent',
  tooltip: {
    backgroundColor: 'rgba(9, 14, 28, 0.95)',
    borderColor: '#06b6d4',
    textStyle: { color: '#e2e8f0', fontFamily: 'JetBrains Mono', fontSize: 11 }
  },
  radar: {
    radius: '66%',
    center: ['50%', '52%'],
    splitNumber: 4,
    axisName: {
      color: '#94a3b8',
      fontFamily: 'JetBrains Mono',
      fontSize: 10
    },
    splitArea: {
      areaStyle: {
        color: ['rgba(6, 182, 212, 0.02)', 'rgba(6, 182, 212, 0.05)', 'rgba(6, 182, 212, 0.08)', 'rgba(255, 42, 95, 0.08)']
      }
    },
    axisLine: { lineStyle: { color: 'rgba(56, 189, 248, 0.25)' } },
    splitLine: { lineStyle: { color: 'rgba(56, 189, 248, 0.2)' } },
    indicator: [
      { name: 'RCE (CGI/Eval)', max: 600 },
      { name: '.env / Config', max: 600 },
      { name: 'LFI / Filter', max: 600 },
      { name: 'Webshells', max: 600 },
      { name: 'SQL Injection', max: 600 },
      { name: 'Unserialize()', max: 600 }
    ]
  },
  series: [
    {
      name: 'Vetores de Ataque PHP',
      type: 'radar',
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: '#ff2a5f' },
      lineStyle: { width: 2, color: '#ff2a5f', shadowColor: '#ff2a5f', shadowBlur: 10 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(255, 42, 95, 0.55)' },
          { offset: 1, color: 'rgba(6, 182, 212, 0.25)' }
        ])
      },
      data: [
        {
          value: [340, 280, 215, 190, 175, 145],
          name: 'Intensidade Atual'
        }
      ]
    }
  ]
};
radarChart.setOption(radarOption);

// 2.2 Top Exploited Signatures Horizontal Bar Chart
const topSigChart = echarts.init(document.getElementById('chart-top-signatures'));
function updateTopSignaturesChart() {
  const entries = Object.entries(signatureCounts).sort((a, b) => a[1] - b[1]);
  topSigChart.setOption({
    backgroundColor: 'transparent',
    grid: { top: 8, bottom: 18, left: 138, right: 38 },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.08)' } },
      axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono', fontSize: 9 }
    },
    yAxis: {
      type: 'category',
      data: entries.map(e => e[0]),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#cbd5e1', fontFamily: 'JetBrains Mono', fontSize: 10 }
    },
    series: [
      {
        type: 'bar',
        data: entries.map(e => e[1]),
        barWidth: 11,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#06b6d4' },
            { offset: 1, color: '#ff2a5f' }
          ])
        },
        label: {
          show: true,
          position: 'right',
          color: '#f8fafc',
          fontFamily: 'JetBrains Mono',
          fontSize: 10
        }
      }
    ]
  });
}
updateTopSignaturesChart();

// 2.3 Real-Time Attack Velocity Area Stream (1s ticks)
const velocityChart = echarts.init(document.getElementById('chart-velocity'));
function updateVelocityChart() {
  velocityChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(9, 14, 28, 0.95)',
      borderColor: '#38bdf8',
      textStyle: { color: '#e2e8f0', fontFamily: 'JetBrains Mono', fontSize: 11 }
    },
    legend: {
      top: 0,
      right: 10,
      textStyle: { color: '#94a3b8', fontFamily: 'JetBrains Mono', fontSize: 10 },
      itemWidth: 10,
      itemHeight: 6
    },
    grid: { top: 24, bottom: 20, left: 36, right: 12 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: velocityTimestamps,
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.2)' } },
      axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono', fontSize: 9 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } },
      axisLabel: { color: '#64748b', fontFamily: 'JetBrains Mono', fontSize: 9 }
    },
    series: [
      {
        name: 'RCE (Crit)',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: seriesRce,
        lineStyle: { width: 2, color: '#ff2a5f' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 42, 95, 0.45)' },
            { offset: 1, color: 'rgba(255, 42, 95, 0.0)' }
          ])
        }
      },
      {
        name: 'LFI & .env Probe',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: seriesLfiEnv,
        lineStyle: { width: 2, color: '#06b6d4' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(6, 182, 212, 0.35)' },
            { offset: 1, color: 'rgba(6, 182, 212, 0.0)' }
          ])
        }
      },
      {
        name: 'Webshells & SQLi',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: seriesWebshellSqli,
        lineStyle: { width: 2, color: '#a855f7' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(168, 85, 247, 0.3)' },
            { offset: 1, color: 'rgba(168, 85, 247, 0.0)' }
          ])
        }
      }
    ]
  });
}
updateVelocityChart();

// 2.4 PHP Ecosystem Nightingale Rose Chart
const ecosystemChart = echarts.init(document.getElementById('chart-ecosystem'));
function updateEcosystemChart() {
  const palette = ['#ff2a5f', '#06b6d4', '#a855f7', '#f59e0b', '#00ff9d', '#3b82f6'];
  const data = Object.entries(stackCounts).map(([name, value], idx) => ({
    name,
    value,
    itemStyle: { color: palette[idx % palette.length] }
  }));

  ecosystemChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(9, 14, 28, 0.95)',
      borderColor: '#a855f7',
      textStyle: { color: '#e2e8f0', fontFamily: 'JetBrains Mono', fontSize: 11 },
      formatter: '{b}: <b>{c}</b> ({d}%)'
    },
    series: [
      {
        name: 'Alvo PHP',
        type: 'pie',
        radius: ['22%', '74%'],
        center: ['50%', '52%'],
        roseType: 'area',
        itemStyle: {
          borderRadius: 5,
          borderColor: '#030712',
          borderWidth: 2
        },
        label: {
          color: '#cbd5e1',
          fontFamily: 'JetBrains Mono',
          fontSize: 10
        },
        data
      }
    ]
  });
}
updateEcosystemChart();

// 2.5 NEW: 365-Day Historical Timeline Chart (Last Year up to Today + Live Updating)
const annualTimelineChart = echarts.init(document.getElementById('chart-annual-timeline'));
let currentZoomStart = 0;

function initAnnualTimelineChart() {
  if (!yearlyHistoryData || yearlyHistoryData.length === 0) return;

  const dates = yearlyHistoryData.map(d => d.date);
  const rceData = yearlyHistoryData.map(d => d.rce);
  const lfiData = yearlyHistoryData.map(d => d.lfiEnv);
  const webData = yearlyHistoryData.map(d => d.webshellSqli);
  const totalData = yearlyHistoryData.map(d => d.total);

  const todayItem = yearlyHistoryData[yearlyHistoryData.length - 1];
  if (todayItem) {
    const kpiToday = document.getElementById('kpi-today-attacks');
    if (kpiToday) kpiToday.textContent = todayItem.total.toLocaleString('pt-BR');
  }

  annualTimelineChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', label: { backgroundColor: '#0f172a' } },
      backgroundColor: 'rgba(9, 14, 28, 0.96)',
      borderColor: '#06b6d4',
      textStyle: { color: '#f8fafc', fontFamily: 'JetBrains Mono', fontSize: 11 },
      formatter: (params) => {
        if (!params || !params.length) return '';
        const idx = params[0].dataIndex;
        const item = yearlyHistoryData[idx];
        const isLast = idx === yearlyHistoryData.length - 1;
        let html = `<div style="font-weight:700; color:${isLast ? '#00ff9d' : '#38bdf8'}; margin-bottom:4px;">
          📅 ${item.date} ${isLast ? '(HOJE — EM TEMPO REAL)' : ''}
        </div>`;
        if (item.milestone) {
          html += `<div style="color:#fbbf24; font-size:10px; margin-bottom:4px;">⚡ ${item.milestone}</div>`;
        }
        html += `<div style="margin-bottom:3px;">Total no Dia: <b>${item.total.toLocaleString('pt-BR')}</b> ataques</div>`;
        params.forEach(p => {
          if (p.seriesName !== 'Volume Total Diário') {
            html += `<div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}: <b>${Number(p.value).toLocaleString('pt-BR')}</b></div>`;
          }
        });
        return html;
      }
    },
    legend: {
      top: 0,
      left: 8,
      textStyle: { color: '#94a3b8', fontFamily: 'JetBrains Mono', fontSize: 10 },
      itemWidth: 12,
      itemHeight: 7
    },
    grid: { top: 34, bottom: 58, left: 52, right: 20 },
    dataZoom: [
      {
        type: 'inside',
        start: currentZoomStart,
        end: 100
      },
      {
        type: 'slider',
        start: currentZoomStart,
        end: 100,
        height: 20,
        bottom: 8,
        borderColor: 'rgba(56, 189, 248, 0.25)',
        fillerColor: 'rgba(6, 182, 212, 0.18)',
        handleStyle: { color: '#06b6d4', borderColor: '#38bdf8' },
        textStyle: { color: '#94a3b8', fontFamily: 'JetBrains Mono', fontSize: 9 }
      }
    ],
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.25)' } },
      axisLabel: { color: '#94a3b8', fontFamily: 'JetBrains Mono', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } },
      axisLabel: {
        color: '#64748b',
        fontFamily: 'JetBrains Mono',
        fontSize: 10,
        formatter: (val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
      }
    },
    series: [
      {
        name: 'RCE (PHP-CGI / Eval)',
        type: 'line',
        stack: 'attacks',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, color: '#ff2a5f' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 42, 95, 0.55)' },
            { offset: 1, color: 'rgba(255, 42, 95, 0.05)' }
          ])
        },
        data: rceData
      },
      {
        name: 'LFI & .env Probe',
        type: 'line',
        stack: 'attacks',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, color: '#06b6d4' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(6, 182, 212, 0.45)' },
            { offset: 1, color: 'rgba(6, 182, 212, 0.05)' }
          ])
        },
        data: lfiData
      },
      {
        name: 'Webshells & SQLi',
        type: 'line',
        stack: 'attacks',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, color: '#a855f7' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(168, 85, 247, 0.4)' },
            { offset: 1, color: 'rgba(168, 85, 247, 0.05)' }
          ])
        },
        data: webData
      },
      {
        name: 'Volume Total Diário',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: '#00ff9d', type: 'dashed' },
        itemStyle: { color: '#00ff9d' },
        data: totalData,
        markPoint: {
          symbol: 'pin',
          symbolSize: 42,
          itemStyle: { color: '#00ff9d' },
          label: {
            color: '#030712',
            fontFamily: 'JetBrains Mono',
            fontWeight: 'bold',
            fontSize: 9,
            formatter: 'HOJE'
          },
          data: [
            { name: 'Hoje Ao Vivo', coord: [dates.length - 1, totalData[totalData.length - 1]] }
          ]
        }
      }
    ]
  });
}

// Live incremental update of Today's data point in the 365-day chart
function updateTodayInAnnualTimeline(todayBucket) {
  if (!todayBucket || !yearlyHistoryData.length) return;
  const lastIdx = yearlyHistoryData.length - 1;
  yearlyHistoryData[lastIdx] = todayBucket;

  const kpiToday = document.getElementById('kpi-today-attacks');
  if (kpiToday) kpiToday.textContent = todayBucket.total.toLocaleString('pt-BR');

  const rceData = yearlyHistoryData.map(d => d.rce);
  const lfiData = yearlyHistoryData.map(d => d.lfiEnv);
  const webData = yearlyHistoryData.map(d => d.webshellSqli);
  const totalData = yearlyHistoryData.map(d => d.total);

  annualTimelineChart.setOption({
    series: [
      { data: rceData },
      { data: lfiData },
      { data: webData },
      {
        data: totalData,
        markPoint: {
          data: [
            { name: 'Hoje Ao Vivo', coord: [lastIdx, todayBucket.total] }
          ]
        }
      }
    ]
  });
}

// Timeline Range Quick Buttons (30d, 90d, 180d, 365d)
document.querySelectorAll('.btn-timeline-range').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.btn-timeline-range').forEach(b => {
      b.className = 'btn-timeline-range px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer transition';
    });
    e.currentTarget.className = 'btn-timeline-range px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold cursor-pointer transition';

    const days = Number(e.currentTarget.getAttribute('data-range')) || 365;
    currentZoomStart = Math.max(0, Math.round(((365 - days) / 365) * 100));
    annualTimelineChart.dispatchAction({
      type: 'dataZoom',
      start: currentZoomStart,
      end: 100
    });
  });
});

window.addEventListener('resize', () => {
  radarChart.resize();
  topSigChart.resize();
  velocityChart.resize();
  ecosystemChart.resize();
  annualTimelineChart.resize();
});

// ============================================================================
// 3. RENDER INTERNATIONAL CYBERSECURITY NEWS, NIST NVD CVE FEED & DPI TABLE
// ============================================================================
function renderInternationalNews(newsItems) {
  const container = document.getElementById('intl-news-list');
  if (!container || !Array.isArray(newsItems)) return;

  container.innerHTML = newsItems.map(item => `
    <a href="${item.url}" target="_blank" rel="noopener noreferrer" 
       class="block p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400/50 hover:bg-slate-900 transition group">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5 font-mono-code text-[10px]">
        <div class="flex items-center gap-1.5">
          <span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
            ${item.source}
          </span>
          <span class="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            ${item.region}
          </span>
          <span class="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
            ${item.category}
          </span>
        </div>
        <span class="text-emerald-400 font-semibold">${item.publishedAt} ↗</span>
      </div>
      <h3 class="text-xs md:text-sm font-bold text-white group-hover:text-cyan-300 transition leading-snug mb-1">
        ${item.title}
      </h3>
      <p class="text-[11px] text-slate-400 leading-relaxed">
        ${item.summary}
      </p>
    </a>
  `).join('');
}

function renderCveFeed(cves) {
  const container = document.getElementById('cve-feed-list');
  if (!container || !Array.isArray(cves)) return;

  container.innerHTML = cves.map(c => `
    <div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition">
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="font-mono-code font-bold text-amber-400 text-xs">${c.id}</span>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-mono-code text-slate-400">${c.published || ''}</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono-code font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            CVSS ${c.score}
          </span>
        </div>
      </div>
      <p class="text-[11px] text-slate-300 leading-snug">${c.description}</p>
    </div>
  `).join('');
}

function getSeverityBadge(severity, color) {
  const bg = severity === 'CRITICAL'
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    : severity === 'HIGH'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
  return `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold border ${bg}">${severity}</span>`;
}

function renderAttackTable() {
  const tbody = document.getElementById('live-attack-tbody');
  if (!tbody) return;

  const filtered = allEvents.filter(evt => {
    if (!filterKeyword) return true;
    const hay = `${evt.sourceIp} ${evt.originCountry} ${evt.cve} ${evt.attackName} ${evt.uri} ${evt.payload} ${evt.targetStack}`.toLowerCase();
    return hay.includes(filterKeyword.toLowerCase());
  }).slice(0, 28);

  tbody.innerHTML = filtered.map((evt, index) => {
    const timeStr = new Date(evt.timestamp).toLocaleTimeString('pt-BR', { hour12: false });
    const escapedPayload = evt.payload
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return `
      <tr class="${index === 0 ? 'flash-row' : ''} hover:bg-slate-900/70 transition">
        <td class="py-2 px-3 text-slate-400 whitespace-nowrap">${timeStr}</td>
        <td class="py-2 px-3 whitespace-nowrap">
          <div class="font-bold text-white">${evt.sourceIp}</div>
          <div class="text-[10px] text-slate-400">${evt.originAsn}</div>
        </td>
        <td class="py-2 px-3 whitespace-nowrap">
          <span class="text-rose-300 font-semibold">${evt.originCode} (${evt.originCity})</span>
          <span class="text-slate-500 mx-1">→</span>
          <span class="text-emerald-300 font-semibold">${evt.destCode} (${evt.destCity})</span>
        </td>
        <td class="py-2 px-3 whitespace-nowrap">
          <div class="flex items-center gap-1.5">
            ${getSeverityBadge(evt.severity, evt.color)}
            <span class="font-bold text-amber-300">${evt.cve}</span>
          </div>
          <div class="text-[10px] text-slate-400 truncate max-w-[210px]">${evt.attackName}</div>
        </td>
        <td class="py-2 px-3 whitespace-nowrap">
          <span class="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 text-[11px] border border-slate-700">
            ${evt.targetStack}
          </span>
        </td>
        <td class="py-2 px-3 max-w-[420px]">
          <div class="text-cyan-400 truncate"><span class="text-rose-400 font-bold">${evt.method}</span> ${evt.uri}</div>
          <div class="text-[10px] text-slate-400 truncate mt-0.5 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
            ${escapedPayload}
          </div>
        </td>
        <td class="py-2 px-3 text-right whitespace-nowrap">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${evt.isRealHoneypot ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400' : 'bg-slate-800 text-emerald-400 border border-emerald-500/30'}">
            ${evt.mitigation} (${evt.httpStatus})
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================================================
// 4. REAL-TIME TELEMETRY STREAM HANDLER (Server-Sent Events)
// ============================================================================
function processIncomingEvent(evt, totalCount, todayBucket) {
  // Update KPI total counter
  if (totalCount) {
    document.getElementById('kpi-total-attacks').textContent = totalCount.toLocaleString('pt-BR');
  }
  const epsVal = (36 + Math.random() * 19).toFixed(1);
  document.getElementById('kpi-eps').textContent = epsVal;

  // Update 365-day historical chart's TODAY data point live
  if (todayBucket) {
    updateTodayInAnnualTimeline(todayBucket);
  }

  // Update live globe ticker
  const ticker = document.getElementById('globe-live-ticker');
  if (ticker) {
    ticker.innerHTML = `[${evt.cve}] <b>${evt.sourceIp}</b> (${evt.originCountry}) → <b>${evt.destCity}</b> | <span class="text-rose-400">${evt.method} ${evt.uri.slice(0, 48)}</span>`;
  }

  // Add to 3D Globe Arcs & Shockwave Rings
  activeArcs.push(evt);
  if (activeArcs.length > 26) activeArcs.shift();
  world.arcsData([...activeArcs]);

  activeRings.push({ lat: evt.destLat, lng: evt.destLng, color: evt.color || '#ff2a5f' });
  activeRings.push({ lat: evt.srcLat, lng: evt.srcLng, color: '#06b6d4' });
  if (activeRings.length > 22) activeRings.splice(0, 2);
  world.ringsData([...activeRings]);

  // Update category & signature counters for ECharts
  if (categoryCounts[evt.category] !== undefined) {
    categoryCounts[evt.category] += Math.floor(Math.random() * 4) + 1;
  }

  // Update Radar Chart
  const maxVal = Math.max(...Object.values(categoryCounts)) + 80;
  radarChart.setOption({
    radar: {
      indicator: [
        { name: 'RCE (CGI/Eval)', max: maxVal },
        { name: '.env / Config', max: maxVal },
        { name: 'LFI / Filter', max: maxVal },
        { name: 'Webshells', max: maxVal },
        { name: 'SQL Injection', max: maxVal },
        { name: 'Unserialize()', max: maxVal }
      ]
    },
    series: [{
      data: [{
        value: [
          categoryCounts.RCE,
          categoryCounts.EnvProbe,
          categoryCounts.LFI,
          categoryCounts.Webshell,
          categoryCounts.SQLi,
          categoryCounts.Deserialization
        ],
        name: 'Intensidade Atual'
      }]
    }]
  });

  // Update Top Signatures bar
  const sigKeys = Object.keys(signatureCounts);
  const randomKey = sigKeys[Math.floor(Math.random() * sigKeys.length)];
  signatureCounts[randomKey] += Math.floor(Math.random() * 3) + 1;
  updateTopSignaturesChart();

  // Update Ecosystem Rose chart
  const stackKeys = Object.keys(stackCounts);
  const randStack = stackKeys[Math.floor(Math.random() * stackKeys.length)];
  stackCounts[randStack] += Math.floor(Math.random() * 3) + 1;
  updateEcosystemChart();

  // Update Velocity Stream
  const tNow = new Date().toLocaleTimeString('pt-BR', { hour12: false });
  velocityTimestamps.push(tNow);
  velocityTimestamps.shift();

  seriesRce.push(Math.floor(Math.random() * 18) + (evt.category === 'RCE' ? 24 : 12));
  seriesRce.shift();

  seriesLfiEnv.push(Math.floor(Math.random() * 14) + (evt.category === 'LFI' || evt.category === 'EnvProbe' ? 20 : 9));
  seriesLfiEnv.shift();

  seriesWebshellSqli.push(Math.floor(Math.random() * 12) + 8);
  seriesWebshellSqli.shift();

  updateVelocityChart();

  if (!isStreamPaused) {
    allEvents.unshift(evt);
    if (allEvents.length > 80) allEvents.pop();
    renderAttackTable();
  }
}

function connectTelemetryStream() {
  const es = new EventSource('/api/stream');

  es.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      if (data.type === 'init') {
        allEvents = data.recentEvents || [];
        honeypotPoints = (data.honeypots || []).map(h => ({ ...h, color: '#00ff9d' }));
        world.pointsData(honeypotPoints);

        activeArcs = allEvents.slice(0, 18);
        world.arcsData(activeArcs);

        if (data.totalCount) {
          document.getElementById('kpi-total-attacks').textContent = data.totalCount.toLocaleString('pt-BR');
        }
        if (data.cves) renderCveFeed(data.cves);
        if (data.yearlyHistory) {
          yearlyHistoryData = data.yearlyHistory;
          initAnnualTimelineChart();
        }
        if (data.internationalNews) {
          renderInternationalNews(data.internationalNews);
        }
        if (data.dataSourceStatus) {
          document.getElementById('status-sans').textContent = data.dataSourceStatus.sansIsc;
          document.getElementById('status-nvd').textContent = data.dataSourceStatus.nistNvd;
          if (data.dataSourceStatus.intlNews) {
            const el = document.getElementById('status-news');
            if (el) el.textContent = data.dataSourceStatus.intlNews;
          }
        }
        renderAttackTable();
      } else if (data.type === 'attack') {
        processIncomingEvent(data.event, data.totalCount, data.todayBucket);
      }
    } catch (err) {
      console.error('Stream parse error:', err);
    }
  };
}

connectTelemetryStream();

// ============================================================================
// 5. UI INTERACTIVE CONTROLS
// ============================================================================
document.getElementById('btn-toggle-rotate')?.addEventListener('click', () => {
  isGlobeRotating = !isGlobeRotating;
  controls.autoRotate = isGlobeRotating;
  document.getElementById('rotate-label').textContent = `Auto-Rotação: ${isGlobeRotating ? 'ON' : 'OFF'}`;
});

document.getElementById('btn-pause-stream')?.addEventListener('click', (e) => {
  isStreamPaused = !isStreamPaused;
  e.currentTarget.textContent = isStreamPaused ? 'Retomar Feed' : 'Pausar Feed';
  e.currentTarget.classList.toggle('text-amber-400', isStreamPaused);
});

document.getElementById('payload-filter')?.addEventListener('input', (e) => {
  filterKeyword = e.target.value || '';
  renderAttackTable();
});

// Trigger Live Sensor Webhook Simulation
document.getElementById('btn-simulate-attack')?.addEventListener('click', async () => {
  const customPayloads = [
    {
      sourceIp: '185.220.101.77',
      originCountry: 'Tor Exit Node',
      originCode: 'TOR',
      originCity: 'Frankfurt-Exit',
      originAsn: 'AS60729 Tor-Network',
      srcLat: 50.1109,
      srcLng: 8.6821,
      destCity: 'São Paulo',
      destCountry: 'Brazil',
      destCode: 'BR',
      destLat: -23.5505,
      destLng: -46.6333,
      category: 'RCE',
      severity: 'CRITICAL',
      cve: 'CVE-2024-4577',
      attackName: '[SENSOR AO VIVO] PHP-CGI Zero-Day RCE Disparo Manual',
      targetStack: 'PHP 8.3 CGI',
      method: 'POST',
      uri: '/cgi-bin/php-cgi.exe?%ADd+allow_url_include%3d1+%ADd+auto_prepend_file%3dphp://input',
      payload: '<?php echo "LIVE_HONEYPOT_TRAP"; system("id; uname -a"); ?>'
    },
    {
      sourceIp: '45.148.10.244',
      originCountry: 'Netherlands',
      originCode: 'NL',
      originCity: 'Amsterdam',
      originAsn: 'AS53667 PONYNET',
      srcLat: 52.3676,
      srcLng: 4.9041,
      destCity: 'Ashburn',
      destCountry: 'United States',
      destCode: 'US',
      destLat: 39.0438,
      destLng: -77.4874,
      category: 'RCE',
      severity: 'CRITICAL',
      cve: 'CVE-2021-3129',
      attackName: '[SENSOR AO VIVO] Laravel Ignition Phar Deserialization',
      targetStack: 'Laravel Framework',
      method: 'POST',
      uri: '/_ignition/execute-solution',
      payload: '{"solution":"Facade\\\\Ignition\\\\Solutions\\\\MakeViewVariableOptionalSolution","parameters":{"viewFile":"php://filter/convert.iconv.utf-8.utf-16be/resource=../.env"}}'
    }
  ];

  const chosen = customPayloads[Math.floor(Math.random() * customPayloads.length)];
  await fetch('/api/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chosen)
  });

  // Focus 3D Globe camera toward destination
  world.pointOfView({ lat: chosen.destLat, lng: chosen.destLng, altitude: 1.7 }, 900);
});

// Sensor Modal Controls
const modal = document.getElementById('sensor-modal');
document.getElementById('btn-open-sensor-modal')?.addEventListener('click', () => {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
});
document.getElementById('btn-close-sensor-modal')?.addEventListener('click', () => {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
});
