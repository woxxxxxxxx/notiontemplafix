/**
 * payhip-bundle-create.js v4 — NotionTemplaFix
 * Strategy: navigate directly to /product/add/bundle (bypass modal click interception)
 * Fallback: JS eval click on bundle anchor inside modal
 */
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const path = require('path');
const SESSION_DIR = 'C:\\Users\\Administrator\\contractfixpro\\scripts\\browser-session';
const OUT = 'C:\\Users\\Administrator\\notiontemplafix\\scripts';

let step = 0;
function log(msg) { console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`); }
async function ss(page, name) {
  step++;
  const file = path.join(OUT, `s${String(step).padStart(2,'0')}-${name}.png`);
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
    // ── Verify login ───────────────────────────────────────────────────────────
    await page.goto('https://payhip.com/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);
    await ss(page, 'dashboard');
    log('Dashboard URL: ' + page.url());

    // ── Strategy 1: Navigate directly to /product/add/bundle ──────────────────
    log('Strategy 1: direct URL /product/add/bundle');
    await page.goto('https://payhip.com/product/add/bundle', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(2000);
    await ss(page, 'direct-bundle-url');
    log('URL after direct nav: ' + page.url());

    const isCreatePage = page.url().includes('bundle') || page.url().includes('add') || page.url().includes('product/new');
    if (isCreatePage && !page.url().includes('404') && !page.url().includes('dashboard')) {
      log('SUCCESS — bundle create page reached via direct URL');
      await fillBundleForm(page, ss, log, sleep, OUT);
      return;
    }

    // ── Strategy 2: Open + Add New, then JS-eval click Bundle anchor ──────────
    log('Strategy 2: open modal, JS-eval click bundle anchor');
    await page.goto('https://payhip.com/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(2000);

    const addNew = page.locator('a:has-text("+ Add New"), button:has-text("+ Add New"), a:has-text("Add New")').first();
    if (await addNew.count() > 0) {
      await addNew.click();
      await sleep(1500);
      await ss(page, 'modal-open');

      // Dump all anchors inside modal
      const modalLinks = await page.evaluate(() => {
        const modal = document.querySelector('.select-product-type-modal, [class*="product-type-modal"], [class*="add-product"]');
        if (!modal) return { found: false, links: [] };
        const links = Array.from(modal.querySelectorAll('a, [data-link], [href], li'));
        return {
          found: true,
          modalClass: modal.className,
          links: links.map(el => ({
            tag: el.tagName,
            href: el.href || el.getAttribute('data-link') || el.getAttribute('href') || '',
            text: el.innerText?.trim().slice(0, 60),
            cls: el.className
          }))
        };
      });
      log('Modal info: ' + JSON.stringify(modalLinks, null, 2));

      // Try JS-eval click on bundle-related anchor
      const clicked = await page.evaluate(() => {
        // Look in modal for bundle link
        const selectors = [
          '.select-product-type-modal a[href*="bundle"]',
          '[class*="product-type-modal"] a[href*="bundle"]',
          'a[href*="product/add/bundle"]',
          '.bundle-product-type',
          '[data-link*="bundle"]',
          '.select-product-type-modal li.bundle',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) { el.click(); return 'clicked: ' + sel + ' href=' + (el.href || el.getAttribute('data-link') || ''); }
        }
        // Fallback: find any element containing "Bundle" text inside modal
        const modal = document.querySelector('.select-product-type-modal, [class*="product-type-modal"]');
        if (modal) {
          const all = modal.querySelectorAll('a, li, button, [role="option"]');
          for (const el of all) {
            if (el.textContent && el.textContent.toLowerCase().includes('bundle')) {
              el.click();
              return 'clicked-text: ' + el.tagName + ' ' + el.textContent.trim().slice(0,40);
            }
          }
        }
        // Last resort: navigate directly
        window.location.href = 'https://payhip.com/product/add/bundle';
        return 'navigated';
      });
      log('JS eval result: ' + clicked);
      await sleep(3000);
      await ss(page, 'after-js-click');
      log('URL after JS click: ' + page.url());

      if (page.url().includes('bundle') || page.url().includes('add')) {
        log('Bundle create page reached');
        await fillBundleForm(page, ss, log, sleep, OUT);
        return;
      }
    }

    // ── Strategy 3: Try alternate URL patterns ─────────────────────────────────
    log('Strategy 3: try alternate bundle URL patterns');
    for (const url of [
      'https://payhip.com/product/add/bundle',
      'https://payhip.com/products/add/bundle',
      'https://payhip.com/product/new/bundle',
      'https://payhip.com/bundle/add',
      'https://payhip.com/products/bundle/add',
    ]) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await sleep(1500);
      const u = page.url();
      log('Tried: ' + url + ' → ' + u);
      if (!u.includes('dashboard') && !u.includes('404') && !u.includes('login')) {
        await ss(page, 'found-bundle-page');
        log('Found bundle page at: ' + u);
        await fillBundleForm(page, ss, log, sleep, OUT);
        return;
      }
    }

    await ss(page, 'all-strategies-failed');
    log('All strategies failed — dumping page HTML snippet for analysis');
    const html = await page.content();
    const fs = require('fs');
    fs.writeFileSync(path.join(OUT, 'page-dump.html'), html.slice(0, 50000));
    log('Saved page-dump.html (first 50KB)');

    log('\nKeeping browser open 60s for manual inspection');
    await sleep(60000);

  } catch (e) {
    log('ERROR: ' + e.message);
    await page.screenshot({ path: path.join(OUT, 'error.png') }).catch(() => {});
  } finally {
    await browser.close().catch(() => {});
  }
})();

async function fillBundleForm(page, ss, log, sleep, OUT) {
  await ss(page, 'bundle-form');
  log('Bundle form URL: ' + page.url());

  // Dump inputs
  const inputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({
      type: el.type, name: el.name, id: el.id,
      placeholder: el.placeholder, visible: el.offsetParent !== null
    }))
  );
  log('Form inputs:');
  inputs.forEach(i => log(`  [${i.type}] name="${i.name}" id="${i.id}" placeholder="${i.placeholder}"`));

  // Fill title
  const titleSel = 'input[name="title"], input[placeholder*="title" i], input[placeholder*="name" i], #title, #product-title';
  const titleField = page.locator(titleSel).first();
  if (await titleField.count() > 0) {
    await titleField.fill('All Templates Bundle — NotionTemplaFix');
    log('Filled title');
    await ss(page, 'title-filled');
  } else {
    log('WARNING: title field not found');
  }

  // Set price (in cents via hidden field, or dollars in visible field)
  const priceSel = 'input[name="price"], input[placeholder*="price" i], #price';
  const priceField = page.locator(priceSel).first();
  if (await priceField.count() > 0) {
    await priceField.fill('49');
    log('Filled price: 49');
    await ss(page, 'price-filled');
  }

  // Fill description if available
  const descSel = 'textarea[name="description"], textarea[placeholder*="description" i], #description, [contenteditable]';
  const descField = page.locator(descSel).first();
  if (await descField.count() > 0) {
    await descField.fill('Get all premium Notion templates + web apps in one bundle. Includes: Life OS, Project Manager, Budget Tracker, Content Calendar, Job Tracker, CRM, Goal Tracker, Habit Tracker, Book Tracker, and more. Save over 60% vs buying individually.');
    log('Filled description');
    await ss(page, 'desc-filled');
  }

  await ss(page, 'form-ready');
  log('\nForm filled. Keeping browser open 120s — verify then submit manually or script will auto-submit');
  await sleep(10000);

  // Auto-submit
  const submitSel = 'button[type="submit"], input[type="submit"], button:has-text("Create"), button:has-text("Save"), button:has-text("Publish"), button:has-text("Add Bundle")';
  const submitBtn = page.locator(submitSel).first();
  if (await submitBtn.count() > 0) {
    const btnText = await submitBtn.innerText().catch(() => '?');
    log('Found submit button: "' + btnText + '" — clicking in 5s');
    await sleep(5000);
    await submitBtn.click();
    await sleep(5000);
    await ss(page, 'after-submit');
    log('After submit URL: ' + page.url());

    // Extract bundle URL/ID
    const finalUrl = page.url();
    if (finalUrl.includes('/b/') || finalUrl.includes('payhip.com/')) {
      log('BUNDLE URL: ' + finalUrl);
      const fs = require('fs');
      const out = { bundleUrl: finalUrl, createdAt: new Date().toISOString() };
      fs.writeFileSync(require('path').join(OUT, 'bundle-result.json'), JSON.stringify(out, null, 2));
      log('Saved bundle-result.json');
    }
  } else {
    log('No submit button found — keeping browser open 90s for manual review');
    await sleep(90000);
  }
}
