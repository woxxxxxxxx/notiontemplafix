from playwright.sync_api import sync_playwright
import os

CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
OUT_DIR = 'C:/Users/Administrator/notiontemplafix/images/previews'
BASE = 'https://notiontemplafix.com'

PAID = [
    ('personal-dashboard-app.html',  'personal-dashboard-app.png'),
    ('weekly-planner-app.html',      'weekly-planner-app.png'),
    ('study-planner-app.html',       'study-planner-app.png'),
    ('meeting-notes-app.html',       'meeting-notes-app.png'),
    ('content-calendar-app.html',    'content-calendar-app.png'),
    ('job-tracker-app.html',         'job-tracker-app.png'),
    ('budget-tracker-app.html',      'budget-tracker-app.png'),
    ('project-manager-app.html',     'project-manager-app.png'),
    ('crm-template-app.html',        'crm-template-app.png'),
    ('life-os-app.html',             'life-os-app.png'),
    ('second-brain-app.html',        'second-brain-app.png'),
    ('student-os-app.html',          'student-os-app.png'),
    ('finance-tracker-app.html',     'finance-tracker-app.png'),
    ('content-creator-app.html',     'content-creator-app.png'),
    ('business-os-app.html',         'business-os-app.png'),
    ('freelancer-hub-app.html',      'freelancer-hub-app.png'),
]

FREE = [
    ('habit-tracker-app.html',       'habit-tracker-app.png'),
    ('book-tracker-app.html',        'book-tracker-app.png'),
    ('goal-tracker-app.html',        'goal-tracker-app.png'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=CHROME,
        args=['--no-sandbox', '--disable-dev-shm-usage']
    )

    # Screenshot paid apps: click Try Demo, then screenshot
    for slug, filename in PAID:
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        url = f'{BASE}/{slug}'
        out = os.path.join(OUT_DIR, filename)
        try:
            page.goto(url, wait_until='networkidle', timeout=20000)
        except Exception:
            try:
                page.goto(url, wait_until='domcontentloaded', timeout=15000)
                page.wait_for_timeout(2000)
            except Exception as e:
                print(f'SKIP {slug}: {e}')
                context.close()
                continue
        # Click Try Demo button
        try:
            btn = page.locator('#ntf-try-demo')
            btn.wait_for(state='visible', timeout=5000)
            btn.click()
            # Page reloads after click (window.location.reload())
            page.wait_for_load_state('networkidle', timeout=15000)
        except Exception as e:
            print(f'  WARN {slug}: Try Demo click failed: {e}')
        page.wait_for_timeout(1200)
        page.screenshot(path=out, clip={'x': 0, 'y': 0, 'width': 1280, 'height': 800})
        size = os.path.getsize(out)
        print(f'OK  {filename}  ({size} bytes)')
        context.close()

    # Screenshot free apps: just navigate and screenshot
    for slug, filename in FREE:
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        url = f'{BASE}/{slug}'
        out = os.path.join(OUT_DIR, filename)
        try:
            page.goto(url, wait_until='networkidle', timeout=20000)
        except Exception:
            try:
                page.goto(url, wait_until='domcontentloaded', timeout=15000)
                page.wait_for_timeout(2000)
            except Exception as e:
                print(f'SKIP {slug}: {e}')
                context.close()
                continue
        page.wait_for_timeout(1000)
        page.screenshot(path=out, clip={'x': 0, 'y': 0, 'width': 1280, 'height': 800})
        size = os.path.getsize(out)
        print(f'OK  {filename}  ({size} bytes)')
        context.close()

    browser.close()
print('All done')
