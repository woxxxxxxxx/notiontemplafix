const { createRequire } = require('module');
const contractRequire = createRequire('C:\\Users\\Administrator\\contractfixpro\\package.json');
const { chromium } = contractRequire('playwright-extra');
const StealthPlugin = contractRequire('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const fs = require('fs');
const path = require('path');

const SESSION_DIR = 'C:\\Users\\Administrator\\contractfixpro\\scripts\\browser-session';
const OUT_DIR = 'C:\\Users\\Administrator\\notiontemplafix\\scripts\\payhip-content-editor-diag';
const PRODUCT_KEY = process.argv[2] || 'ClqYb';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false,
    slowMo: 60,
    viewport: { width: 1440, height: 950 }
  });
  const page = browser.pages()[0] || await browser.newPage();
  try {
    await page.goto(`https://payhip.com/product/edit/${PRODUCT_KEY}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);
    await page.locator('a.js-contents-tab-link, a[href="#product-contents-tab-panel"]').first().click({ force: true });
    await sleep(2500);
    await page.screenshot({ path: path.join(OUT_DIR, `contents-${PRODUCT_KEY}.png`), fullPage: true });
    fs.writeFileSync(path.join(OUT_DIR, `contents-${PRODUCT_KEY}.html`), await page.content(), 'utf8');
    const data = await page.evaluate(() => ({
      url: location.href,
      text: document.body.innerText.slice(0, 12000),
      pageData: {
        productAdvancedContentEditorMiscHelper: window.pageData && window.pageData.productAdvancedContentEditorMiscHelper,
        basicFilesModeDataExistingOnPageLoad: window.pageData && window.pageData.basicFilesModeDataExistingOnPageLoad,
        productMetaRows: window.pageData && window.pageData.productMetaRows
      },
      visibleControls: Array.from(document.querySelectorAll('button,a,input,textarea,[contenteditable="true"]')).map(el => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return {
          tag: el.tagName,
          text: (el.innerText || el.value || el.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 180),
          href: el.href || '',
          id: el.id || '',
          cls: el.className || '',
          type: el.type || '',
          name: el.name || '',
          visible: r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden'
        };
      }).filter(x => x.visible && (x.text || x.id || x.name || x.href)).slice(0, 250)
    }));
    fs.writeFileSync(path.join(OUT_DIR, `contents-${PRODUCT_KEY}.json`), JSON.stringify(data, null, 2), 'utf8');
    console.log(JSON.stringify({
      product: PRODUCT_KEY,
      text: data.text.slice(0, 1000),
      controls: data.visibleControls.slice(0, 40)
    }, null, 2));
  } finally {
    await browser.close().catch(() => {});
  }
})();
