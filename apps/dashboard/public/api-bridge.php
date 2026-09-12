<?php
// ==============================================================================
// PHP Bridge Gateway to local Node.js Express API on port 4000
// Resilient, Open_basedir Safe & Single-Process PM2 Architecture
// ==============================================================================

error_reporting(E_ALL);
ini_set('display_errors', '0');

set_exception_handler(function(Throwable $e) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Backend API bridge error: ' . $e->getMessage()
    ]);
    exit;
});

$node_port = 4000;
$request_uri = $_SERVER['REQUEST_URI'] ?? '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$target_url = "http://127.0.0.1:{$node_port}" . $request_uri;

// Helper untuk mencoba membangunkan backend seogeo-api jika tertidur
function safe_wake_backend() {
    // Jalankan via shell tanpa memicu open_basedir restriction
    @exec("bash -c 'source ~/.bashrc 2>/dev/null; cd ~/seo-geo-tools/apps/api && (pm2 resurrect 2>/dev/null || pm2 restart seogeo-api 2>/dev/null || pm2 start dist/index.js --name seogeo-api 2>/dev/null || nohup node dist/index.js > seogeo-api.log 2>&1 &)' > /dev/null 2>&1 &");
}

// Helper cURL yang aman dari batasan open_basedir
function forward_request($url, $method, $headers, $body, $timeout = 120) {
    if (!function_exists('curl_init')) {
        return ['resp' => null, 'code' => 500, 'ct' => 'application/json', 'err' => 1, 'errmsg' => 'PHP cURL extension not available'];
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    // Jangan gunakan CURLOPT_FOLLOWLOCATION karena dilarang jika open_basedir aktif di Hostinger
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 4);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    if ($body !== null && strlen($body) > 0) {
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

// Filter dan forward headers (abaikan hop-by-hop headers)
$headers = [];
$ignored_headers = ['host', 'connection', 'transfer-encoding', 'content-length'];

if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        if (in_array(strtolower($name), $ignored_headers)) continue;
        $headers[] = "{$name}: {$value}";
    }
} else {
    foreach ($_SERVER as $name => $value) {
        if (substr($name, 0, 5) === 'HTTP_') {
            $headerName = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
            if (in_array(strtolower($headerName), $ignored_headers)) continue;
            $headers[] = "{$headerName}: {$value}";
        }
    }
}

// Tambahkan header Content-Type jika ada di $_SERVER
if (isset($_SERVER['CONTENT_TYPE']) && !empty($_SERVER['CONTENT_TYPE'])) {
    $headers[] = "Content-Type: " . $_SERVER['CONTENT_TYPE'];
}

// Forward body
$body = null;
if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    $body = file_get_contents('php://input');
}

// 1. Eksekusi request pertama ke Express port 4000
$res = forward_request($target_url, $method, $headers, $body);

// 2. Jika gagal koneksi (port 4000 belum menyala), bangunkan dan coba sekali lagi
if ($res['err']) {
    safe_wake_backend();
    sleep(2); // beri waktu proses Node/PM2 hidup
    $res = forward_request($target_url, $method, $headers, $body);
}

// 3. Output hasil
if ($res['err']) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Backend API service (port 4000) sedang offline atau sedang dibangunkan otomatis. Silakan tunggu beberapa detik dan refresh halaman.',
        'detail' => $res['errmsg'] ?: 'Connection refused to 127.0.0.1:4000'
    ]);
} else {
    http_response_code($res['code'] ?: 200);
    if ($res['ct']) {
        header("Content-Type: {$res['ct']}");
    }
    echo $res['resp'];
}

