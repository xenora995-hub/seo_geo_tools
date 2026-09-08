<?php
// ==============================================================================
// PHP Bridge Gateway to local Node.js Express API on port 4000
// With Self-Healing Auto-Wake and Direct Cron Runner Fallback
// ==============================================================================

$node_port = 4000;
$request_uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Helper untuk mencari binary node.js di Hostinger / Linux server
function find_node_bin() {
    $candidates = [
        '/usr/local/bin/node',
        '/usr/bin/node',
        'node',
    ];
    $home = getenv('HOME') ?: ($_SERVER['HOME'] ?? '');
    if ($home) {
        $nvm_nodes = glob("{$home}/.nvm/versions/node/*/bin/node");
        if (!empty($nvm_nodes)) {
            array_unshift($candidates, end($nvm_nodes));
        }
    }
    foreach ($candidates as $bin) {
        if (@is_executable($bin)) return $bin;
    }
    return 'node';
}

// Helper untuk mencari root direktori seo-geo-tools
function get_project_root() {
    $candidates = [
        dirname(dirname(dirname(__DIR__))), // apps/dashboard/public -> root
        dirname(dirname(__DIR__)),
        ($_SERVER['HOME'] ?? getenv('HOME')) . '/seo-geo-tools',
        '/var/www/seo-geo-tools',
    ];
    foreach ($candidates as $dir) {
        if (file_exists("{$dir}/apps/api/package.json") || file_exists("{$dir}/keep-alive.sh")) {
            return $dir;
        }
    }
    return dirname(dirname(dirname(__DIR__)));
}

// Helper untuk membangunkan backend Node.js di background
function trigger_backend_wake() {
    $root = get_project_root();
    $keep_alive = "{$root}/keep-alive.sh";
    if (file_exists($keep_alive)) {
        @exec("bash " . escapeshellarg($keep_alive) . " > /dev/null 2>&1 &");
    } else {
        $node_bin = find_node_bin();
        $index_js = "{$root}/apps/api/dist/index.js";
        if (file_exists($index_js)) {
            @exec("cd " . escapeshellarg("{$root}/apps/api") . " && PORT=4000 nohup {$node_bin} dist/index.js > seogeo-api.log 2>&1 &");
        }
    }
}

// Target internal URL
$target_url = "http://127.0.0.1:{$node_port}" . $request_uri;

$ch = curl_init($target_url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 180);

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
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Forward request body for POST/PUT/PATCH/DELETE
$body = null;
if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    $body = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

// Execute request
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

// JIKA KONEKSI KE PORT 4000 GAGAL (SERVICE MATI ATAU TERTIDUR)
if (curl_errno($ch)) {
    $curl_err = curl_error($ch);
    curl_close($ch);

    // KASUS 1: Ini panggilan ke pemicu cron (/api/schedules/runner)
    // Langsung eksekusi standalone runner mandiri melalui CLI tanpa perlu port 4000!
    if (strpos($request_uri, '/api/schedules/runner') !== false) {
        $secret = $_GET['secret'] ?? ($_SERVER['HTTP_X_CRON_SECRET'] ?? '');
        $valid_secret = getenv('CRON_SECRET') ?: 'seogeo-cron-token-secret';

        if ($secret !== $valid_secret) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Invalid or missing cron secret']);
            exit;
        }

        $root = get_project_root();
        $node_bin = find_node_bin();
        $runner_js = "{$root}/apps/api/dist/scheduler/standalone-runner.js";
        $runner_ts = "{$root}/apps/api/src/scheduler/standalone-runner.ts";

        $force_flag = (isset($_GET['force']) && $_GET['force'] === 'true') ? '--force' : '';
        $sched_flag = !empty($_GET['scheduleId']) ? ('--scheduleId=' . escapeshellarg($_GET['scheduleId'])) : '';

        $cmd = "";
        if (file_exists($runner_js)) {
            $cmd = "cd " . escapeshellarg("{$root}/apps/api") . " && " . escapeshellarg($node_bin) . " " . escapeshellarg($runner_js) . " {$force_flag} {$sched_flag} 2>&1";
        } elseif (file_exists($runner_ts)) {
            $cmd = "cd " . escapeshellarg("{$root}/apps/api") . " && npx tsx " . escapeshellarg($runner_ts) . " {$force_flag} {$sched_flag} 2>&1";
        }

        if ($cmd) {
            $output = shell_exec($cmd);
            trigger_backend_wake(); // bangunkan juga port 4000 untuk kebutuhan dashboard

            header('Content-Type: application/json');
            // Jika ada output JSON di dalamnya, ambil JSON-nya
            $json_pos = strpos($output, '{');
            if ($json_pos !== false) {
                echo substr($output, $json_pos);
            } else {
                echo json_encode([
                    'success' => true,
                    'message' => 'Standalone runner executed directly via PHP bridge fallback',
                    'raw_output' => $output
                ]);
            }
            exit;
        }
    }

    // KASUS 2: Permintaan dashboard umum
    // Bangunkan backend Node.js di background, tunggu 2 detik, lalu coba sekali lagi
    trigger_backend_wake();
    sleep(2);

    $ch_retry = curl_init($target_url);
    curl_setopt($ch_retry, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch_retry, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch_retry, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch_retry, CURLOPT_TIMEOUT, 180);
    curl_setopt($ch_retry, CURLOPT_HTTPHEADER, $headers);
    if ($body !== null) {
        curl_setopt($ch_retry, CURLOPT_POSTFIELDS, $body);
    }

    $retry_resp = curl_exec($ch_retry);
    $retry_code = curl_getinfo($ch_retry, CURLINFO_HTTP_CODE);
    $retry_ct = curl_getinfo($ch_retry, CURLINFO_CONTENT_TYPE);

    if (!curl_errno($ch_retry)) {
        http_response_code($retry_code);
        if ($retry_ct) header("Content-Type: {$retry_ct}");
        echo $retry_resp;
        curl_close($ch_retry);
        exit;
    }
    curl_close($ch_retry);

    // Jika masih gagal setelah dicoba bangunkan
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Backend API service sedang dibangunkan otomatis. Silakan refresh halaman dalam 5 detik.'
    ]);
    exit;
}

// Berhasil normal via port 4000
http_response_code($http_code);
if ($content_type) {
    header("Content-Type: {$content_type}");
}
echo $response;
curl_close($ch);
