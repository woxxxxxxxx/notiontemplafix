<?php
require_once __DIR__ . '/webhook_config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON payload']);
    exit;
}

// Payhip sends signature = sha256(API key) in the JSON payload.
$expectedSignature = hash('sha256', WEBHOOK_SECRET);
$receivedSignature = (string)($payload['signature'] ?? '');
if (!hash_equals($expectedSignature, $receivedSignature)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Invalid signature']);
    exit;
}

if (($payload['type'] ?? '') !== 'paid') {
    echo json_encode(['ok' => true, 'ignored' => $payload['type'] ?? 'unknown']);
    exit;
}

$buyerEmail = strtolower(trim($payload['email'] ?? ''));
if (empty($buyerEmail) || !filter_var($buyerEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing buyer email']);
    exit;
}

$items = $payload['items'] ?? [];
if (!is_array($items) || count($items) === 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing purchased items']);
    exit;
}

$slugByName = [
    'Life OS Dashboard' => 'life-os',
    'Second Brain' => 'second-brain',
    'Business OS' => 'business-os',
    'Student OS' => 'student-os',
    'Finance Tracker Pro' => 'finance-tracker-pro',
    'Content Creator OS' => 'content-creator-os',
    'Freelancer Hub' => 'freelancer-hub',
    'Personal Dashboard' => 'personal-dashboard',
    'Weekly Planner' => 'weekly-planner',
    'Study Planner' => 'study-planner',
    'Meeting Notes' => 'meeting-notes',
    'Project Manager' => 'project-manager',
    'Budget Tracker' => 'budget-tracker',
    'Content Calendar' => 'content-calendar',
    'Job Tracker' => 'job-tracker',
    'CRM Template' => 'crm-template',
    'All Templates Bundle' => 'bundle',
];

$slugByKey = [
    'x7IdT' => 'life-os',
    '3jXDd' => 'second-brain',
    'bPxcu' => 'business-os',
    'ClqYb' => 'student-os',
    '37Ua0' => 'finance-tracker-pro',
    'qQLj2' => 'content-creator-os',
    'CeA5t' => 'freelancer-hub',
    'TRndY' => 'personal-dashboard',
    '4kUJT' => 'weekly-planner',
    'yt30b' => 'study-planner',
    'yM0lP' => 'meeting-notes',
    'q0wOL' => 'project-manager',
    'Nwc9x' => 'budget-tracker',
    '1qG4n' => 'content-calendar',
    'PtdkO' => 'job-tracker',
    'kZMFo' => 'crm-template',
    'NdT6c' => 'bundle',
];

function normalise_slug($name) {
    $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', trim($name)));
    return trim($slug, '-');
}

function load_purchases($jsonFile) {
    $data = ['emails' => [], 'orders' => []];
    if (!file_exists($jsonFile)) return $data;
    $decoded = json_decode(file_get_contents($jsonFile), true);
    if (!is_array($decoded)) return $data;
    $isList = array_keys($decoded) === range(0, count($decoded) - 1);
    if ($isList) {
        $data['emails'] = array_values(array_unique(array_map('strtolower', $decoded)));
    } else {
        $data['emails'] = array_values(array_unique(array_map('strtolower', $decoded['emails'] ?? [])));
        $data['orders'] = is_array($decoded['orders'] ?? null) ? $decoded['orders'] : [];
    }
    return $data;
}

function order_exists($orders, $email, $slug, $transactionId) {
    foreach ($orders as $order) {
        if (strtolower($order['email'] ?? '') !== $email) continue;
        if (strtolower($order['product'] ?? '') !== $slug) continue;
        if ($transactionId && ($order['transaction_id'] ?? '') === $transactionId) return true;
        if (!$transactionId) return true;
    }
    return false;
}

$jsonFile = __DIR__ . '/purchased.json';
$data = load_purchases($jsonFile);
if (!in_array($buyerEmail, $data['emails'], true)) $data['emails'][] = $buyerEmail;

$transactionId = (string)($payload['id'] ?? '');
$currency = strtoupper((string)($payload['currency'] ?? 'USD'));
$amountUsd = isset($payload['price']) ? ((float)$payload['price'] / 100) : 0;
$dateOnly = isset($payload['date']) ? date('Y-m-d', (int)$payload['date']) : date('Y-m-d');
$savedProducts = [];

foreach ($items as $item) {
    if (!is_array($item)) continue;
    $productName = trim((string)($item['product_name'] ?? 'Unknown Product'));
    $productKey = trim((string)($item['product_key'] ?? ''));
    $slug = $slugByKey[$productKey] ?? ($slugByName[$productName] ?? normalise_slug($productName));
    if ($slug === '') continue;
    $isBundle = $slug === 'bundle' || stripos($productName, 'bundle') !== false;

    if (!order_exists($data['orders'], $buyerEmail, $slug, $transactionId)) {
        $data['orders'][] = [
            'email' => $buyerEmail,
            'product' => $slug,
            'product_name' => $productName,
            'product_key' => $productKey,
            'bundle' => $isBundle,
            'transaction_id' => $transactionId,
            'source' => 'payhip-webhook',
            'created_at' => gmdate('c'),
        ];
    }
    $savedProducts[] = $slug;
}

file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);

// Best-effort Notion log. Purchase unlock must not fail if Notion is temporarily unavailable.
if (defined('NOTION_TOKEN') && defined('NOTION_DATABASE_ID') && function_exists('curl_init')) {
    foreach ($savedProducts as $slug) {
        $notionBody = json_encode([
            'parent' => ['database_id' => NOTION_DATABASE_ID],
            'properties' => [
                'Product' => ['title' => [['text' => ['content' => $slug]]]],
                'Email' => ['email' => $buyerEmail],
                'Amount' => ['number' => $amountUsd],
                'Date' => ['date' => ['start' => $dateOnly]],
                'Status' => ['select' => ['name' => 'Paid']],
            ],
        ]);
        $ch = curl_init('https://api.notion.com/v1/pages');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $notionBody,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . NOTION_TOKEN,
                'Content-Type: application/json',
                'Notion-Version: 2022-06-28',
            ],
            CURLOPT_TIMEOUT => 5,
        ]);
        curl_exec($ch);
        curl_close($ch);
    }
}

echo json_encode([
    'ok' => true,
    'email' => $buyerEmail,
    'products' => array_values(array_unique($savedProducts)),
    'currency' => $currency,
]);
