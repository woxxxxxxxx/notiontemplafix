<?php
// ============================================================
// NotionTemplaFix — Payhip Webhook Handler
// ============================================================
require_once __DIR__ . '/webhook_config.php';

// ── 1. Accept POST only ──────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

// ── 2. Verify Payhip security key ───────────────────────────
// Payhip sends security_key as a POST field matching the key
// you configured in Payhip → Settings → Webhooks → Security Key
$securityKey = $_POST['security_key'] ?? '';
if (empty($securityKey) || !hash_equals(WEBHOOK_SECRET, $securityKey)) {
    http_response_code(401);
    exit('Invalid security key');
}

// ── 3. Extract Payhip order fields ──────────────────────────
// Payhip sends form-encoded POST data (not JSON)
$productName = trim($_POST['product_name'] ?? 'Unknown Product');
$buyerEmail  = trim($_POST['email']         ?? '');
$buyerName   = trim($_POST['name']          ?? 'Customer');
$price       = trim($_POST['price']         ?? '0');
$currency    = strtoupper(trim($_POST['currency'] ?? 'USD'));
$orderNumber = trim($_POST['order_number']  ?? '');
$payDate     = trim($_POST['pay_date']      ?? date('Y-m-d'));
$country     = trim($_POST['country']       ?? '');

// Normalise price to float (Payhip sends as "9.00" not cents)
$amountUsd = (float)$price;

// Normalise date to YYYY-MM-DD for Notion
// Payhip sends pay_date in various formats; try to parse safely
$dateOnly = date('Y-m-d'); // fallback
if (!empty($payDate)) {
    $ts = strtotime($payDate);
    if ($ts !== false) $dateOnly = date('Y-m-d', $ts);
}

// ── 4. Append buyer email to purchased.json ─────────────────
if (!empty($buyerEmail)) {
    $jsonFile = __DIR__ . '/purchased.json';
    $emails = [];
    if (file_exists($jsonFile)) {
        $decoded = json_decode(file_get_contents($jsonFile), true);
        if (is_array($decoded)) $emails = $decoded;
    }
    $emailLower = strtolower($buyerEmail);
    if (!in_array($emailLower, array_map('strtolower', $emails))) {
        $emails[] = $emailLower;
        file_put_contents($jsonFile, json_encode($emails, JSON_PRETTY_PRINT), LOCK_EX);
    }
}

// ── 5. Write to Notion Orders database ──────────────────────
$notionBody = json_encode([
    'parent'     => ['database_id' => NOTION_DATABASE_ID],
    'properties' => [
        'Product' => ['title'  => [['text' => ['content' => $productName]]]],
        'Email'   => ['email'  => $buyerEmail],
        'Amount'  => ['number' => $amountUsd],
        'Date'    => ['date'   => ['start' => $dateOnly]],
        'Status'  => ['select' => ['name'  => 'Paid']],
    ],
]);

$ch = curl_init('https://api.notion.com/v1/pages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $notionBody,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . NOTION_TOKEN,
        'Content-Type: application/json',
        'Notion-Version: 2022-06-28',
    ],
    CURLOPT_TIMEOUT        => 10,
]);
$notionResponse = curl_exec($ch);
$notionStatus   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$notionOk = ($notionStatus === 200);

// ── 6. Resolve template link ─────────────────────────────────
$templateLink = $TEMPLATE_LINKS[$productName] ?? '';
$hasLink = !empty($templateLink);

// ── 7. Build and send email ──────────────────────────────────
if (!empty($buyerEmail)) {
    $subject = "Your Notion Template is Ready — {$productName}";

    if ($hasLink) {
        $templateSection = <<<TEXT

Access your template here:
  {$templateLink}

How to use it:
  1. Click the link above to open the Notion template
  2. Click "Duplicate" in the top-right corner of the page
  3. The template will be copied to your own Notion workspace
  4. Start customising it to fit your needs!

TEXT;
    } else {
        $templateSection = <<<TEXT

Your template link will be delivered within 24 hours.
If you have not received it by then, please contact us at {SUPPORT_EMAIL}.

TEXT;
    }

    $amountFormatted = '$' . number_format($amountUsd, 2);
    $emailBody = <<<TEXT
Hi {$buyerName},

Thank you for purchasing {$productName} from NotionTemplaFix!

Order summary:
  Product : {$productName}
  Amount  : {$amountFormatted}
  Order # : {$orderNumber}
  Date    : {$dateOnly}
{$templateSection}
─────────────────────────────────
Questions? Reply to this email or visit {SITE_URL}

Best regards,
The NotionTemplaFix Team
{SITE_URL}
TEXT;

    $emailBody = str_replace(
        ['{SUPPORT_EMAIL}', '{SITE_URL}'],
        [SUPPORT_EMAIL,     SITE_URL],
        $emailBody
    );

    $mailHeaders  = "From: " . SITE_NAME . " <" . FROM_EMAIL . ">\r\n";
    $mailHeaders .= "Reply-To: " . SUPPORT_EMAIL . "\r\n";
    $mailHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $mailHeaders .= "X-Mailer: PHP/" . PHP_VERSION;

    mail($buyerEmail, $subject, $emailBody, $mailHeaders);
}

// ── 8. Respond ───────────────────────────────────────────────
http_response_code(200);
header('Content-Type: application/json');
echo json_encode([
    'ok'           => true,
    'notion_saved' => $notionOk,
    'email_sent'   => !empty($buyerEmail),
    'product'      => $productName,
]);
