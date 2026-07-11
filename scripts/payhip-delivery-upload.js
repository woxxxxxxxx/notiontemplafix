const { createRequire } = require('module');
const contractRequire = createRequire('C:\\Users\\Administrator\\contractfixpro\\package.json');
const { chromium } = contractRequire('playwright-extra');
const StealthPlugin = contractRequire('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const fs = require('fs');
const path = require('path');

const SESSION_DIR = 'C:\\Users\\Administrator\\contractfixpro\\scripts\\browser-session';
const DELIVERY_DIR = 'C:\\Users\\Administrator\\notiontemplafix\\payhip-delivery';
const OUT_DIR = 'C:\\Users\\Administrator\\notiontemplafix\\scripts\\payhip-delivery-upload';

const PRODUCTS = [
  { key: 'x7IdT', name: 'Life OS Dashboard', file: 'life-os-delivery.html' },
  { key: '3jXDd', name: 'Second Brain', file: 'second-brain-delivery.html' },
  { key: 'bPxcu', name: 'Business OS', file: 'business-os-delivery.html' },
  { key: 'ClqYb', name: 'Student OS', file: 'student-os-delivery.html' },
  { key: '37Ua0', name: 'Finance Tracker Pro', file: 'finance-tracker-pro-delivery.html' },
  { key: 'qQLj2', name: 'Content Creator OS', file: 'content-creator-os-delivery.html' },
  { key: 'CeA5t', name: 'Freelancer Hub', file: 'freelancer-hub-delivery.html' },
  { key: 'TRndY', name: 'Personal Dashboard', file: 'personal-dashboard-delivery.html' },
  { key: '4kUJT', name: 'Weekly Planner', file: 'weekly-planner-delivery.html' },
  { key: 'yt30b', name: 'Study Planner', file: 'study-planner-delivery.html' },
  { key: 'yM0lP', name: 'Meeting Notes', file: 'meeting-notes-delivery.html' },
  { key: 'q0wOL', name: 'Project Manager', file: 'project-manager-delivery.html' },
  { key: 'Nwc9x', name: 'Budget Tracker', file: 'budget-tracker-delivery.html' },
  { key: '1qG4n', name: 'Content Calendar', file: 'content-calendar-delivery.html' },
  { key: 'PtdkO', name: 'Job Tracker', file: 'job-tracker-delivery.html' },
  { key: 'kZMFo', name: 'CRM Template', file: 'crm-template-delivery.html' }
];

const targetArg = process.argv[2] || 'all';
const DRY_RUN = process.argv.includes('--dry-run');

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
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.js-upload-digital-file-row'));
    return rows.map(row => ({
      id: row.getAttribute('data-digital-file-id') || '',
      text: row.innerText.replace(/\s+/g, ' ').trim(),
      cls: row.className,
      deleted: row.classList.contains('deleted') || row.style.display === 'none',
      status: row.getAttribute('data-status') || ''
    }));
  });
}

async function waitUntilUploaded(page, expectedFileName) {
  for (let i = 0; i < 90; i++) {
    const files = await getFiles(page);
    if (files.some(file => file.text.includes(expectedFileName) && !/uploading|processing/i.test(file.text + ' ' + file.cls))) {
      return files;
    }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${expectedFileName} upload`);
}

async function uploadFile(page, absoluteFile) {
  const beforeInputs = await page.locator('input[type="file"]').count();
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 7000 }).catch(() => null);
  await page.locator('#files').click();
  const chooser = await chooserPromise;
  if (chooser) {
    await chooser.setFiles(absoluteFile);
    return;
  }

  await sleep(1200);
  const inputs = await page.locator('input[type="file"]').elementHandles();
  if (!inputs.length) throw new Error('No file input appeared after clicking Upload another product file');
  const input = inputs[Math.max(beforeInputs, inputs.length - 1)] || inputs[inputs.length - 1];
  await input.setInputFiles(absoluteFile);
}

async function deleteOldFiles(page, expectedFileName) {
  const oldFileIds = await page.evaluate((expected) => {
    return Array.from(document.querySelectorAll('.js-upload-digital-file-row'))
      .filter(row => !(row.innerText || '').includes(expected))
      .map(row => row.getAttribute('data-digital-file-id'))
      .filter(Boolean);
  }, expectedFileName);

  for (const fileId of oldFileIds) {
    await page.evaluate((id) => {
      const row = document.querySelector(`.js-upload-digital-file-row[data-digital-file-id="${id}"]`);
      const deleteBtn = row && row.querySelector('.js-uploaddelete');
      if (deleteBtn) deleteBtn.click();
    }, fileId);
    await sleep(600);
    const confirm = page.locator('.sweet-alert button.confirm, .swal-button--confirm, button:has-text("OK"), button:has-text("Yes"), button:has-text("Confirm")').first();
    if (await confirm.count()) {
      await confirm.click({ force: true }).catch(() => {});
      await sleep(1000);
    }
    for (let i = 0; i < 10; i++) {
      const visibleConfirm = page.locator('.sweet-alert:visible button.confirm, .sweet-alert:visible button:has-text("OK"), .swal-modal:visible button').first();
      if (!(await visibleConfirm.count())) break;
      await visibleConfirm.click({ force: true }).catch(() => {});
      await sleep(700);
    }
  }
  await page.waitForFunction(() => {
    const overlay = document.querySelector('.sweet-overlay');
    return !overlay || getComputedStyle(overlay).display === 'none' || overlay.style.display === 'none';
  }, { timeout: 15000 }).catch(() => {});
}

async function saveChanges(page) {
  const save = page.locator('input[type="submit"][value="Save Changes"], button:has-text("Save Changes"), .js-edit-page-save-button, .js-save-ebook-button').first();
  if (await save.count()) {
    await save.click({ force: true });
  } else {
    await page.locator('text=Save Changes').first().click();
  }
  await sleep(5000);
}

async function processProduct(page, product) {
  const filePath = path.join(DELIVERY_DIR, product.file);
  if (!fs.existsSync(filePath)) throw new Error(`Missing delivery file: ${filePath}`);
  log(`Opening ${product.name} (${product.key})`);
  await page.goto(`https://payhip.com/product/edit/${product.key}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3500);
  await screenshot(page, `before-${product.key}`);

  const before = await getFiles(page);
  log(`Before files: ${before.map(f => f.text).join(' | ') || '(none)'}`);
  if (before.some(f => f.text.includes(product.file)) && before.length === 1) {
    log(`Already has only ${product.file}; skipping upload`);
    return { product, status: 'already-ok', files: before };
  }

  if (!DRY_RUN && !before.some(f => f.text.includes(product.file))) {
    await uploadFile(page, filePath);
    const afterUpload = await waitUntilUploaded(page, product.file);
    log(`After upload: ${afterUpload.map(f => f.text).join(' | ')}`);
  }

  if (!DRY_RUN) {
    await deleteOldFiles(page, product.file);
    await screenshot(page, `after-delete-${product.key}`);
    await saveChanges(page);
    await screenshot(page, `after-save-${product.key}`);
    await page.goto(`https://payhip.com/product/edit/${product.key}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2500);
  }

  const finalFiles = await getFiles(page);
  const ok = finalFiles.some(f => f.text.includes(product.file));
  log(`Final files: ${finalFiles.map(f => f.text).join(' | ') || '(none)'}`);
  if (!ok) throw new Error(`${product.name} did not retain ${product.file}`);
  return { product, status: 'uploaded', files: finalFiles };
}

(async () => {
  const selected = targetArg === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(product => product.key === targetArg || product.name.toLowerCase().includes(targetArg.toLowerCase()));

  if (!selected.length) throw new Error(`No product matched: ${targetArg}`);

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
        if (targetArg !== 'all') throw error;
      }
    }
  } finally {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2), 'utf8');
    log(`Saved results.json`);
    await browser.close().catch(() => {});
  }
})();
