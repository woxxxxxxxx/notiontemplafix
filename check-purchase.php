<?php
// NotionTemplaFix — Check if email has purchased
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://notiontemplafix.com');
header('Access-Control-Allow-Methods: POST');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['unlocked' => false, 'error' => 'Method not allowed']);
    exit;
}

$email = strtolower(trim($_POST['email'] ?? ''));
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['unlocked' => false, 'error' => 'Invalid email']);
    exit;
}

$jsonFile = __DIR__ . '/purchased.json';
if (!file_exists($jsonFile)) {
    echo json_encode(['unlocked' => false]);
    exit;
}

$content = file_get_contents($jsonFile);
$emails  = json_decode($content, true);
if (!is_array($emails)) {
    echo json_encode(['unlocked' => false]);
    exit;
}

$emails = array_map('strtolower', $emails);
echo json_encode(['unlocked' => in_array($email, $emails)]);
