const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\Users\\Administrator\\notiontemplafix';
const OUT = path.join(ROOT, 'payhip-delivery');
const links = JSON.parse(fs.readFileSync(path.join(ROOT, 'notion-single-delivery-links.json'), 'utf8'));

const descriptions = {
  'life-os': 'Goals, habits, tasks, journal, health, weekly reviews, and focus planning.',
  'second-brain': 'Capture ideas, organize projects and resources, and keep a searchable knowledge base.',
  'business-os': 'Projects, CRM, operations, KPIs, payments, and business planning.',
  'student-os': 'Assignments, courses, exams, study sessions, and academic planning.',
  'finance-tracker-pro': 'Income, expenses, budgets, savings goals, and monthly financial reporting.',
  'content-creator-os': 'Content ideas, production pipeline, publishing calendar, and analytics planning.',
  'freelancer-hub': 'Clients, projects, invoices, deadlines, and freelance operations.',
  'personal-dashboard': 'Calendar, tasks, notes, quick links, and daily command center.',
  'weekly-planner': 'Weekly priorities, tasks, meals, reflections, and planning rituals.',
  'study-planner': 'Courses, assignments, exams, study sessions, and progress tracking.',
  'meeting-notes': 'Meeting agendas, notes, action items, decisions, and follow-ups.',
  'project-manager': 'Milestones, tasks, timelines, team views, and project reporting.',
  'budget-tracker': 'Income, expenses, category budgets, savings goals, and monthly summaries.',
  'content-calendar': 'Publishing schedule, channels, campaign status, and content workflow.',
  'job-tracker': 'Applications, interviews, offers, follow-ups, and job search pipeline.',
  'crm-template': 'Contacts, deals, pipeline, follow-ups, and customer relationship tracking.'
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileFor(slug) {
  return `${slug}-notion-template-link.html`;
}

for (const product of links.products) {
  const description = descriptions[product.slug] || 'A matching Notion template for your purchased product.';
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(product.name)} - Notion Template</title>
  <style>
    :root { color-scheme: light; --ink:#17172f; --muted:#606070; --brand:#6c5ce7; --line:#e7e2ff; --soft:#f5f2ff; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; font-family: Inter, Arial, sans-serif; color:var(--ink); background:linear-gradient(135deg,#f7f8ff,#ffffff); display:grid; place-items:center; padding:32px; }
    main { width:min(760px,100%); background:#fff; border:1px solid var(--line); border-radius:22px; box-shadow:0 24px 70px rgba(42,34,115,.14); padding:38px; }
    .eyebrow { display:inline-flex; align-items:center; gap:8px; padding:8px 13px; border-radius:999px; background:var(--soft); color:var(--brand); font-weight:800; }
    h1 { margin:22px 0 12px; font-size:36px; line-height:1.1; }
    p { color:var(--muted); font-size:18px; line-height:1.7; }
    .actions { display:flex; flex-wrap:wrap; gap:14px; margin:28px 0; }
    a.button { display:inline-flex; align-items:center; justify-content:center; min-height:54px; padding:0 22px; border-radius:13px; text-decoration:none; font-weight:900; font-size:17px; }
    .primary { background:var(--brand); color:#fff; box-shadow:0 12px 28px rgba(108,92,231,.24); }
    .secondary { border:2px solid var(--brand); color:var(--brand); background:#fff; }
    .steps { margin-top:26px; padding:22px; border-radius:16px; background:#faf9ff; border:1px solid var(--line); }
    .steps strong { display:block; margin-bottom:10px; }
    ol { margin:0; padding-left:22px; color:var(--muted); line-height:1.8; font-size:16px; }
    code { overflow-wrap:anywhere; color:#3f35a7; }
  </style>
</head>
<body>
  <main>
    <span class="eyebrow">Notion Template Access</span>
    <h1>${escapeHtml(product.name)}</h1>
    <p>${escapeHtml(description)}</p>
    <p>This purchase includes this Notion template plus the matching browser web app from NotionTemplaFix.</p>
    <div class="actions">
      <a class="button primary" href="${escapeHtml(product.public_url)}" target="_blank" rel="noopener">Open Notion Template</a>
      <a class="button secondary" href="https://notiontemplafix.com/my-library.html" target="_blank" rel="noopener">Open Web App Library</a>
    </div>
    <div class="steps">
      <strong>How to use</strong>
      <ol>
        <li>Open the Notion template link above.</li>
        <li>Click Duplicate in Notion to copy it into your own workspace.</li>
        <li>Use Notion for long-term storage and the web app for the polished browser experience.</li>
      </ol>
    </div>
    <p>Direct template URL:<br><code>${escapeHtml(product.public_url)}</code></p>
  </main>
</body>
</html>`;
  fs.writeFileSync(path.join(OUT, fileFor(product.slug)), html, 'utf8');
  console.log(`Generated ${fileFor(product.slug)}`);
}
