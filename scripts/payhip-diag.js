const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const path = require('path');
const SESSION_DIR = 'C:/Users/Administrator/contractfixpro/scripts/browser-session';
const OUT = 'C:/Users/Administrator/notiontemplafix/scripts';
const BUNDLE_ID = 'NdT6c';

function log(msg) { console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false, slowMo: 30, viewport: { width: 1280, height: 900 }
  });
  const page = browser.pages()[0] || await browser.newPage();

  const BUILDER_URL = `https://payhip.com/builder/public?builderStartUrl=https%3A%2F%2Fpayhip.com%2Fb%2F${BUNDLE_ID}&builderExitUrl=%2Fbundle%2Fpages%2F${BUNDLE_ID}`;

  try {
    log('Navigating to builder URL...');
    await page.goto(BUILDER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    log('domcontentloaded fired');
    await sleep(5000);
    log('Current URL: ' + page.url());

    // Screenshot immediately
    await page.screenshot({ path: path.join(OUT, 'diag-01-after-load.png'), fullPage: false });
    log('Screenshot saved');

    // Log all visible elements
    const info = await page.evaluate(() => {
      const iframes = document.querySelectorAll('iframe');
      const iframeInfo = Array.from(iframes).map(f => ({
        src: f.src,
        cls: f.className,
        id: f.id,
        visible: f.offsetParent !== null,
        w: f.offsetWidth, h: f.offsetHeight
      }));
      return {
        title: document.title,
        url: location.href,
        iframes: iframeInfo,
        bodyText: document.body.innerText.slice(0, 200),
        hasLoginForm: !!document.querySelector('form[action*="login"], input[name="password"]')
      };
    });
    log('Page info: ' + JSON.stringify(info, null, 2));

    // Check all frames
    const frames = page.frames();
    log('Total frames: ' + frames.length);
    frames.forEach((f, i) => log(`  Frame[${i}]: ${f.url()}`));

    // Wait longer and check again
    log('Waiting 10 more seconds...');
    await sleep(10000);
    const iframes2 = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('iframe, [class*="preview"], [class*="iframe"]')).map(el => ({
        tag: el.tagName, cls: el.className, id: el.id, src: el.src || ''
      }));
    });
    log('Elements after wait: ' + JSON.stringify(iframes2));
    await page.screenshot({ path: path.join(OUT, 'diag-02-after-wait.png'), fullPage: false });

    await sleep(5000);
  } catch(e) {
    log('ERROR: ' + e.message);
    await page.screenshot({ path: path.join(OUT, 'diag-error.png') }).catch(() => {});
  } finally {
    await browser.close().catch(() => {});
  }
})();
