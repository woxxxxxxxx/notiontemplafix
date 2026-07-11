/**
 * payhip-pricing-debug.js — diagnose what happens when Add Pricing Plan is clicked
 */
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const path = require('path');
const SESSION_DIR = 'C:/Users/Administrator/contractfixpro/scripts/browser-session';
const OUT = 'C:/Users/Administrator/notiontemplafix/scripts';

function log(msg) { console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
let step = 0;
async function ss(page, name) {
  step++;
  const f = path.join(OUT, `pd${String(step).padStart(2,'0')}-${name}.png`);
  await page.screenshot({ path: f, fullPage: false });
  log(`Screenshot: ${path.basename(f)}`);
}

(async () => {
  const browser = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false, slowMo: 60, viewport: { width: 1280, height: 900 }
  });
  const page = browser.pages()[0] || await browser.newPage();

  try {
    await page.goto('https://payhip.com/bundle/pricing/NdT6c', {
      waitUntil: 'domcontentloaded', timeout: 30000
    });
    await sleep(2000);
    await ss(page, 'start');

    // Dump ALL modals on page before clicking
    const beforeModals = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.modal, [role="dialog"]')).map(m => ({
        id: m.id, cls: m.className,
        display: m.style.display || window.getComputedStyle(m).display,
        text: m.innerText?.trim().slice(0, 100)
      }));
    });
    log('Modals BEFORE click: ' + JSON.stringify(beforeModals, null, 2));

    // Listen for navigation / XHR
    const navPromise = new Promise(resolve => {
      page.once('framenavigated', () => resolve('navigated'));
      setTimeout(() => resolve('timeout'), 5000);
    });

    // Click "Add Pricing Plan"
    await page.evaluate(() => {
      const btn = document.querySelector('.js-show-add-edit-pricing-plan-modal-button');
      if (btn) btn.click();
      else {
        const links = Array.from(document.querySelectorAll('a,button'));
        const add = links.find(l => l.textContent?.trim() === 'Add Pricing Plan');
        if (add) add.click();
      }
    });
    log('Clicked Add Pricing Plan via JS eval');

    // Wait a bit
    await sleep(3000);
    await ss(page, 'after-click-3s');

    // Dump ALL modals after clicking
    const afterModals = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.modal, [role="dialog"]')).map(m => ({
        id: m.id, cls: m.className,
        display: m.style.display || window.getComputedStyle(m).display,
        opacity: window.getComputedStyle(m).opacity,
        visibility: window.getComputedStyle(m).visibility,
        text: m.innerText?.trim().slice(0, 200),
        inputCount: m.querySelectorAll('input').length
      }));
    });
    log('Modals AFTER click: ' + JSON.stringify(afterModals, null, 2));

    // Dump all visible inputs
    const allInputs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input, select, textarea')).map(el => {
        const cs = window.getComputedStyle(el);
        return {
          type: el.type, name: el.name, id: el.id, value: el.value,
          placeholder: el.placeholder,
          display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
          inModal: !!el.closest('.modal, [role="dialog"]')
        };
      })
    );
    log('All inputs after click:');
    allInputs.forEach(i => log(`  [${i.type}] name="${i.name}" val="${i.value}" disp="${i.display}" vis="${i.visibility}" inModal=${i.inModal}`));

    // Check page text change
    const pageText = await page.evaluate(() => document.body.innerText.slice(0, 2000));
    log('Page text after click:\n' + pageText);

    // Check if URL changed
    log('Current URL: ' + page.url());

    // Also check what the Add Pricing Plan button's data attributes are
    const btnInfo = await page.evaluate(() => {
      const btn = document.querySelector('.js-show-add-edit-pricing-plan-modal-button');
      if (!btn) return 'button not found';
      const attrs = {};
      for (const attr of btn.attributes) attrs[attr.name] = attr.value;
      return JSON.stringify(attrs);
    });
    log('Add Pricing Plan button attrs: ' + btnInfo);

    await sleep(10000);

  } catch (e) {
    log('ERROR: ' + e.message);
    await page.screenshot({ path: path.join(OUT, 'pd-error.png') }).catch(() => {});
  } finally {
    await browser.close().catch(() => {});
  }
})();
