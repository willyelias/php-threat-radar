# 🌍 PHP Threat Radar — Global Cyber Threat Intelligence & Real-Time Attack SOC

Painel global em tempo real (Security Operations Center) para monitoramento, visualização 3D e inspeção profunda de ataques contra o ecossistema **PHP** (**Core PHP-CGI**, **Laravel**, **Symfony**, **WordPress**, **Composer/PHPUnit**).

## ✨ Principais Recursos e Gráficos

- **🌐 Globo 3D Interativo de Telemetria Balística (`Three.js` + `Globe.gl` WebGL):** Arcos balísticos animados em tempo real mostrando a origem dos bots/scanners até a malha de 6 Honeypots PHP globais (EUA, Alemanha, Brasil, Singapura, Holanda e Japão) com ondas de choque no impacto.
- **📅 Série Temporal Histórica de 365 Dias até Hoje (`Apache ECharts` Stacked Area + `DataZoom`):** Evolução diária completa dos ataques no último ano dividida por vetores (RCE, LFI/.env, Webshells/SQLi), com o ponto **HOJE** atualizando ao vivo segundo a segundo.
- **📰 Central Internacional de Notícias de Ataques (`Global Press Wire`):** Sincronização automática via RSS/XML com veículos internacionais de cibersegurança (**The Hacker News**, **BleepingComputer**, **SANS ISC**, **CISA KEV** e **Wordfence Threat Intel**).
- **🎯 Radar Multidimensional OWASP PHP (`ECharts` Radar):** Monitoramento de 6 eixos de exploração (RCE CGI/Eval, `.env`/Config Probe, LFI/`php://filter`, Webshells, SQL Injection e `unserialize()`).
- **🌹 Nightingale Rose Chart & Top Assinaturas Ao Vivo:** Proporção de ataques por stack PHP e ranking dinâmico das CVEs/rotas mais visadas (`CVE-2024-4577`, `CVE-2024-2961`, `CVE-2021-3129`, `CVE-2017-9841`).
- **🔍 Inspetor de Payloads (DPI Packet Sniffer) + Feed Oficial NIST NVD & SANS DShield:** Tabela em tempo real com filtro instantâneo exibindo o código PHP malicioso capturado, IP real e ASN.
- **🐝 Agente Sensor Honeypot em PHP (`honeypot-sensor.php`):** Script pronto para ser incluído em servidores PHP reais e transmitir tentativas de ataque ao vivo para o endpoint `POST /api/ingest`.

---

## 🚀 Como Executar Localmente

```bash
# 1. Instale as dependências
npm install

# 2. Inicie o servidor SOC (porta 4000)
npm start
```

Acesse no navegador: **`http://localhost:4000`**

---

## 🧪 Disparando um Ataque de Teste via Terminal

Você pode clicar no botão **"Disparar Exploit no Sensor"** no topo do painel ou enviar um payload via cURL / PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/ingest" -Method POST -ContentType "application/json" -Body '{"sourceIp":"185.220.101.99","originCountry":"Russia","originCode":"RU","cve":"CVE-2024-4577","category":"RCE","attackName":"Live Exploit Test","uri":"/index.php?%ADd+allow_url_include=1","payload":"<?php system(\"whoami\"); ?>"}'
```
