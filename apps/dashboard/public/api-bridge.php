<?php
// ==============================================================================
// PHP Bridge Gateway to local Node.js Express API on port 4000
// With Self-Healing Auto-Wake via PM2 (Single-Process Architecture)
// ==============================================================================

$node_port = 4000;
$request_uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
$target_url = "http://127.0.0.1:{$node_port}" . $request_uri;

// Helper untuk membangunkan backend seogeo-api jika tertidur
function wake_backend() {
    $home = getenv('HOME') ?: ($_SERVER['HOME'] ?? '');
    $root = $home ? "{$home}/seo-geo-tools" : dirname(dirname(dirname(__DIR__)));
    $api_dir = "{$root}/apps/api";
    if (file_exists("{$api_dir}/dist/index.js")) {
        @exec("cd " . escapeshellarg($api_dir) . " && pm2 restart seogeo-api > /dev/null 2>&1 || pm2 start dist/index.js --name seogeo-api > /dev/null 2>&1");
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
    sleep(3); // beri waktu 3 detik agar PM2 mengaktifkan port 4000
    $res = forward_request($target_url, $method, $headers, $body);
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
