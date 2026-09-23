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

function get_server_home() {
    if (!empty($_SERVER['HOME'])) return $_SERVER['HOME'];
    if (getenv('HOME')) return getenv('HOME');
    $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? __DIR__;
    if (preg_match('#^(/home/[^/]+)#', $docRoot, $m)) {
        return $m[1];
    }
    $user = get_current_user();
    if ($user && is_dir("/home/{$user}")) {
        return "/home/{$user}";
    }
    return '/home';
}

// Helper untuk mencoba membangunkan backend seogeo-api jika environment PHP mengizinkan
function safe_wake_backend() {
    $home = get_server_home();
    $keepAlive = "{$home}/seo-geo-tools/keep-alive.sh";
    
    $cmd = "bash -c 'export HOME={$home}; [ -s \"\$HOME/.nvm/nvm.sh\" ] && . \"\$HOME/.nvm/nvm.sh\"; export PATH=\"\$PATH:\$HOME/.nvm/versions/node/$(ls \$HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:\$HOME/.npm-global/bin:/usr/local/bin:/usr/bin:/bin\"; if [ -f \"{$keepAlive}\" ]; then bash \"{$keepAlive}\" > /dev/null 2>&1 & else cd \"{$home}/seo-geo-tools/apps/api\" 2>/dev/null && (pm2 resurrect 2>/dev/null || pm2 restart seogeo-api 2>/dev/null || pm2 start dist/index.js --name seogeo-api 2>/dev/null || nohup node dist/index.js > seogeo-api.log 2>&1 &); fi' > /dev/null 2>&1 &";

    if (function_exists('exec')) {
        @exec($cmd);
        return true;
    } elseif (function_exists('shell_exec')) {
        @shell_exec($cmd);
        return true;
    } elseif (function_exists('system')) {
        @system($cmd);
        return true;
    } elseif (function_exists('passthru')) {
        @passthru($cmd);
        return true;
    } elseif (function_exists('popen')) {
        $p = @popen($cmd, 'r');
        if (is_resource($p)) {
            @pclose($p);
            return true;
        }
    } elseif (function_exists('proc_open')) {
        $proc = @proc_open($cmd, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        if (is_resource($proc)) {
            @proc_close($proc);
            return true;
        }
    }
    return false;
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
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
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

// 2. Jika gagal koneksi (port 4000 belum menyala), coba bangunkan backend jika diizinkan server
$wakeAttempted = false;
if ($res['err']) {
    $wakeAttempted = safe_wake_backend();
    if ($wakeAttempted) {
        for ($i = 0; $i < 3; $i++) {
            sleep(1);
            $res = forward_request($target_url, $method, $headers, $body);
            if (!$res['err']) break;
        }
    }
}

// 3. Output hasil
if ($res['err']) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Backend API service (port 4000) sedang offline. Pastikan service seogeo-api berjalan via PM2 di server.',
        'detail' => $res['errmsg'] ?: 'Connection refused to 127.0.0.1:4000',
        'wake_attempted' => $wakeAttempted
    ]);
} else {
    http_response_code($res['code'] ?: 200);
    if ($res['ct']) {
        header("Content-Type: {$res['ct']}");
    }
    echo $res['resp'];
}
