# 🛡️ PHP Threat Radar — Global Cyber Threat Intelligence, AI Attribution & 3D Telemetry SOC

[![Live Demo - GitHub Pages](https://img.shields.io/badge/LIVE_DEMO-GitHub_Pages-00ff9d?style=for-the-badge&logo=github)](https://willyelias.github.io/php-threat-radar/)
[![Runtime](https://img.shields.io/badge/Engine-WebGL_Three.js_%7C_Apache_ECharts_5-06b6d4?style=for-the-badge)](https://willyelias.github.io/php-threat-radar/)
[![Focus](https://img.shields.io/badge/Scope-PHP_CGI_%7C_Laravel_%7C_WordPress_%7C_Symfony-a855f7?style=for-the-badge)](https://github.com/willyelias/php-threat-radar)

> **Acesse o Painel Online (GitHub Pages):** **[https://willyelias.github.io/php-threat-radar/](https://willyelias.github.io/php-threat-radar/)**

---

## 📐 Visão Geral da Arquitetura

O **PHP Threat Radar** é uma plataforma de **Threat Intelligence e Visualização Balística em Tempo Real (SOC)** projetada para monitorar, classificar e inspecionar vetores de exploração ativa contra o ecossistema **PHP** em escala global.

A aplicação opera em arquitetura **Dual-Mode (Hybrid SSE / Edge Client Telemetry)**:
1. **Modo Full-Stack SOC (`server.js` via Node.js/Express):** Utiliza **Server-Sent Events (SSE)** para streaming unidirecional de baixa latência (`/api/stream`), agregando feeds externos de IPs atacantes (**SANS Internet Storm Center / DShield API**), indexação de vulnerabilidades (**NIST NVD API v2.0**), parser de feeds RSS internacionais (*The Hacker News*, *BleepingComputer*, *SANS ISC Diary*) com **Verificador Ativo de Links HTTP-200**, e webhook de ingestão (`POST /api/ingest`).
2. **Modo Serverless / Static Edge (`GitHub Pages`):** Executa um motor determinístico e estocástico diretamente no cliente (`startStandaloneClientTelemetryEngine`), garantindo funcionamento autônomo em hospedagem estática sem perda de interatividade WebGL ou séries temporais.

---

## 🧠 Especificações Técnicas e Módulos Analíticos

### 1. Globo 3D WebGL de Telemetria Contínua (`Three.js` + `Globe.gl`)
- **Trajetórias Balísticas Estilo CheckPoint ThreatMap:** Renderização sem cintilação (*zero-flicker*) com `arcsTransitionDuration(0)` e feixes contínuos de cometa (`arcDashLength: 0.9`, `arcDashGap: 2.2`).
- **Volume-Weighted Camera Director:** Algoritmo de decaimento exponencial ($\text{heat}_{t} = \text{heat}_{t-1} \times 0.94 + \Delta_{\text{evento}}$) que calcula em tempo real a densidade de ataques por cluster continental e mantém o foco orbital da câmera proporcionalmente ao volume de tráfego malicioso na região.
- **Diferenciação Visual por Origem Algorítmica:**
  - **Arcos Roxo/Esmeralda (`#c084fc` → `#00ff9d`):** Ataques originados por **Agentes Autônomos de IA (LLM Polymorphic Fuzzers)**.
  - **Arcos Rubi/Ciano (`#ff2a5f` → `#38bdf8`):** Varreduras estáticas de **Botnets Convencionais** (Mirai-PHP, ZMap, Nuclei).

### 2. Atribuição de Ameaças por Inteligência Artificial vs. Bots Tradicionais
- Classificação heurística de payloads e padrões de mutação de requisição:
  - **Agentes LLM Autônomos:** Evasão polimórfica de WAF, síntese dinâmica de cadeias `php://filter/convert.iconv` (*CNEXT*), e encadeamento automatizado de CVEs.
  - **Scanners Tradicionais:** Sondagens sequenciais fixas (`/.env`, `/xmlrpc.php`, `eval-stdin.php`).
- **Gráfico de Inflexão Histórica (12 Meses):** Demonstra visualmente o ponto de inflexão nos últimos 6 meses (**+218.4%** de escalada no volume global de ataques impulsionado por agentes de IA).

### 3. Inteligência Geopolítica Bilateral (Inspirado em Netscout Horizon & SonicWall)
- **Top Origem de Ataques (Source Jurisdictions & ASNs):** Ranking dinâmico de países emissores com detalhamento de Autonomous System Numbers (`AS4134`, `AS12389`, `AS14061`, `AS53667`) e proporção de tráfego gerado por IA.
- **Países Mais Afetados (Targeted Infrastructure):** Monitoramento de impacto sobre clusters PHP/Laravel/WordPress nos EUA, Brasil, Alemanha, Singapura, Holanda, Japão, França e Reino Unido.
- **Matriz Geopolítica Bilateral (`Apache ECharts`):** Comparação simultânea entre *Ataques Disparados*, *Ataques Sofridos* e *Volume Guiado por IA* por nação.

### 4. Série Temporal de 365 Dias até Hoje & Taxonomia OWASP PHP
- **Curva Histórica Anual com `DataZoom`:** 365 pontos diários empilhados com atualização incremental ao vivo no marcador **`HOJE`**.
- **Radar Multidimensional OWASP PHP:** 6 eixos técnicos:
  1. `RCE (PHP-CGI / Eval)` — ex: `CVE-2024-4577` (Soft-Hyphen Bypass), `CVE-2017-9841` (PHPUnit).
  2. `.env & Config Harvesting` — Extração de credenciais `DB_PASSWORD`, `AWS_SECRET_ACCESS_KEY`, `APP_KEY`.
  3. `LFI & Stream Filter Chains` — ex: `CVE-2024-2961` (`glibc iconv` buffer overflow via `php://filter`).
  4. `Webshell Droppers` — Injeção ofuscada `Alfa`, `WSO`, `b374k`.
  5. `SQL Injection (PDO / MySQLi / Plugins)` — ex: `CVE-2024-27956`.
  6. `Insecure Deserialization` — Phar / Monolog / Guzzle gadget chains (`CVE-2021-3129`).

### 5. Inspetor Profundo de Pacotes (DPI) & Gaveta Forense (`Slide-Over Drawer`)
- Arquitetura de **Progressive Disclosure** dividida em 5 abas operacionais para eliminar sobrecarga cognitiva.
- Clique em qualquer evento para abrir o **Dossiê Forense Lateral**, contendo o índice de confiança de IA, assinatura neural, rota BGP/ASN e o payload PHP bruto interceptado.

---

## 🚀 Execução Local

```bash
# 1. Clone o repositório
git clone https://github.com/willyelias/php-threat-radar.git
cd php-threat-radar

# 2. Instale as dependências
npm install

# 3. Inicie o servidor SOC (porta 4000)
npm start
```

Acesse em **`http://localhost:4000`**.
