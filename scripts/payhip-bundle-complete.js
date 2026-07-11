/**
 * payhip-bundle-complete.js v2 — NotionTemplaFix
 * UI analysis: "Add Product" opens a click-list (no checkboxes), pricing at /bundle/pricing/
 *
 * Steps:
 *  1. /bundle/products/NdT6c → click "Add Product" → click each NotionTemplaFix product
 *  2. /bundle/pricing/NdT6c  → set price $49.00
 *  3. Final screenshot → bundle-complete.png
 */
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const path = require('path');
const fs = require('fs');

const SESSION_DIR = 'C:\\Users\\Administrator\\contractfixpro\\scripts\\browser-session';
const OUT        = 'C:\\Users\\Administrator\\notiontemplafix\\scripts';
const BUNDLE_ID  = 'NdT6c';

// Exact product names that belong to NotionTemplaFix
const NTF_PRODUCTS = [
  'CRM Template',
  'Project Manager',
  'Budget Tracker',
  'Job Tracker',
  'Content Calendar',
  'Meeting Notes',
  'Study Planner',
  'Weekly Planner',
  'Personal Dashboard',
  'Freelancer Hub',
  'Content Creator OS',
  'Finance Tracker Pro',
  'Student OS',
  'Business OS',
  'Second Brain',
  'Life OS Dashboard',
];

let step = 0;
function log(msg) { console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`); }
async function ss(page, name) {
  step++;
  const file = path.join(OUT, `bc${String(step).padStart(2,'0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  log(`Screenshot: ${path.basename(file)}`);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false, slowMo: 60, viewport: { width: 1280, height: 900 }
  });
  const page = browser.pages()[0] || await browser.newPage();

  try {
    // ════════════════════════════════════════════════════════════════════════
    // PHASE 1 — Add each NotionTemplaFix product one by one
    // ════════════════════════════════════════════════════════════════════════
    log('=== PHASE 1: Add NotionTemplaFix products ===');

    for (let i = 0; i < NTF_PRODUCTS.length; i++) {
      const productName = NTF_PRODUCTS[i];
      log(`[${i+1}/${NTF_PRODUCTS.length}] Adding: "${productName}"`);

      // Reload bundle products page for each product (picker closes after each add)
      await page.goto(`https://payhip.com/bundle/products/${BUNDLE_ID}`, {
        waitUntil: 'domcontentloaded', timeout: 30000
      });
      await sleep(1500);

      // Click "Add Product" to open the picker
      const addBtn = page.locator('button:has-text("Add Product"), a:has-text("Add Product")').first();
      if (await addBtn.count() === 0) {
        log(`  ERROR: "Add Product" button not found`);
        continue;
      }
      await addBtn.click();
      await sleep(1500);

      // The picker is a dropdown/list of clickable <a href="#!"> items
      // Find the one matching our product name and click it
      const clicked = await page.evaluate((name) => {
        // Search in any visible dropdown/popup/modal
        const allLinks = Array.from(document.querySelectorAll('a, li, [role="option"], [role="menuitem"]'));
        // Filter to visible ones
        const visible = allLinks.filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
        });
        const match = visible.find(el => {
          const text = (el.innerText || el.textContent || '').trim();
          return text === name || text.startsWith(name);
        });
        if (match) {
          match.click();
          return 'clicked: ' + (match.innerText || match.textContent).trim().slice(0, 60);
        }
        // Fallback: partial match
        const partial = visible.find(el => {
          const text = (el.innerText || el.textContent || '').trim();
          return text.includes(name);
        });
        if (partial) {
          partial.click();
          return 'partial-match: ' + (partial.innerText || partial.textContent).trim().slice(0, 60);
        }
        return null;
      }, productName);

      if (clicked) {
        log(`  Clicked: ${clicked}`);
        await sleep(1500); // wait for add to process
      } else {
        log(`  WARN: could not find "${productName}" in picker — may already be added or wrong name`);
        // Take screenshot for diagnosis
        await ss(page, `miss-${productName.replace(/\s+/g,'-').toLowerCase()}`);
      }
    }

    // Verify — reload and count products in bundle
    await page.goto(`https://payhip.com/bundle/products/${BUNDLE_ID}`, {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await sleep(2000);
    await ss(page, 'products-after-all-adds');

    const pageText = await page.evaluate(() => document.body.innerText);
    log('Bundle products page text (first 1500 chars):\n' + pageText.slice(0, 1500));

    // Count how many NTF products appear on the page
    let found = 0;
    for (const p of NTF_PRODUCTS) {
      if (pageText.includes(p)) found++;
    }
    log(`Products visible in bundle: ${found}/${NTF_PRODUCTS.length}`);

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 2 — Set price at /bundle/pricing/NdT6c
    // ════════════════════════════════════════════════════════════════════════
    log('=== PHASE 2: Set price $49.00 at /bundle/pricing/ ===');

    await page.goto(`https://payhip.com/bundle/pricing/${BUNDLE_ID}`, {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await sleep(2500);
    await ss(page, 'pricing-page');
    log('Pricing URL: ' + page.url());

    // Dump visible clickables to understand the page UI
    const pricingClickables = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a,button,[role="button"],[role="tab"]'))
        .filter(e => e.offsetParent !== null)
        .map(e => ({ tag: e.tagName, text: (e.innerText||'').trim().slice(0,60), cls: e.className.slice(0,60) }))
        .filter(e => e.text)
    );
    log('Pricing page visible clickables:');
    pricingClickables.forEach(i => log(`  [${i.tag}] "${i.text}" cls="${i.cls}"`));

    // Click "Add Pricing Plan" or "One-time" option if present
    const addPlanResult = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('button,a,[role="button"]'))
        .filter(e => e.offsetParent !== null);
      const addPlan = candidates.find(e => {
        const t = (e.innerText||'').toLowerCase();
        return t.includes('add') || t.includes('one-time') || t.includes('one time') || t.includes('pricing plan');
      });
      if (addPlan) { addPlan.click(); return 'clicked: ' + addPlan.innerText.trim().slice(0,40); }
      // Try clicking the one-time radio even if hidden
      const oneTimeRadio = document.querySelector('input[type="radio"][value="one-time"]');
      if (oneTimeRadio) { oneTimeRadio.click(); return 'clicked one-time radio'; }
      return 'nothing found';
    });
    log('Add plan click: ' + addPlanResult);
    await sleep(1500);
    await ss(page, 'pricing-after-add-click');

    // Now set price using JS directly on the hidden field (known name: one_time_price)
    const priceResult = await page.evaluate(() => {
      // Select one-time pricing radio
      const oneTimeRadio = document.querySelector('input[name="pricing_type"][value="one-time"]');
      if (oneTimeRadio) {
        oneTimeRadio.checked = true;
        oneTimeRadio.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Set the one-time price field
      const priceField = document.querySelector('input[name="one_time_price"]');
      if (priceField) {
        priceField.value = '49';
        priceField.dispatchEvent(new Event('input', { bubbles: true }));
        priceField.dispatchEvent(new Event('change', { bubbles: true }));
        return 'set one_time_price to 49, radio=' + (oneTimeRadio ? 'found' : 'not found');
      }
      // Fallback: any text input with a price-like name
      const fallback = Array.from(document.querySelectorAll('input[type="text"],input[type="number"]'))
        .find(el => el.name?.includes('price'));
      if (fallback) {
        fallback.value = '49';
        fallback.dispatchEvent(new Event('input', { bubbles: true }));
        fallback.dispatchEvent(new Event('change', { bubbles: true }));
        return 'fallback: set ' + fallback.name + ' to 49';
      }
      return 'price field not found';
    });
    log('Price set result: ' + priceResult);
    await ss(page, 'price-set');

    // Click save via JS (button is type="button" class="js-save-changes-button", may be hidden)
    const saveResult = await page.evaluate(() => {
      // Try visible first
      const visible = Array.from(document.querySelectorAll('button'))
        .find(b => b.offsetParent !== null && (
          b.textContent.toLowerCase().includes('save') ||
          b.textContent.toLowerCase().includes('update') ||
          b.classList.contains('js-save-changes-button')
        ));
      if (visible) { visible.click(); return 'clicked visible: ' + visible.textContent.trim().slice(0,40); }

      // Force click hidden save button
      const hidden = document.querySelector('.js-save-changes-button, button.btn-primary');
      if (hidden) { hidden.click(); return 'force-clicked: ' + hidden.textContent.trim().slice(0,40); }

      // Submit form
      const form = document.querySelector('form');
      if (form) { form.submit(); return 'form submitted'; }

      return 'nothing to click';
    });
    log('Save result: ' + saveResult);
    await sleep(4000);
    await ss(page, 'after-pricing-save');
    log('After save URL: ' + page.url());

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 3 — Final screenshot of public bundle page
    // ════════════════════════════════════════════════════════════════════════
    log('=== PHASE 3: Final screenshot ===');

    await page.goto(`https://payhip.com/b/${BUNDLE_ID}`, {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await sleep(3000);

    const finalFile = path.join(OUT, 'bundle-complete.png');
    await page.screenshot({ path: finalFile, fullPage: false });
    log(`Saved: bundle-complete.png`);

    const finalText = await page.evaluate(() => document.body.innerText.slice(0, 800));
    log('Public bundle page:\n' + finalText);

    log('\n=== COMPLETE ===');
    log('Public URL: https://payhip.com/b/' + BUNDLE_ID);
    log('Manage:     https://payhip.com/bundle/products/' + BUNDLE_ID);

    await sleep(10000);

  } catch (e) {
    log('ERROR: ' + e.message);
    log(e.stack || '');
    await page.screenshot({ path: path.join(OUT, 'bc-error.png') }).catch(() => {});
  } finally {
    await browser.close().catch(() => {});
  }
})();
