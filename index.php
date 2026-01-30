<?php
// ==========================================
// ROBUST FLASK PROXY (With Cookie Support)
// ==========================================

$FLASK_HOST = "http://127.0.0.1";
$FLASK_PORT = "12345";

// 1. Determine the Path
$request_uri = $_SERVER['REQUEST_URI'];
if (isset($_GET['__path'])) {
    $request_uri = $_GET['__path'];
}

$url = $FLASK_HOST . ":" . $FLASK_PORT . $request_uri;

// 2. Initialize Curl
$ch = curl_init($url);

// 3. Forward Method & Body
$method = $_SERVER['REQUEST_METHOD'];
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
$input_data = file_get_contents('php://input');
if (!empty($input_data)) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input_data);
}

// 4. Forward Request Headers (IMPORTANT: Forward Cookie to Flask)
$headers = [];
foreach (getallheaders() as $name => $value) {
    if (strtolower($name) !== 'host' && strtolower($name) !== 'content-length') {
        $headers[] = "$name: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// 5. Return Response + Headers
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

if ($http_code === 0) {
    http_response_code(502);
    die("Error: Backend Flask server is offline on Port $FLASK_PORT.");
}

// 6. Split Response
$response_header = substr($response, 0, $header_size);
$response_body = substr($response, $header_size);

// 7. Forward Response Headers (CRITICAL: Forward Set-Cookie to Browser)
// We split by standard newline, but handle variations
$header_lines = explode("\n", $response_header);
foreach ($header_lines as $header_line) {
    $header_line = trim($header_line);
    if (empty($header_line)) continue;
    
    // Explicitly forward Set-Cookie headers
    if (stripos($header_line, 'Set-Cookie:') === 0) {
        header($header_line, false); // false = do not replace previous Set-Cookie headers
    }
    // Forward other headers except Transfer-Encoding (chunked breaks things)
    else if (strpos($header_line, ':') !== false) {
        $key = substr($header_line, 0, strpos($header_line, ':'));
        if (strtolower($key) !== 'transfer-encoding') {
            header($header_line);
        }
    }
}

// 8. Output Body
http_response_code($http_code);
echo $response_body;
?>
