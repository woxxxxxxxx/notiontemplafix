<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://notiontemplafix.com');
header('Access-Control-Allow-Methods: POST');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['unlocked' => false, 'error' => 'Method not allowed']);
    exit;
}

$email = strtolower(trim($_POST['email'] ?? ''));
$product = strtolower(trim($_POST['product'] ?? ''));

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['unlocked' => false, 'error' => 'Invalid email']);
    exit;
}

$jsonFile = __DIR__ . '/purchased.json';
if (!file_exists($jsonFile)) {
    echo json_encode(['unlocked' => false, 'products' => []]);
    exit;
}

$data = json_decode(file_get_contents($jsonFile), true);
if (!is_array($data)) {
    echo json_encode(['unlocked' => false, 'products' => []]);
    exit;
}

$legacyEmails = [];
$legacyMode = false;
$orders = [];

$isList = array_keys($data) === range(0, count($data) - 1);
if ($isList) {
    $legacyMode = true;
    $legacyEmails = array_map('strtolower', $data);
} else {
    $orders = $data['orders'] ?? [];
}

$products = [];
$hasBundle = false;

foreach ($orders as $order) {
    $orderEmail = strtolower(trim($order['email'] ?? ''));
    if ($orderEmail !== $email) continue;

    $slug = strtolower(trim($order['product'] ?? ''));
    if ($slug !== '') $products[] = $slug;
    if (($order['bundle'] ?? false) || $slug === 'bundle') $hasBundle = true;
}

$legacyMatch = $legacyMode && in_array($email, $legacyEmails, true);
$productMatch = $hasBundle || ($product !== '' && in_array($product, $products, true));

echo json_encode([
    'unlocked' => $productMatch || $legacyMatch,
    'bundle' => $hasBundle,
    'products' => array_values(array_unique($products)),
    'legacy' => $legacyMatch,
]);
