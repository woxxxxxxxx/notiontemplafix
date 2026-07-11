/**
 * payhip-set-price.js v3 — Set $49 one-time price on bundle NdT6c
 * Use Playwright native locators + force:true (jQuery binding compat)
 */
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const path = require('path');
const SESSION_DIR = 'C:/Users/Administrator/contractfixpro/scripts/browser-session';
const OUT = 'C:/Users/Administrator/notiontemplafix/scripts';
const BUNDLE_ID = 'NdT6c';

function log(msg) { console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
let step = 0;
async function ss(page, name) {
  step++;
  const f = path.join(OUT, `sp${String(step).padStart(2,'0')}-${name}.png`);
  await page.screenshot({ path: f, fullPage: false });
  log(`Screenshot: ${path.basename(f)}`);
}

(async () => {
  const browser = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false, slowMo: 60, viewport: { width: 1280, height: 900 }
  });
  const page = browser.pages()[0] || await browser.newPage();

  try {
    await page.goto(`https://payhip.com/bundle/pricing/${BUNDLE_ID}`, {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await sleep(2000);
    await ss(page, 'start');

    // ── Open modal via Playwright click ──────────────────────────────────────
    const openBtn = page.locator('.js-show-add-edit-pricing-plan-modal-button').first();
    await openBtn.click();
    log('Clicked Add Pricing Plan');

    // Wait for modal to have class "in"
    await page.waitForFunction(() => {
      const m = document.querySelector('#add-edit-pricing-plan-modal');
      return m && m.classList.contains('in');
    }, { timeout: 10000 });
    await sleep(600);
    await ss(page, 'modal-open');
    log('Modal visible');

    // ── Click "One-Time Purchase" radio ───────────────────────────────────────
    const oneTimeRadio = page.locator('#add-edit-pricing-plan-modal input[name="pricing_type"][value="one-time"]');
    await oneTimeRadio.click({ force: true });
    log('Clicked one-time radio');
    await sleep(500);
    await ss(page, 'one-time-selected');

    // ── Fill price field ──────────────────────────────────────────────────────
    const priceField = page.locator('#add-edit-pricing-plan-modal input[name="one_time_price"]');
    await priceField.click({ force: true, clickCount: 3 });
    await priceField.fill('49', { force: true });
    log('Filled price: 49');

    // Also trigger events via JS to ensure jQuery picks it up
    await page.evaluate(() => {
      const f = document.querySelector('#add-edit-pricing-plan-modal input[name="one_time_price"]');
      if (f) {
        f.value = '49';
        // Fire jQuery change if available
        if (typeof $ !== 'undefined') {
          $(f).trigger('change').trigger('input');
        } else {
          f.dispatchEvent(new Event('input', { bubbles: true }));
          f.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await sleep(300);
    await ss(page, 'price-filled');

    // ── Fill plan name (may be required) ─────────────────────────────────────
    const nameField = page.locator('#add-edit-pricing-plan-modal input[name="name"]');
    if (await nameField.count() > 0) {
      await nameField.fill('One-Time Access — $49', { force: true });
      log('Filled plan name');
    }
    await ss(page, 'form-ready');

    // ── Click Save button inside modal using Playwright + force ───────────────
    const saveBtn = page.locator('#add-edit-pricing-plan-modal .js-save-changes-button').first();
    if (await saveBtn.count() > 0) {
      const btnText = await saveBtn.innerText().catch(() => '?');
      log(`Save button text: "${btnText.trim()}"`);

      // Try normal click first
      try {
        await saveBtn.click({ timeout: 5000 });
        log('Normal click succeeded');
      } catch {
        // Force click
        log('Normal click failed, trying force click...');
        await saveBtn.click({ force: true });
        log('Force click done');
      }
    } else {
      log('WARN: save button not found in modal');
    }

    // Wait for modal to close OR for success toast
    const closed = await Promise.race([
      page.waitForFunction(() => {
        const m = document.querySelector('#add-edit-pricing-plan-modal');
        return !m || !m.classList.contains('in');
      }, { timeout: 10000 }).then(() => 'modal-closed'),
      page.waitForSelector('.alert-success, .toast-success, [class*="success"]', {
        timeout: 10000
      }).then(() => 'success-toast').catch(() => null),
      sleep(10000).then(() => 'timeout'),
    ]);
    log('Result: ' + closed);

    await sleep(1500);
    await ss(page, 'after-save');

    // Check if modal has any error messages
    const modalErrors = await page.evaluate(() => {
      const modal = document.querySelector('#add-edit-pricing-plan-modal');
      if (!modal) return 'modal gone';
      const errors = modal.querySelectorAll('.error, .alert-danger, .text-danger, [class*="error"], [class*="invalid"]');
      const errorTexts = Array.from(errors).map(e => e.innerText?.trim()).filter(Boolean);
      return errorTexts.length ? 'ERRORS: ' + errorTexts.join(' | ') : 'no errors visible, modal cls=' + modal.className;
    });
    log('Modal state: ' + modalErrors);

    // ── Verify ────────────────────────────────────────────────────────────────
    await page.goto(`https://payhip.com/bundle/pricing/${BUNDLE_ID}`, {
      waitUntil: 'domcontentloaded', timeout: 20000
    });
    await sleep(2000);
    await ss(page, 'verify');
    const verifyText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    log('Pricing verify:\n' + verifyText);

    // ── Public page final screenshot ──────────────────────────────────────────
    await page.goto(`https://payhip.com/b/${BUNDLE_ID}`, {
      waitUntil: 'domcontentloaded', timeout: 20000
    });
    await sleep(3000);
    await page.screenshot({ path: path.join(OUT, 'bundle-complete.png'), fullPage: false });
    log('Saved bundle-complete.png');
    const pubText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    log('Public page:\n' + pubText);

    await sleep(8000);

  } catch (e) {
    log('ERROR: ' + e.message);
    await page.screenshot({ path: path.join(OUT, 'sp-error.png') }).catch(() => {});
  } finally {
    await browser.close().catch(() => {});
  }
})();
