/**
 * payhip-login.js — Open browser and wait for manual Payhip login
 * Run this once to restore the browser session, then run payhip-bundle-page.js
 */
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const SESSION_DIR = 'C:/Users/Administrator/contractfixpro/scripts/browser-session';
const EMAIL = 'xiaohuixie3@gmail.com';

function log(msg) { console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false, slowMo: 30, viewport: { width: 1280, height: 900 }
  });
  const page = browser.pages()[0] || await browser.newPage();

  log('Navigating to Payhip...');
  await page.goto('https://payhip.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(1000);

  // Pre-fill email
  const emailField = page.locator('input[name="email"], input[type="email"]').first();
  if (await emailField.count() > 0) {
    await emailField.fill(EMAIL);
    log('Email pre-filled: ' + EMAIL);
  }

  log('');
  log('=======================================================');
  log('PLEASE TYPE YOUR PASSWORD IN THE BROWSER AND CLICK LOGIN');
  log('Waiting for login to complete...');
  log('=======================================================');

  // Wait until we're past the login page (up to 5 minutes)
  await page.waitForFunction(() => !location.href.includes('/auth/login'), { timeout: 300000 });
  log('Login detected! Current URL: ' + page.url());
  log('Session saved. You can now run payhip-bundle-page.js');

  await sleep(2000);
  await browser.close().catch(() => {});
})();
