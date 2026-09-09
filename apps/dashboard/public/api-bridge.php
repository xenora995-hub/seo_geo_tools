<?php
// ==============================================================================
// PHP Bridge Gateway to local Node.js Express API on port 4000
// With Self-Healing Auto-Wake via PM2 (Single-Process Architecture)
// ==============================================================================

$node_port = 4000;
$request_uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
$target_url = "http://127.0.0.1:{$node_port}" . $request_uri;

// Helper untuk mencari root project dan path binary
function get_api_environment() {
    $home = getenv('HOME') ?: ($_SERVER['HOME'] ?? '');
    if (!$home) {
        $doc_root = $_SERVER['DOCUMENT_ROOT'] ?? '';
        if (preg_match('#^(/home[^/]+/[^/]+)#', $doc_root, $m)) {
            $home = $m[1];
        }
    }
    $root = $home ? "{$home}/seo-geo-tools" : dirname(dirname(dirname(__DIR__)));
    $api_dir = "{$root}/apps/api";
    $latest_node = @exec("ls {$home}/.nvm/versions/node 2>/dev/null | tail -n 1");
    $path_env = "PATH=\$PATH:/usr/local/bin:/usr/bin:/bin:{$home}/.nvm/versions/node/{$latest_node}/bin:{$home}/.npm-global/bin:{$home}/bin";
    return ['home' => $home, 'root' => $root, 'api_dir' => $api_dir, 'path_env' => $path_env];
}

// Helper untuk membangunkan backend seogeo-api jika tertidur
function wake_backend() {
    $env = get_api_environment();
    $api_dir = $env['api_dir'];
    $path_env = $env['path_env'];

    if (file_exists("{$api_dir}/dist/index.js")) {
        $cmd = "export {$path_env} && cd " . escapeshellarg($api_dir) . " && (pm2 resurrect > /dev/null 2>&1 || pm2 restart seogeo-api > /dev/null 2>&1 || pm2 start dist/index.js --name seogeo-api > /dev/null 2>&1 || nohup node dist/index.js > seogeo-api.log 2>&1 &)";
        @exec($cmd);
    }
}

// Helper cURL
function forward_request($url, $method, $headers, $body, $timeout = 180) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $ct = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $err = curl_errno($ch);
    $errmsg = curl_error($ch);
    curl_close($ch);
    return ['resp' => $resp, 'code' => $code, 'ct' => $ct, 'err' => $err, 'errmsg' => $errmsg];
}

// Forward headers
$headers = [];
if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        if (strtolower($name) === 'host') continue;
        $headers[] = "{$name}: {$value}";
    }
} else {
    foreach ($_SERVER as $name => $value) {
        if (substr($name, 0, 5) == 'HTTP_') {
            $headerName = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
            if (strtolower($headerName) === 'host') continue;
            $headers[] = "{$headerName}: {$value}";
        }
    }
}

// Forward body
$body = null;
if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    $body = file_get_contents('php://input');
}

// 1. Eksekusi request pertama
$res = forward_request($target_url, $method, $headers, $body);

// 2. Jika gagal koneksi (port 4000 mati), bangunkan backend dan coba lagi
if ($res['err']) {
    wake_backend();
    sleep(3); // beri waktu agar proses Node / PM2 siap
    $res = forward_request($target_url, $method, $headers, $body);
}

// 3. Jika ini adalah panggilan pemicu cron runner dan port 4000 masih belum bangun, eksekusi mandiri
if ($res['err'] && strpos($request_uri, '/api/schedules/runner') !== false) {
    $secret = $_GET['secret'] ?? ($_SERVER['HTTP_X_CRON_SECRET'] ?? '');
    $valid_secret = getenv('CRON_SECRET') ?: 'seogeo-cron-token-secret';
    if ($secret === $valid_secret) {
        $env = get_api_environment();
        $runner_js = "{$env['api_dir']}/dist/scheduler/standalone-runner.js";
        if (file_exists($runner_js)) {
            $node_bin = exec("export {$env['path_env']} && command -v node 2>/dev/null") ?: 'node';
            $force_flag = (isset($_GET['force']) && $_GET['force'] === 'true') ? '--force' : '';
            $out = shell_exec("export {$env['path_env']} && cd " . escapeshellarg($env['api_dir']) . " && {$node_bin} " . escapeshellarg($runner_js) . " {$force_flag} 2>&1");
            header('Content-Type: application/json');
            $json_pos = strpos($out, '{');
            if ($json_pos !== false) {
                echo substr($out, $json_pos);
            } else {
                echo json_encode(['success' => true, 'message' => 'Executed via standalone runner fallback', 'output' => $out]);
            }
            exit;
        }
    }
}

// 3. Output hasil
if ($res['err']) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Backend API service sedang dibangunkan otomatis. Silakan refresh halaman dalam beberapa detik.'
    ]);
} else {
    http_response_code($res['code']);
    if ($res['ct']) {
        header("Content-Type: {$res['ct']}");
    }
    echo $res['resp'];
}
