const { createRequire } = require('module');
const contractRequire = createRequire('C:\\Users\\Administrator\\contractfixpro\\package.json');
const { chromium } = contractRequire('playwright-extra');
const StealthPlugin = contractRequire('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const fs = require('fs');
const path = require('path');

const SESSION_DIR = 'C:\\Users\\Administrator\\contractfixpro\\scripts\\browser-session';
const ROOT = 'C:\\Users\\Administrator\\notiontemplafix';
const DELIVERY_DIR = path.join(ROOT, 'payhip-delivery');
const OUT_DIR = path.join(ROOT, 'scripts', 'payhip-delivery-upload-two-files');

const PRODUCTS = [
  { key: 'x7IdT', name: 'Life OS Dashboard', slug: 'life-os', appFile: 'life-os-app.html' },
  { key: '3jXDd', name: 'Second Brain', slug: 'second-brain', appFile: 'second-brain-app.html' },
  { key: 'bPxcu', name: 'Business OS', slug: 'business-os', appFile: 'business-os-app.html' },
  { key: 'ClqYb', name: 'Student OS', slug: 'student-os', appFile: 'student-os-app.html' },
  { key: '37Ua0', name: 'Finance Tracker Pro', slug: 'finance-tracker-pro', appFile: 'finance-tracker-app.html' },
  { key: 'qQLj2', name: 'Content Creator OS', slug: 'content-creator-os', appFile: 'content-creator-app.html' },
  { key: 'CeA5t', name: 'Freelancer Hub', slug: 'freelancer-hub', appFile: 'freelancer-hub-app.html' },
  { key: 'TRndY', name: 'Personal Dashboard', slug: 'personal-dashboard', appFile: 'personal-dashboard-app.html' },
  { key: '4kUJT', name: 'Weekly Planner', slug: 'weekly-planner', appFile: 'weekly-planner-app.html' },
  { key: 'yt30b', name: 'Study Planner', slug: 'study-planner', appFile: 'study-planner-app.html' },
  { key: 'yM0lP', name: 'Meeting Notes', slug: 'meeting-notes', appFile: 'meeting-notes-app.html' },
  { key: 'q0wOL', name: 'Project Manager', slug: 'project-manager', appFile: 'project-manager-app.html' },
  { key: 'Nwc9x', name: 'Budget Tracker', slug: 'budget-tracker', appFile: 'budget-tracker-app.html' },
  { key: '1qG4n', name: 'Content Calendar', slug: 'content-calendar', appFile: 'content-calendar-app.html' },
  { key: 'PtdkO', name: 'Job Tracker', slug: 'job-tracker', appFile: 'job-tracker-app.html' },
  { key: 'kZMFo', name: 'CRM Template', slug: 'crm-template', appFile: 'crm-template-app.html' }
].map(product => ({
  ...product,
  notionFile: `${product.slug}-notion-template-link.html`
}));

function log(message) {
  console.log(`[${new Date().toTimeString().slice(0, 8)}] ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function screenshot(page, name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: false }).catch(() => {});
}

async function getFiles(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('.js-upload-digital-file-row')).map(row => ({
    id: row.getAttribute('data-digital-file-id') || '',
    text: row.innerText.replace(/\s+/g, ' ').trim(),
    cls: row.className,
    deleted: row.classList.contains('deleted') || row.style.display === 'none'
  })));
}

async function waitUntilVisibleFile(page, fileName) {
  for (let i = 0; i < 90; i++) {
    const files = await getFiles(page);
    if (files.some(file => file.text.includes(fileName) && !/uploading|processing/i.test(file.text + ' ' + file.cls))) {
      return files;
    }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${fileName}`);
}

async function uploadFile(page, absoluteFile) {
  const fileName = path.basename(absoluteFile);
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
  await page.locator('#files').click({ force: true });
  const chooser = await chooserPromise;
  if (chooser) {
    await chooser.setFiles(absoluteFile);
  } else {
    await sleep(1200);
    const inputs = await page.locator('input[type="file"]').elementHandles();
    if (!inputs.length) throw new Error(`No file input for ${fileName}`);
    await inputs[inputs.length - 1].setInputFiles(absoluteFile);
  }
  await waitUntilVisibleFile(page, fileName);
}

async function closeSweetAlerts(page) {
  for (let i = 0; i < 12; i++) {
    const visibleConfirm = page.locator('.sweet-alert:visible button.confirm, .sweet-alert:visible button:has-text("OK"), .swal-modal:visible button').first();
    if (!(await visibleConfirm.count())) break;
    await visibleConfirm.click({ force: true }).catch(() => {});
    await sleep(700);
  }
  await page.waitForFunction(() => {
    const overlay = document.querySelector('.sweet-overlay');
    return !overlay || getComputedStyle(overlay).display === 'none' || overlay.style.display === 'none';
  }, { timeout: 15000 }).catch(() => {});
}

async function deleteUnexpectedFiles(page, expectedFiles) {
  const ids = await page.evaluate((expected) => Array.from(document.querySelectorAll('.js-upload-digital-file-row'))
    .filter(row => !expected.some(name => (row.innerText || '').includes(name)))
    .map(row => row.getAttribute('data-digital-file-id'))
    .filter(Boolean), expectedFiles);

  for (const id of ids) {
    await page.evaluate((fileId) => {
      const row = document.querySelector(`.js-upload-digital-file-row[data-digital-file-id="${fileId}"]`);
      const button = row && row.querySelector('.js-uploaddelete');
      if (button) button.click();
    }, id);
    await sleep(700);
    await closeSweetAlerts(page);
  }
}

async function save(page) {
  await closeSweetAlerts(page);
  await page.locator('input[type="submit"][value="Save Changes"], button:has-text("Save Changes"), #addsubmit').first().click({ force: true });
  await sleep(5500);
  await closeSweetAlerts(page);
}

async function processProduct(page, product) {
  const appPath = path.join(ROOT, product.appFile);
  const notionPath = path.join(DELIVERY_DIR, product.notionFile);
  const expectedFiles = [product.appFile, product.notionFile];

  for (const file of [appPath, notionPath]) {
    if (!fs.existsSync(file)) throw new Error(`Missing file: ${file}`);
  }

  log(`Opening ${product.name}`);
  await page.goto(`https://payhip.com/product/edit/${product.key}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3500);

  let files = await getFiles(page);
  log(`Before: ${files.map(f => f.text).join(' | ') || '(none)'}`);

  if (!files.some(f => f.text.includes(product.appFile))) {
    log(`Uploading app: ${product.appFile}`);
    await uploadFile(page, appPath);
  }
  files = await getFiles(page);
  if (!files.some(f => f.text.includes(product.notionFile))) {
    log(`Uploading Notion link: ${product.notionFile}`);
    await uploadFile(page, notionPath);
  }

  await deleteUnexpectedFiles(page, expectedFiles);
  await screenshot(page, `before-save-${product.key}`);
  await save(page);

  await page.goto(`https://payhip.com/product/edit/${product.key}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  const finalFiles = await getFiles(page);
  log(`Final: ${finalFiles.map(f => f.text).join(' | ') || '(none)'}`);

  const missing = expectedFiles.filter(name => !finalFiles.some(f => f.text.includes(name)));
  const unexpected = finalFiles.filter(f => !expectedFiles.some(name => f.text.includes(name)));
  if (missing.length || unexpected.length) {
    throw new Error(`Mismatch for ${product.name}: missing=${missing.join(',')} unexpected=${unexpected.map(f => f.text).join('|')}`);
  }
  return { product, status: 'ok', files: finalFiles };
}

(async () => {
  const target = process.argv[2] || 'all';
  const selected = target === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(product => product.key === target || product.name.toLowerCase().includes(target.toLowerCase()) || product.slug === target);
  if (!selected.length) throw new Error(`No product matched ${target}`);

  const browser = await chromium.launchPersistentContext(SESSION_DIR, {
    headless: false,
    slowMo: 70,
    viewport: { width: 1440, height: 950 }
  });
  const page = browser.pages()[0] || await browser.newPage();
  const results = [];
  try {
    for (const product of selected) {
      try {
        results.push(await processProduct(page, product));
      } catch (error) {
        log(`FAILED ${product.name}: ${error.stack || error.message}`);
        await screenshot(page, `failed-${product.key}`);
        results.push({ product, status: 'failed', error: error.message });
        if (target !== 'all') throw error;
      }
    }
  } finally {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2), 'utf8');
    await browser.close().catch(() => {});
  }
})();
