<?php
declare(strict_types=1);

/*
Purpose: Minimal authenticated upload endpoint for J. Miller AI public JSON snapshots.
Inputs:
  - HTTP PUT
  - Query string: ?target=status|book|reading-feed|thinking-feed|public-graph|...
  - Header: X-JMiller-Key: <shared secret>
  - Header: Content-Encoding: gzip (optional — body may be gzip-compressed)
  - Body: valid JSON payload (plain or gzip-compressed)
Output:
  - JSON response with success/error status
Side effects:
  - Writes sanitized JSON snapshots under ./data/*.json using atomic rename
Notes:
  - Compatible with PHP 7.4.x
  - Place this file under /jmillerai/publish.php so __DIR__ . '/data' maps to /jmillerai/data
*/

header('Content-Type: application/json; charset=utf-8');

const JMILLER_PUBLISH_SECRET = 'l90ngTTTRr04nd8msecotjs_piripiqcuchAasdjadpapoiasMNGHVE_34987223493438934_iuer';
const JMILLER_MAX_BYTES = 524288; // 512 KiB (applies to compressed body)
const JMILLER_MAX_DECODED_BYTES = 2097152; // 2 MiB (safety limit on decompressed JSON)
const JMILLER_DATA_DIR = __DIR__ . '/data';

$allowedTargets = [
    'status' => 'status.json',
    'book' => 'book.json',
    'reading-feed' => 'reading-feed.json',
    'thinking-feed' => 'thinking-feed.json',
    'public-graph' => 'public-graph.json',
    'cognitive-loop' => 'cognitive-loop.json',
    'social-feed' => 'social-feed.json',
    'projects-feed' => 'projects-feed.json',
];

function respond(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function getHeaderValue(string $name): ?string
{
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    if (isset($_SERVER[$key])) {
        return trim((string) $_SERVER[$key]);
    }

    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        foreach ($headers as $headerName => $headerValue) {
            if (strcasecmp($headerName, $name) === 0) {
                return trim((string) $headerValue);
            }
        }
    }

    return null;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    header('Allow: PUT');
    respond(405, [
        'ok' => false,
        'error' => 'method_not_allowed',
    ]);
}

if (JMILLER_PUBLISH_SECRET === '' || JMILLER_PUBLISH_SECRET === 'CHANGE_ME_WITH_A_LONG_RANDOM_SECRET') {
    respond(500, [
        'ok' => false,
        'error' => 'server_not_configured',
    ]);
}

$providedSecret = getHeaderValue('X-JMiller-Key');
if ($providedSecret === null || !hash_equals(JMILLER_PUBLISH_SECRET, $providedSecret)) {
    respond(401, [
        'ok' => false,
        'error' => 'unauthorized',
    ]);
}

$target = isset($_GET['target']) ? trim((string) $_GET['target']) : '';
if ($target === '' || !isset($allowedTargets[$target])) {
    respond(400, [
        'ok' => false,
        'error' => 'invalid_target',
        'allowed_targets' => array_keys($allowedTargets),
    ]);
}

$raw = file_get_contents('php://input');
if ($raw === false) {
    respond(400, [
        'ok' => false,
        'error' => 'read_failed',
    ]);
}

$byteLength = strlen($raw);
if ($byteLength === 0) {
    respond(400, [
        'ok' => false,
        'error' => 'empty_body',
    ]);
}

if ($byteLength > JMILLER_MAX_BYTES) {
    respond(413, [
        'ok' => false,
        'error' => 'payload_too_large',
        'max_bytes' => JMILLER_MAX_BYTES,
    ]);
}

// Decompress gzip if Content-Encoding header is set
$contentEncoding = getHeaderValue('Content-Encoding');
$wasCompressed = false;
if ($contentEncoding !== null && strtolower($contentEncoding) === 'gzip') {
    $decompressed = @gzdecode($raw);
    if ($decompressed === false) {
        respond(400, [
            'ok' => false,
            'error' => 'gzip_decode_failed',
        ]);
    }
    if (strlen($decompressed) > JMILLER_MAX_DECODED_BYTES) {
        respond(413, [
            'ok' => false,
            'error' => 'decompressed_too_large',
            'max_bytes' => JMILLER_MAX_DECODED_BYTES,
        ]);
    }
    $raw = $decompressed;
    $wasCompressed = true;
}

$contentType = isset($_SERVER['CONTENT_TYPE']) ? trim((string) $_SERVER['CONTENT_TYPE']) : '';
if (!$wasCompressed && $contentType !== '' && stripos($contentType, 'application/json') !== 0) {
    respond(415, [
        'ok' => false,
        'error' => 'unsupported_content_type',
    ]);
}

$decoded = json_decode($raw, true);
if (!is_array($decoded)) {
    respond(400, [
        'ok' => false,
        'error' => 'invalid_json',
        'json_error' => json_last_error_msg(),
    ]);
}

// Save compact JSON (no pretty print — saves space on disk and in CDN cache)
$encoded = json_encode(
    $decoded,
    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
);

if ($encoded === false) {
    respond(500, [
        'ok' => false,
        'error' => 'json_encode_failed',
    ]);
}

$encoded .= "\n";

if (!is_dir(JMILLER_DATA_DIR)) {
    if (!mkdir(JMILLER_DATA_DIR, 0755, true) && !is_dir(JMILLER_DATA_DIR)) {
        respond(500, [
            'ok' => false,
            'error' => 'data_dir_create_failed',
        ]);
    }
}

$finalPath = JMILLER_DATA_DIR . '/' . $allowedTargets[$target];
$tempPath = $finalPath . '.tmp-' . bin2hex(random_bytes(8));

$bytesWritten = @file_put_contents($tempPath, $encoded, LOCK_EX);
if ($bytesWritten === false) {
    respond(500, [
        'ok' => false,
        'error' => 'write_failed',
    ]);
}

@chmod($tempPath, 0644);

if (!@rename($tempPath, $finalPath)) {
    @unlink($tempPath);
    respond(500, [
        'ok' => false,
        'error' => 'atomic_rename_failed',
    ]);
}

respond(200, [
    'ok' => true,
    'target' => $target,
    'file' => basename($finalPath),
    'bytes' => $bytesWritten,
    'compressed' => $wasCompressed,
    'saved_at' => date('c'),
]);
