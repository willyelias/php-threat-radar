<?php
/**
 * ============================================================================
 * PHP THREAT RADAR — REAL-TIME HONEYPOT SENSOR AGENT (honeypot-sensor.php)
 * ============================================================================
 * Coloque este script na raiz ou inclua via `auto_prepend_file` no php.ini
 * de qualquer servidor PHP exposto na internet.
 *
 * Ele inspeciona requisições em busca de exploits clássicos e modernos de PHP
 * (CVE-2024-4577, PHPUnit RCE, php://filter LFI, Laravel .env, Webshells, SQLi)
 * e envia a telemetria em tempo real para o painel PHP Threat Radar.
 */

define('RADAR_INGEST_URL', getenv('RADAR_INGEST_URL') ?: 'http://localhost:4000/api/ingest');

function inspectAndReportPhpAttack(): void {
    $uri       = $_SERVER['REQUEST_URI'] ?? '/';
    $query     = $_SERVER['QUERY_STRING'] ?? '';
    $method    = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $ip        = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
    $rawBody   = file_get_contents('php://input') ?: '';

    $combinedPayload = $uri . ' ' . urldecode($query) . ' ' . $rawBody . ' ' . $userAgent;

    $rules = [
        [
            'pattern'  => '/(%ADd|allow_url_include|auto_prepend_file)/i',
            'category' => 'RCE',
            'severity' => 'CRITICAL',
            'cve'      => 'CVE-2024-4577',
            'name'     => 'PHP-CGI Argument Injection Exploit Attempt',
            'target'   => 'Core PHP-CGI'
        ],
        [
            'pattern'  => '/(eval-stdin\.php|phpunit|_ignition\/execute-solution)/i',
            'category' => 'RCE',
            'severity' => 'CRITICAL',
            'cve'      => 'CVE-2017-9841',
            'name'     => 'Composer / PHPUnit / Ignition RCE Probe',
            'target'   => 'Laravel / Composer'
        ],
        [
            'pattern'  => '/(php:\/\/filter|convert\.base64-encode|convert\.iconv|\.\.\/etc\/passwd)/i',
            'category' => 'LFI',
            'severity' => 'HIGH',
            'cve'      => 'CVE-2024-2961',
            'name'     => 'PHP Stream Filter Chain / Local File Inclusion',
            'target'   => 'PHP Stream Wrapper'
        ],
        [
            'pattern'  => '/(\/\.env|phpinfo|wp-config\.php)/i',
            'category' => 'EnvProbe',
            'severity' => 'HIGH',
            'cve'      => 'CWE-200',
            'name'     => 'Sensitive Environment & Credential File Probe',
            'target'   => 'PHP Configuration'
        ],
        [
            'pattern'  => '/(system\(|shell_exec\(|passthru\(|base64_decode\(|O:\d+:")/i',
            'category' => 'Webshell',
            'severity' => 'CRITICAL',
            'cve'      => 'CWE-502',
            'name'     => 'PHP Webshell Execution / Object Deserialization',
            'target'   => 'PHP Runtime'
        ]
    ];

    foreach ($rules as $rule) {
        if (preg_match($rule['pattern'], $combinedPayload)) {
            $telemetry = [
                'sourceIp'      => explode(',', $ip)[0],
                'originCountry' => $_SERVER['HTTP_CF_IPCOUNTRY'] ?? 'Live Sensor',
                'originCode'    => $_SERVER['HTTP_CF_IPCOUNTRY'] ?? 'LIVE',
                'originCity'    => 'Honeypot Trap',
                'originAsn'     => 'Live-HTTP-Request',
                'srcLat'        => 48.8566 + (mt_rand(-50, 50) / 10),
                'srcLng'        => 2.3522 + (mt_rand(-50, 50) / 10),
                'category'      => $rule['category'],
                'severity'      => $rule['severity'],
                'cve'           => $rule['cve'],
                'attackName'    => $rule['name'],
                'targetStack'   => $rule['target'],
                'method'        => $method,
                'uri'           => substr($uri, 0, 180),
                'payload'       => substr(trim($rawBody ?: $uri), 0, 240)
            ];

            $ch = curl_init(RADAR_INGEST_URL);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => json_encode($telemetry),
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT_MS     => 800
            ]);
            @curl_exec($ch);
            @curl_close($ch);

            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Blocked by PHP Threat Radar Honeypot Sensor']);
            exit;
        }
    }
}

inspectAndReportPhpAttack();
