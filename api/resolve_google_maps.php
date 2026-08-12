<?php
require_once 'config.php';

requireAuth();

$url = $_GET['url'] ?? '';
if (!$url) {
    sendResponse(['error' => 'URL Google Maps wajib diisi'], 400);
}

$normalized = trim($url);
if (!preg_match('/maps\.app\.goo\.gl|goo\.gl\/maps|google\.[^\s]+\/maps|maps\.google\./i', $normalized)) {
    sendResponse(['error' => 'URL bukan link Google Maps yang valid'], 400);
}

$apiUrl = $normalized;
if (preg_match('/^https?:\/\//i', $normalized)) {
    $apiUrl = $normalized;
} else {
    $apiUrl = 'https://' . $normalized;
}

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => "User-Agent: Mozilla/5.0\r\nAccept-Language: en-US,en;q=0.9\r\n",
        'timeout' => 15,
        'ignore_errors' => true
    ]
]);

$html = @file_get_contents($apiUrl, false, $context);
if ($html === false || $html === '') {
    sendResponse(['error' => 'Tidak dapat membuka link Google Maps'], 400);
}

$patterns = [
    '/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),/i',
    '/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i',
    '/[?&](?:q|center|destination|daddr|saddr|origin)=([^&]+)/i',
    '/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/'
];

foreach ($patterns as $pattern) {
    if (preg_match($pattern, $html, $match)) {
        $lat = null;
        $lng = null;

        if (strpos($pattern, '!3d') !== false) {
            $lat = (float)$match[1];
            $lng = (float)$match[2];
        } elseif (strpos($pattern, '[?&](?:q|center|destination|daddr|saddr|origin)') !== false) {
            $decoded = urldecode($match[1]);
            if (preg_match('/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/', $decoded, $m)) {
                $lat = (float)$m[1];
                $lng = (float)$m[2];
            }
        } elseif (strpos($pattern, '@') !== false) {
            $lat = (float)$match[1];
            $lng = (float)$match[2];
        } else {
            $lat = (float)$match[1];
            $lng = (float)$match[2];
        }

        if ($lat !== null && $lng !== null && $lat >= -90 && $lat <= 90 && $lng >= -180 && $lng <= 180) {
            sendResponse(['lat' => $lat, 'lng' => $lng]);
        }
    }
}

sendResponse(['error' => 'Koordinat tidak ditemukan di link Google Maps'], 400);
