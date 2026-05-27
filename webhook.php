<?php
// ============================================================
// NotionTemplaFix — Lemon Squeezy Webhook Handler
// ============================================================
require_once __DIR__ . '/webhook_config.php';

// Product → Notion template link mapping
$TEMPLATE_LINKS = [
    'Life OS Dashboard' => 'https://www.notion.so/Life-OS-Dashboard-36c0d96a912180d99db3fca490b0fed7',
    'Project Manager'   => '',
    'Budget Tracker'    => '',
    'Content Calendar'  => '',
    'Job Tracker'       => '',
    'CRM Template'      => '',
];

// ── 1. Read raw payload ──────────────────────────────────────
$rawPayload = file_get_contents('php://input');
if (empty($rawPayload)) {
    http_response_code(400);
    exit('Empty payload');
}

// ── 2. Verify Lemon Squeezy HMAC-SHA256 signature ───────────
$signatureHeader = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
$expected = hash_hmac('sha256', $rawPayload, WEBHOOK_SECRET);
if (!hash_equals($expected, $signatureHeader)) {
    http_response_code(401);
    exit('Invalid signature');
}

// ── 3. Decode JSON ───────────────────────────────────────────
$data = json_decode($rawPayload, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    exit('Invalid JSON');
}

$eventName = $data['meta']['event_name'] ?? '';
if ($eventName !== 'order_created') {
    http_response_code(200);
    exit('Event ignored');
}

// ── 4. Extract order fields ──────────────────────────────────
$attrs       = $data['data']['attributes'] ?? [];
$firstItem   = $attrs['first_order_item']  ?? [];

$productName = trim($firstItem['product_name'] ?? 'Unknown Product');
$buyerEmail  = trim($attrs['user_email']        ?? '');
$buyerName   = trim($attrs['user_name']         ?? 'Customer');
$amountCents = (int)($attrs['total']            ?? 0);
$amountUsd   = round($amountCents / 100, 2);
$createdAt   = $attrs['created_at']             ?? date('c');
$orderNumber = $attrs['order_number']           ?? '';

// Normalise ISO date to YYYY-MM-DD for Notion
$dateOnly = substr($createdAt, 0, 10);

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
