const https = require('https');
const data = JSON.stringify({
  title: 'All Templates Bundle — NotionTemplaFix',
  price: 4900,
  currency: 'USD',
  description: 'Get all premium Notion templates + web apps in one bundle. Includes: Life OS, Project Manager, Budget Tracker, Content Calendar, Job Tracker, CRM, Goal Tracker, Habit Tracker, Book Tracker, and more. Save over 60% vs buying individually.'
});
const options = {
  hostname: 'payhip.com',
  path: '/api/v1/product',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer a2aba929e0ecce6a493a078d35f674eae304e244',
    'Content-Length': Buffer.byteLength(data)
  }
};
const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    // Only print first 500 chars to avoid Cloudflare HTML wall
    console.log('Body:', body.slice(0, 500));
    // Try to parse JSON
    try { console.log('JSON:', JSON.parse(body)); } catch(_) {}
  });
});
req.on('error', e => console.error('Error:', e.message));
req.write(data);
req.end();
