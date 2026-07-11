<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://notiontemplafix.com');
header('Access-Control-Allow-Methods: POST');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$email = strtolower(trim($_POST['email'] ?? ''));
$product = strtolower(trim($_POST['product'] ?? ''));
$bundle = ($_POST['bundle'] ?? '') === '1' || $product === 'bundle';

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['ok' => false, 'error' => 'Invalid email']);
    exit;
}

if (!$bundle && empty($product)) {
    echo json_encode(['ok' => false, 'error' => 'Missing product']);
    exit;
}

$jsonFile = __DIR__ . '/purchased.json';
$data = ['emails' => [], 'orders' => []];

if (file_exists($jsonFile)) {
    $decoded = json_decode(file_get_contents($jsonFile), true);
    if (is_array($decoded)) {
        $isList = array_keys($decoded) === range(0, count($decoded) - 1);
        if ($isList) {
            $data['emails'] = array_values(array_unique(array_map('strtolower', $decoded)));
        } else {
            $data['emails'] = array_values(array_unique(array_map('strtolower', $decoded['emails'] ?? [])));
            $data['orders'] = is_array($decoded['orders'] ?? null) ? $decoded['orders'] : [];
        }
    }
}

if (!in_array($email, $data['emails'], true)) $data['emails'][] = $email;

$exists = false;
foreach ($data['orders'] as $order) {
    if (strtolower($order['email'] ?? '') === $email && strtolower($order['product'] ?? '') === ($bundle ? 'bundle' : $product)) {
        $exists = true;
        break;
    }
}

if (!$exists) {
    $data['orders'][] = [
        'email' => $email,
        'product' => $bundle ? 'bundle' : $product,
        'bundle' => $bundle,
        'source' => 'payhip-js-success',
        'created_at' => gmdate('c'),
    ];
}

file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);

echo json_encode(['ok' => true]);
