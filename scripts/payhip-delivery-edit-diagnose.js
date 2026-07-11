const { createRequire } = require('module');
const contractRequire = createRequire('C:\\Users\\Administrator\\contractfixpro\\package.json');
const { chromium } = contractRequire('playwright-extra');
const StealthPlugin = contractRequire('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const fs = require('fs');
const path = require('path');

const SESSION_DIR = 'C:\\Users\\Administrator\\contractfixpro\\scripts\\browser-session';
const OUT_DIR = 'C:\\Users\\Administrator\\notiontemplafix\\scripts\\payhip-delivery-edit-diag';
const PRODUCT_KEY = process.argv[2] || 'x7IdT';

function log(message) {
  console.log(`[${new Date().toTimeString().slice(0, 8)}] ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function dump(page, name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true }).catch(() => {});
  fs.writeFileSync(path.join(OUT_DIR, `${name}.html`), await page.content(), 'utf8');
  const data = await page.evaluate(() => {
    const visible = el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    return {
      url: location.href,
      title: document.title,
      text: document.body.innerText.slice(0, 9000),
      forms: Array.from(document.querySelectorAll('form')).map((f, index) => ({
        index,
        action: f.action,
        method: f.method,
        enctype: f.enctype,
        id: f.id,
        cls: f.className,
        text: f.innerText.slice(0, 1200)
      })),
      inputs: Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({
        tag: i.tagName,
        type: i.type || '',
        name: i.name || '',
        id: i.id || '',
        cls: i.className || '',
        accept: i.accept || '',
        placeholder: i.placeholder || '',
        value: (i.type === 'password' ? '' : (i.value || '')).slice(0, 160),
        visible: visible(i)
      })),
      buttons: Array.from(document.querySelectorAll('button, a, input[type="submit"], input[type="button"]')).map(b => ({
        tag: b.tagName,
        text: (b.innerText || b.value || '').trim().replace(/\s+/g, ' ').slice(0, 160),
        href: b.href || '',
        type: b.type || '',
        id: b.id || '',
        cls: b.className || '',
        visible: visible(b)
      })).filter(b => b.text || b.href).slice(0, 400)
    };
  });
  fs.writeFileSync(path.join(OUT_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf8');
  log(`Dumped ${name}`);
  return data;
}

(async () => {
  const browser = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false,
    slowMo: 50,
    viewport: { width: 1440, height: 950 }
  });
  const page = browser.pages()[0] || await browser.newPage();
  try {
    await page.goto(`https://payhip.com/product/edit/${PRODUCT_KEY}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);
    await dump(page, `edit-${PRODUCT_KEY}`);

    const tabs = await page.locator('a, button').evaluateAll(els => els.map((el, i) => ({
      i,
      text: (el.innerText || el.value || '').trim().replace(/\s+/g, ' '),
      href: el.href || '',
      id: el.id || '',
      cls: el.className || ''
    })).filter(x => /file|upload|content|product|details|advanced|download/i.test(x.text + ' ' + x.href + ' ' + x.id + ' ' + x.cls)).slice(0, 80));
    log(JSON.stringify(tabs, null, 2));
  } catch (error) {
    log(`ERROR: ${error.stack || error.message}`);
    await dump(page, 'error').catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
})();
