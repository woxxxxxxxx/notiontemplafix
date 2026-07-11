/**
 * payhip-coupon.js v3 — Create 100% discount code TESTBUNDLE for bundle NdT6c
 * Entry: /bundle/pages/NdT6c → Marketing → Discount Codes → Create
 */
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const path = require('path');
const SESSION_DIR = 'C:/Users/Administrator/contractfixpro/scripts/browser-session';
const OUT = 'C:/Users/Administrator/notiontemplafix/scripts';
const EMAIL = 'xiaohuixie3@gmail.com';
const BUNDLE_ID = 'NdT6c';
const COUPON_CODE = 'TESTBUNDLE';
const DISCOUNT_PCT = '100';
const USE_LIMIT = '1';

function log(msg) { console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
let step = 0;
async function ss(page, name) {
  step++;
  const f = path.join(OUT, `coupon${String(step).padStart(2,'0')}-${name}.png`);
  await page.screenshot({ path: f, fullPage: true });
  log(`Screenshot: ${path.basename(f)}`);
}

async function tryGoto(page, url, timeout = 60000) {
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(url, { waitUntil: 'commit', timeout });
      await sleep(2000);
      return true;
    } catch(e) {
      log(`goto ${url} attempt ${i+1} failed: ${e.message.split('\n')[0]}`);
      if (i < 2) await sleep(3000);
    }
  }
  return false;
}

(async () => {
  const browser = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false, slowMo: 50, viewport: { width: 1280, height: 900 },
    proxy: { server: 'http://127.0.0.1:7897' }
  });
  const page = browser.pages()[0] || await browser.newPage();

  try {
    // ── Login check ───────────────────────────────────────────────────
    await tryGoto(page, 'https://payhip.com/dashboard', 60000);
    if (page.url().includes('/auth/login')) {
      log('Please login in browser...');
      const f = page.locator('input[type="email"]').first();
      if (await f.count() > 0) await f.fill(EMAIL);
      for (let i = 0; i < 60; i++) { await sleep(5000); if (!page.url().includes('/auth/login')) break; if (i%6===0) log(`Wait ${i*5}s`); }
      await sleep(2000);
    }
    log('Session OK: ' + page.url());

    // ── Start at bundle pages ─────────────────────────────────────────
    log('Navigating to bundle pages...');
    await tryGoto(page, `https://payhip.com/bundle/pages/${BUNDLE_ID}`, 60000);
    log('URL: ' + page.url());
    await ss(page, 'bundle-pages');

    // Log all navigation links
    const navLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav a, .nav a, [class*="nav"] a, .sidebar a, [class*="sidebar"] a, header a'))
        .map(a => ({ text: a.innerText.trim().slice(0,40), href: a.href }))
        .filter(l => l.text && l.href)
    );
    log('Nav links: ' + JSON.stringify(navLinks));

    // Log ALL links
    const allLinks = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.innerText.trim().slice(0,40), href: a.href }))
        .filter(l => l.text && l.href.includes('payhip.com'))
    );
    log('All links on page:');
    allLinks.forEach(l => log(`  "${l.text}" → ${l.href}`));

    // ── Click "Marketing" in nav ──────────────────────────────────────
    const marketingLink = page.locator('a').filter({ hasText: /^Marketing$/i }).first();
    if (await marketingLink.count() > 0) {
      const href = await marketingLink.getAttribute('href');
      log('Clicking Marketing: ' + href);
      await marketingLink.click();
      await sleep(2000);
      log('After click URL: ' + page.url());
      await ss(page, 'marketing-section');

      // Log links in marketing section
      const mLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim().slice(0,50), href: a.href }))
          .filter(l => l.text && l.href.includes('payhip.com'))
      );
      log('Marketing page links:');
      mLinks.forEach(l => log(`  "${l.text}" → ${l.href}`));
    } else {
      log('Marketing link not found in nav');
    }

    // ── Find and click Discount Codes ─────────────────────────────────
    const discountLink = page.locator('a').filter({ hasText: /discount/i }).first();
    if (await discountLink.count() > 0) {
      const href = await discountLink.getAttribute('href');
      log('Clicking Discount Codes: ' + href);
      await discountLink.click();
      await sleep(2000);
      log('Discount URL: ' + page.url());
      await ss(page, 'discount-codes-list');
    } else {
      // Try direct navigation to known discount URL patterns
      log('Discount link not found, trying known URLs...');
      const patterns = [
        `https://payhip.com/bundle/discount-codes/${BUNDLE_ID}`,
        `https://payhip.com/bundle/marketing/discount-codes/${BUNDLE_ID}`,
        `https://payhip.com/discount/${BUNDLE_ID}`,
        `https://payhip.com/bundle/coupons/${BUNDLE_ID}`,
      ];
      for (const url of patterns) {
        const ok = await tryGoto(page, url, 15000);
        const has404 = await page.evaluate(() => document.body.innerText.includes('404') || document.body.innerText.includes('Not Found'));
        log(`${url} → 404=${has404}`);
        if (ok && !has404) { log('Found valid URL: ' + url); break; }
      }
    }

    await ss(page, 'pre-create');

    // ── Find "Add/Create Discount Code" button ────────────────────────
    log('Looking for add discount button...');
    const addBtn = page.locator('button, a').filter({ hasText: /add|create|new/i }).first();
    if (await addBtn.count() > 0) {
      const txt = await addBtn.innerText().catch(() => '');
      log(`Clicking add button: "${txt}"`);
      await addBtn.click();
      await sleep(2000);
      await ss(page, 'add-form');
    }

    // ── Log all visible inputs ────────────────────────────────────────
    const inputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input, select, textarea'))
        .filter(el => el.offsetParent !== null)
        .map(el => ({ tag: el.tagName, type: el.type, name: el.name, id: el.id, placeholder: el.placeholder, cls: el.className.slice(0,40) }))
    );
    log('Visible inputs: ' + JSON.stringify(inputs));

    // ── Fill form ─────────────────────────────────────────────────────
    // Code field
    for (const sel of ['input[name*="code" i]', 'input[id*="code" i]', 'input[placeholder*="code" i]', 'input[placeholder*="COUPON" i]']) {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
        await el.clear(); await el.fill(COUPON_CODE);
        log(`Filled code field (${sel}): ${COUPON_CODE}`);
        break;
      }
    }

    // Discount type: check if there's a "Percentage" radio/select
    const pctRadio = page.locator('input[value*="percent" i], input[value*="%" ], label:has-text("Percent") input').first();
    if (await pctRadio.count() > 0) { await pctRadio.click(); log('Selected percentage type'); }

    // Discount amount field
    for (const sel of ['input[name*="discount" i]', 'input[id*="discount" i]', 'input[name*="amount" i]', 'input[name*="percent" i]', 'input[placeholder*="%" ]']) {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
        await el.clear(); await el.fill(DISCOUNT_PCT);
        log(`Filled discount field (${sel}): ${DISCOUNT_PCT}`);
        break;
      }
    }

    // Use limit
    const limitCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /limit|use/i }).first();
    if (await limitCheckbox.count() > 0) { await limitCheckbox.check(); log('Checked limit uses'); }

    for (const sel of ['input[name*="limit" i]', 'input[id*="limit" i]', 'input[name*="uses" i]', 'input[placeholder*="limit" i]']) {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
        await el.clear(); await el.fill(USE_LIMIT);
        log(`Filled limit field (${sel}): ${USE_LIMIT}`);
        break;
      }
    }

    await ss(page, 'form-filled');

    // ── Submit ────────────────────────────────────────────────────────
    const saveBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Add")').first();
    if (await saveBtn.count() > 0 && await saveBtn.isVisible().catch(() => false)) {
      const saveTxt = await saveBtn.innerText().catch(() => '');
      log(`Clicking: "${saveTxt}"`);
      await saveBtn.click();
      await sleep(3000);
    }

    await ss(page, 'after-save');

    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.toUpperCase().includes(COUPON_CODE)) {
      log(`SUCCESS: "${COUPON_CODE}" visible on page!`);
    } else {
      log(`"${COUPON_CODE}" not found after save. Current URL: ${page.url()}`);
    }

    await sleep(5000);

  } catch(e) {
    log('ERROR: ' + e.message);
    log(e.stack?.slice(0, 400) || '');
    await page.screenshot({ path: path.join(OUT, 'coupon-error.png') }).catch(() => {});
  } finally {
    await browser.close().catch(() => {});
  }
})();
