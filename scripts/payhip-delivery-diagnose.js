const { createRequire } = require('module');
const contractRequire = createRequire('C:\\Users\\Administrator\\contractfixpro\\package.json');
const { chromium } = contractRequire('playwright-extra');
const StealthPlugin = contractRequire('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const fs = require('fs');
const path = require('path');

const SESSION_DIR = 'C:\\Users\\Administrator\\contractfixpro\\scripts\\browser-session';
const OUT_DIR = 'C:\\Users\\Administrator\\notiontemplafix\\scripts\\payhip-delivery-diag';

function log(message) {
  console.log(`[${new Date().toTimeString().slice(0, 8)}] ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capture(page, name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const screenshot = path.join(OUT_DIR, `${name}.png`);
  const html = path.join(OUT_DIR, `${name}.html`);
  await page.screenshot({ path: screenshot, fullPage: false }).catch(() => {});
  fs.writeFileSync(html, await page.content(), 'utf8');
  log(`Saved ${name}.png/html`);
}

async function dumpPage(page, name) {
  await capture(page, name);
  const data = await page.evaluate(() => {
    const isVisible = el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    return {
      url: location.href,
      title: document.title,
      text: document.body.innerText.slice(0, 5000),
      links: Array.from(document.querySelectorAll('a')).map(a => ({
        text: (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160),
        href: a.href,
        visible: isVisible(a)
      })).filter(x => x.text || x.href).slice(0, 300),
      buttons: Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(b => ({
        text: (b.innerText || b.value || '').trim().replace(/\s+/g, ' ').slice(0, 160),
        type: b.type || '',
        visible: isVisible(b)
      })).slice(0, 200),
      inputs: Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({
        tag: i.tagName,
        type: i.type || '',
        name: i.name || '',
        id: i.id || '',
        placeholder: i.placeholder || '',
        value: (i.value || '').slice(0, 160),
        visible: isVisible(i)
      })).slice(0, 250)
    };
  });
  fs.writeFileSync(path.join(OUT_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf8');
  log(`Dumped ${name}.json`);
  return data;
}

(async () => {
  const browser = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false,
    slowMo: 40,
    viewport: { width: 1440, height: 950 }
  });
  const page = browser.pages()[0] || await browser.newPage();

  try {
    const urls = [
      'https://payhip.com/dashboard',
      'https://payhip.com/products',
      'https://payhip.com/products?&page=10',
      'https://payhip.com/products?&page=20',
      'https://payhip.com/products?&page=30',
      'https://payhip.com/product/products',
      'https://payhip.com/product/digital-products'
    ];

    for (const url of urls) {
      log(`Opening ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => log(`Goto warning: ${e.message}`));
      await sleep(3500);
      const safeName = url.replace(/^https:\/\/payhip\.com\//, '').replace(/[^\w-]+/g, '-') || 'root';
      await dumpPage(page, safeName);
    }

    const rows = [];
    for (const file of fs.readdirSync(OUT_DIR).filter(name => name.endsWith('.html'))) {
      const html = fs.readFileSync(path.join(OUT_DIR, file), 'utf8');
      const rowRe = /<div class="row js-product-row" data-product-key="([^"]+)" data-json="\{&quot;name&quot;:&quot;([^&]+)&quot;,&quot;type&quot;:&quot;([^&]+)&quot;\}"/g;
      let match;
      while ((match = rowRe.exec(html))) {
        rows.push({
          key: match[1],
          name: match[2].replace(/\\u2014/g, '—'),
          type: match[3],
          edit: match[3] === 'bundle'
            ? `https://payhip.com/bundle/products/${match[1]}`
            : `https://payhip.com/product/edit/${match[1]}`
        });
      }
    }
    fs.writeFileSync(path.join(OUT_DIR, 'all-products.json'), JSON.stringify(rows, null, 2), 'utf8');
    log(`Parsed products: ${rows.length}`);

    const all = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'all-products.json'), 'utf8'));
    const productNames = ['Life OS Dashboard', 'Weekly Planner', 'Personal Dashboard', 'Business OS'];
    for (const productName of productNames) {
      const hit = all.find(l => l.name.includes(productName));
      log(`${productName}: ${hit ? `${hit.name} -> ${hit.edit}` : 'not found in parsed products'}`);
    }
  } catch (error) {
    log(`ERROR: ${error.stack || error.message}`);
    await capture(page, 'error');
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
})();
