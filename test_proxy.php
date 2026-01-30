<?php
// Simple script to test if PHP can talk to Flask manually
$ch = curl_init('http://127.0.0.1:12345/api/health');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "<h1>Proxy Test</h1>";
echo "<p>Talking to Flask on Port 12345...</p>";
echo "<p><strong>HTTP Status:</strong> $http_code</p>";
echo "<pre><strong>Response:</strong> " . htmlspecialchars($response) . "</pre>";

if ($http_code == 200 || $http_code == 404) {
    echo "<h2 style='color:green'>SUCCESS! PHP can see Flask.</h2>";
    echo "<p>The problem is definitely .htaccess ignoring the rewrite rules.</p>";
} else {
    echo "<h2 style='color:red'>FAILURE! PHP cannot see Flask.</h2>";
    echo "<p>Maybe Flask is not running or Port is blocked.</p>";
}
?>
