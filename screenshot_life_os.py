from playwright.sync_api import sync_playwright
import ftplib, os

CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
OUT = 'C:/Users/Administrator/notiontemplafix/images/previews/life-os-app.png'
URL = 'https://notiontemplafix.com/life-os-app.html'

HOST = "212.85.28.149"
USER = "u868313694.notiontemplafix.com"
PASS = "Xxh113324~"
REMOTE = "/public_html/images/previews/life-os-app.png"

# Screenshot
with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=CHROME,
        args=['--no-sandbox', '--disable-dev-shm-usage']
    )
    context = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = context.new_page()

    # Inject sessionStorage before page scripts run:
    # ntf_demo=1 makes DEMO=true (LS=sessionStorage)
    # ntf_unlock_life-os-app=1 makes LS.getItem(UNLOCK_KEY)==='1' → bootApp() called → unlockGate hidden
    page.add_init_script("""
        sessionStorage.setItem('ntf_demo', '1');
        sessionStorage.setItem('lib_unlocked_life-os', '1');
    """)

    print(f'Loading {URL} in demo mode...')
    try:
        page.goto(URL, wait_until='networkidle', timeout=25000)
    except Exception:
        page.goto(URL, wait_until='domcontentloaded', timeout=20000)

    # Wait for App UI to fully render
    page.wait_for_timeout(2000)

    page.screenshot(path=OUT, clip={'x': 0, 'y': 0, 'width': 1280, 'height': 800})
    browser.close()

size = os.path.getsize(OUT)
print(f'Screenshot saved: {OUT} ({size} bytes)')

# FTP upload
ftp = ftplib.FTP(HOST, timeout=30)
ftp.login(USER, PASS)
ftp.set_pasv(True)
with open(OUT, 'rb') as f:
    ftp.storbinary(f'STOR {REMOTE}', f)
ftp.quit()
print(f'FTP uploaded: {REMOTE}')
