/**
 * payhip-bundle-page.js v14
 * Goal: Intercept real $.ajax save format, then replay with our content.
 * Fix v14: builder URL retry + 120s timeout; try to trigger UI click then intercept real save.
 */
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const path = require('path');
const SESSION_DIR = 'C:/Users/Administrator/contractfixpro/scripts/browser-session';
const OUT = 'C:/Users/Administrator/notiontemplafix/scripts';
const BUNDLE_ID = 'NdT6c';
const EMAIL = 'xiaohuixie3@gmail.com';

const TITLE = 'All Templates Bundle — NotionTemplaFix';
const DESC  = 'Get all 16 premium Notion templates + web apps in one bundle. Includes Life OS, Project Manager, Budget Tracker, Content Calendar, Job Tracker, CRM Template, Goal Tracker, Habit Tracker, Book Tracker, Student OS, Business OS, Finance Tracker Pro, Content Creator OS, Freelancer Hub, Weekly Planner, Study Planner. Save over 60% vs buying individually. Instant access after purchase.';

const HEADLINE_SECTION_ID = 'content-section-7zqKV73YGg';
const BUILDER_URL = `https://payhip.com/builder/public?builderStartUrl=https%3A%2F%2Fpayhip.com%2Fb%2F${BUNDLE_ID}&builderExitUrl=%2Fbundle%2Fpages%2F${BUNDLE_ID}`;

function log(msg) { console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
let step = 0;
async function ss(page, name) {
  step++;
  const f = path.join(OUT, `bp${String(step).padStart(2,'0')}-${name}.png`);
  await page.screenshot({ path: f, fullPage: false });
  log(`Screenshot: ${path.basename(f)}`);
}

(async () => {
  const browser = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false, slowMo: 30, viewport: { width: 1280, height: 900 },
    proxy: { server: 'http://127.0.0.1:7897' }
  });
  const page = browser.pages()[0] || await browser.newPage();

  // Capture ALL save requests
  const capturedSaves = [];
  page.on('request', req => {
    if (req.url().includes('/builder_aux/save')) {
      const body = req.postData() || '';
      capturedSaves.push(body);
      log(`SAVE REQUEST (${body.length} bytes): ${body.slice(0,600)}`);
    }
  });
  page.on('response', async resp => {
    if (resp.url().includes('builder_aux/save')) {
      const txt = await resp.text().catch(() => '');
      log(`← SAVE RESPONSE [${resp.status()}]: ${txt.slice(0,300)}`);
    }
  });

  try {
    // ── Ensure logged in ──────────────────────────────────────────────────
    for (let i = 0; i < 3; i++) {
      try { await page.goto('https://payhip.com/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 }); break; }
      catch(e) { log(`Dashboard nav retry ${i+1}`); await sleep(3000); }
    }
    await sleep(2000);
    if (page.url().includes('/auth/login')) {
      log('Please login in browser...');
      const f = page.locator('input[type="email"]').first();
      if (await f.count() > 0) await f.fill(EMAIL);
      for (let i = 0; i < 60; i++) { await sleep(5000); if (!page.url().includes('/auth/login')) break; if (i%6===0) log(`Wait ${i*5}s`); }
      await sleep(3000);
    }
    log('Session: ' + page.url());

    // ── Load builder — retry up to 3 times with 120s timeout ───────────
    let builderLoaded = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        log(`Builder nav attempt ${attempt}...`);
        await page.goto(BUILDER_URL, { waitUntil: 'commit', timeout: 120000 });
        if (page.url().includes('/auth/login')) { log('ERROR: auth redirect'); return; }
        builderLoaded = true;
        log('Builder URL committed: ' + page.url().slice(0, 80));
        break;
      } catch(e) {
        log(`Builder nav attempt ${attempt} failed: ${e.message.split('\n')[0]}`);
        if (attempt < 3) await sleep(5000);
      }
    }
    if (!builderLoaded) { log('Builder failed to load after 3 attempts'); return; }

    // Intercept $.ajax BEFORE builder initializes
    await page.evaluate(() => {
      window.__capturedAjax = [];
      const tryIntercept = () => {
        if (typeof $ === 'undefined') return false;
        const origAjax = $.ajax;
        $.ajax = function(options) {
          const url = (typeof options === 'string') ? options : (options.url || '');
          if (url.includes('builder_aux')) {
            window.__capturedAjax.push({
              url,
              method: options.method || options.type || 'GET',
              data: typeof options.data === 'string' ? options.data.slice(0, 3000) :
                    JSON.stringify(options.data || {}).slice(0, 3000)
            });
          }
          return origAjax.apply(this, arguments);
        };
        return true;
      };
      if (!tryIntercept()) {
        const t = setInterval(() => { if (tryIntercept()) clearInterval(t); }, 500);
        setTimeout(() => clearInterval(t), 10000);
      }
    });

    // ── Wait for splash to clear ───────────────────────────────────────
    await page.waitForSelector('iframe', { timeout: 60000 }).catch(() => log('No iframe found'));
    log('Waiting for splash to clear...');
    await page.waitForFunction(() => {
      const s = document.querySelector('.js-splash-loading-wrapper');
      return !s || getComputedStyle(s).display === 'none';
    }, { timeout: 60000 }).catch(() => log('Splash wait timed out'));
    await sleep(5000);
    await ss(page, 'loaded');

    const previewFrame = page.frames().find(f => f.url().includes(`/b/${BUNDLE_ID}`) && f.url().includes('builder_mode'));
    if (!previewFrame) { log('No preview frame'); await ss(page, 'no-frame'); return; }
    log('Preview frame URL: ' + previewFrame.url().slice(0, 100));

    const pb = await page.evaluate(() => {
      const w = window.payhipBuilder;
      return w ? { envId: w.environmentIdEncrypted, pageType: w.pageType, pageSpecificId: w.pageSpecificId, sBBIID: w.sBBIID } : null;
    });
    const csrf = await page.evaluate(() => window.payhip_csrf_token || '');
    log(`pb: ${JSON.stringify(pb)}`);
    log(`csrf: ${csrf.slice(0,20)}...`);

    // ── Get editorDataSrc ─────────────────────────────────────────────
    const dataUrl = previewFrame.url() + '&display_builder_data_json=1';
    log('Fetching editor data from: ' + dataUrl.slice(0, 120));
    const rawData = await previewFrame.evaluate(async u => {
      const r = await fetch(u, { credentials: 'include' });
      return await r.text();
    }, dataUrl);

    let pageData;
    try {
      pageData = JSON.parse(rawData);
    } catch(e) {
      log('Failed to parse editor data: ' + rawData.slice(0, 200));
      return;
    }
    log('editorDataSrc keys: ' + Object.keys(pageData.editorDataSrc || {}).join(','));
    log('lastSavedVersionNumber: ' + pageData.lastSavedVersionNumber);

    // ── Locate "Bundle Title" in editorDataSrc ────────────────────────
    const srcStr = JSON.stringify(pageData.editorDataSrc);
    const btIdx = srcStr.indexOf('Bundle Title');
    if (btIdx !== -1) {
      log('Context around "Bundle Title":');
      log(srcStr.slice(Math.max(0, btIdx - 400), btIdx + 400));
    } else {
      log('"Bundle Title" NOT found in editorDataSrc');
      // Show first 500 chars of src
      log('editorDataSrc preview: ' + srcStr.slice(0, 500));
    }

    // ── Try: trigger real save by clicking element in iframe then intercepting ──
    log('\n=== Attempt: click h1 in iframe to open edit panel ===');
    try {
      // Click on the headline section in the iframe
      await previewFrame.click('h1, [class*="headline"], [class*="title"]', { timeout: 5000 });
      log('Clicked h1/headline');
      await sleep(3000);
      await ss(page, 'after-click');

      // Check if edit panel appeared
      const editPanel = await page.locator('.js-text-input, input[placeholder*="title"], input[placeholder*="Title"]').count();
      log('Edit panel inputs: ' + editPanel);

      if (editPanel > 0) {
        const inp = page.locator('.js-text-input, input[placeholder*="title"]').first();
        await inp.fill(TITLE);
        await sleep(1000);
        // Trigger save
        await page.keyboard.press('Enter');
        await sleep(3000);
        log('Filled via input field');
      }
    } catch(e) {
      log('Click approach failed: ' + e.message.split('\n')[0]);
    }

    // ── Check if any $.ajax save was captured ────────────────────────
    const capturedAjax = await page.evaluate(() => window.__capturedAjax || []);
    if (capturedAjax.length > 0) {
      log('\n=== CAPTURED $.ajax calls ===');
      capturedAjax.forEach((c, i) => log(`  [${i}] ${c.method} ${c.url}: ${c.data.slice(0,500)}`));
    }

    // ── Build modified editorDataSrc ──────────────────────────────────
    const shortDesc = 'A short, descriptive sentence about your bundle.';
    let modifiedStr = srcStr
      .split('Bundle Title').join(TITLE)
      .split(shortDesc).join(DESC);

    // Also try to find and replace in nested text fields
    // Common Payhip builder text field patterns
    const textPatterns = [
      ['"text":"Bundle Title"', `"text":"${TITLE}"`],
      ['"value":"Bundle Title"', `"value":"${TITLE}"`],
      ['"heading":"Bundle Title"', `"heading":"${TITLE}"`],
      ['"h1":"Bundle Title"', `"h1":"${TITLE}"`],
      ['"title":"Bundle Title"', `"title":"${TITLE}"`],
    ];
    for (const [from, to] of textPatterns) {
      if (modifiedStr.includes(from)) {
        modifiedStr = modifiedStr.split(from).join(to);
        log('Replaced pattern: ' + from.slice(0, 40));
      }
    }

    const modifiedSrc = JSON.parse(modifiedStr);
    log(`Modified: ${(srcStr !== modifiedStr) ? 'YES (changes made)' : 'NO (nothing replaced)'}`);

    // ── Try save with the modified editorDataSrc ──────────────────────
    log('\n=== Save attempts ===');
    const saveResults = await previewFrame.evaluate(async ({ envId, sBBIID, pageType, pageSpecificId, csrf, src, dist, version, sectionId }) => {
      const results = [];

      async function tryPost(name, body) {
        try {
          const r = await fetch('/builder_aux/save', {
            method: 'POST', credentials: 'include',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Requested-With': 'XMLHttpRequest',
              'X-CSRF-TOKEN': csrf
            },
            body
          });
          const text = await r.text();
          results.push({ name, status: r.status, body: text.slice(0, 300) });
          return text.includes('"success":true');
        } catch(e) {
          results.push({ name, error: e.message });
          return false;
        }
      }

      const enc = encodeURIComponent;
      const common = `common%5BenvironmentIdEncrypted%5D=${enc(envId)}&common%5BsBBIID%5D=${enc(sBBIID || '')}`;

      // Attempt 1: Full structure with all fields
      const b1 = new URLSearchParams();
      b1.set('_token', csrf);
      b1.set('AjaxRequestAborted', '0');
      b1.set('currentSidebarMenuType', 'mainSectionEdit');
      b1.set('additionalData[sectionUniqueId]', sectionId);
      b1.set('additionalData[isNewContentSection]', '0');
      b1.set('additionalData[pageType]', pageType);
      b1.set('additionalData[pageEditIsMasterMode]', '0');
      b1.set('additionalData[pageSpecificId]', pageSpecificId);
      b1.set('editorDataSrc', JSON.stringify(src));
      b1.set('editorDataDist', JSON.stringify(dist || {}));
      b1.set('lastSavedVersionNumber', String(version));
      await tryPost('full-with-section', common + '&' + b1.toString());

      // Attempt 2: Just editorDataSrc, no section
      const b2 = new URLSearchParams();
      b2.set('_token', csrf);
      b2.set('AjaxRequestAborted', '0');
      b2.set('currentSidebarMenuType', '');
      b2.set('editorDataSrc', JSON.stringify(src));
      b2.set('editorDataDist', JSON.stringify(dist || {}));
      b2.set('lastSavedVersionNumber', String(version));
      await tryPost('minimal-no-section', common + '&' + b2.toString());

      // Attempt 3: No common prefix, just direct post
      const b3 = new URLSearchParams();
      b3.set('_token', csrf);
      b3.set('AjaxRequestAborted', '0');
      b3.set('currentSidebarMenuType', 'mainSectionEdit');
      b3.set('additionalData[sectionUniqueId]', sectionId);
      b3.set('additionalData[isNewContentSection]', '0');
      b3.set('additionalData[pageType]', pageType);
      b3.set('additionalData[pageEditIsMasterMode]', '0');
      b3.set('additionalData[pageSpecificId]', pageSpecificId);
      b3.set('editorDataSrc', JSON.stringify(src));
      b3.set('editorDataDist', JSON.stringify(dist || {}));
      b3.set('lastSavedVersionNumber', String(version));
      await tryPost('no-common-prefix', b3.toString());

      // Attempt 4: With environmentId in additionalData
      const b4 = new URLSearchParams();
      b4.set('_token', csrf);
      b4.set('AjaxRequestAborted', '0');
      b4.set('currentSidebarMenuType', 'mainSectionEdit');
      b4.set('additionalData[sectionUniqueId]', sectionId);
      b4.set('additionalData[isNewContentSection]', '0');
      b4.set('additionalData[pageType]', pageType);
      b4.set('additionalData[pageEditIsMasterMode]', '0');
      b4.set('additionalData[pageSpecificId]', pageSpecificId);
      b4.set('additionalData[environmentIdEncrypted]', envId);
      b4.set('additionalData[sBBIID]', sBBIID || '');
      b4.set('editorDataSrc', JSON.stringify(src));
      b4.set('editorDataDist', JSON.stringify(dist || {}));
      b4.set('lastSavedVersionNumber', String(version));
      await tryPost('env-in-additionalData', b4.toString());

      return results;
    }, { ...pb, csrf, src: modifiedSrc, dist: pageData.editorDataDist, version: pageData.lastSavedVersionNumber, sectionId: HEADLINE_SECTION_ID });

    log('Save results: ' + JSON.stringify(saveResults, null, 2));

    // ── Check for success ─────────────────────────────────────────────
    const success = saveResults.find(r => r.body && r.body.includes('"success":true'));
    if (success) {
      log('SUCCESS with: ' + success.name);
      // Publish
      const pubBtn = page.locator('.js-publish-button, button:has-text("Publish")').first();
      if (await pubBtn.count() > 0 && await pubBtn.isVisible().catch(() => false)) {
        await pubBtn.click({ force: true });
        await sleep(4000);
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Publish now")').first();
        if (await confirmBtn.count() > 0 && await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click(); await sleep(3000);
        }
        log('Published!');
      }
    } else {
      log('No save succeeded. Checking for real $.ajax captures...');
      const ajax2 = await page.evaluate(() => window.__capturedAjax || []);
      if (ajax2.length > 0) {
        log('Real save request captured: ' + JSON.stringify(ajax2[0]).slice(0, 1000));
      } else {
        log('No $.ajax captures. Need to trigger a real save by editing via UI.');
      }
    }

    await ss(page, 'final');

    // Also check capturedSaves from network
    log('Network captured saves: ' + capturedSaves.length);
    if (capturedSaves.length > 0) log('First capture: ' + capturedSaves[0].slice(0, 800));

    await sleep(10000);

  } catch(e) {
    log('ERROR: ' + e.message);
    log(e.stack?.slice(0, 500) || '');
    await page.screenshot({ path: path.join(OUT, 'bp-error.png') }).catch(() => {});
  } finally {
    await browser.close().catch(() => {});
  }
})();
