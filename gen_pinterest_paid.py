"""Generate 1000x1500 Pinterest pin images for 13 paid apps.
Each: open URL, click Try Demo, screenshot the app interface, build pin."""
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
import io, os

CHROME   = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
OUT_DIR  = 'C:/Users/Administrator/notiontemplafix/pinterest'
FONT_B   = 'C:/Windows/Fonts/segoeuib.ttf'
FONT_R   = 'C:/Windows/Fonts/segoeui.ttf'

PIN_W, PIN_H = 1000, 1500
SHOT_H  = 900
TEXT_H  = 600

BG_DARK  = (15, 15, 15)
BG_WHITE = (255, 255, 255)
ACCENT   = (108, 71, 255)
TXT_DARK = (20, 20, 46)
TXT_GREY = (100, 100, 120)

APPS = [
    {'file': 'life-os-app.html',          'title': 'Life OS Dashboard',    'sub': 'Goals • Habits • Tasks • Journal • Health — $19'},
    {'file': 'second-brain-app.html',     'title': 'Second Brain App',     'sub': 'Capture ideas • Connect notes • Find anything — $19'},
    {'file': 'business-os-app.html',      'title': 'Business OS',          'sub': 'Clients • Projects • Tasks • Finance — $29'},
    {'file': 'student-os-app.html',       'title': 'Student OS',           'sub': 'Courses • Assignments • GPA Tracker — $15'},
    {'file': 'finance-tracker-app.html',  'title': 'Finance Tracker Pro',  'sub': 'Income • Expenses • Budgets • Savings — $15'},
    {'file': 'content-creator-app.html',  'title': 'Content Creator OS',   'sub': 'Pipeline • Calendar • Ideas • Analytics — $19'},
    {'file': 'freelancer-hub-app.html',   'title': 'Freelancer Hub',       'sub': 'Clients • Projects • Time • Invoices — $15'},
    {'file': 'personal-dashboard-app.html','title': 'Personal Dashboard',  'sub': 'Tasks • Notes • Calendar • Links — $9'},
    {'file': 'weekly-planner-app.html',   'title': 'Weekly Planner App',   'sub': '7-Day View • Meals • Reflection — $9'},
    {'file': 'study-planner-app.html',    'title': 'Study Planner App',    'sub': 'Pomodoro • Assignments • GPA — $9'},
    {'file': 'budget-tracker-app.html',   'title': 'Budget Tracker App',   'sub': 'Expenses • Budgets • Bills • Reports — $9'},
    {'file': 'project-manager-app.html',  'title': 'Project Manager App',  'sub': 'Kanban • Timeline • Team — $9'},
    {'file': 'crm-template-app.html',     'title': 'CRM Template App',     'sub': 'Contacts • Deals • Pipeline — $19'},
]


def take_screenshot_after_demo(page, url: str) -> Image.Image:
    print(f'  Loading {url}')
    try:
        page.goto(url, wait_until='networkidle', timeout=30000)
    except Exception:
        page.goto(url, wait_until='domcontentloaded', timeout=25000)
    page.wait_for_timeout(1500)

    # Inject demo mode directly via sessionStorage then reload
    # This mirrors exactly what clicking "Try Demo" does in the app JS
    try:
        page.evaluate("sessionStorage.setItem('ntf_demo', '1')")
        with page.expect_navigation(wait_until='domcontentloaded', timeout=20000):
            page.evaluate("window.location.reload()")
        page.wait_for_timeout(3000)
        print('  Injected demo mode, page reloaded')
    except Exception as e:
        print(f'  Demo injection failed: {e}')

    raw = page.screenshot(clip={'x': 0, 'y': 0, 'width': 1280, 'height': 800})
    return Image.open(io.BytesIO(raw)).convert('RGB')


def crop_to_fill(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    src_w, src_h = img.size
    scale = max(target_w / src_w, target_h / src_h)
    new_w = int(src_w * scale)
    new_h = int(src_h * scale)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    left = (new_w - target_w) // 2
    top  = (new_h - target_h) // 2
    return img.crop((left, top, left + target_w, top + target_h))


def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines, current = [], ''
    for word in words:
        test = (current + ' ' + word).strip()
        if draw.textlength(test, font=font) <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def make_pin(screenshot: Image.Image, app: dict) -> Image.Image:
    pin = Image.new('RGB', (PIN_W, PIN_H), BG_DARK)

    shot = crop_to_fill(screenshot, PIN_W, SHOT_H)
    pin.paste(shot, (0, 0))

    bar = Image.new('RGB', (PIN_W, 6), ACCENT)
    pin.paste(bar, (0, SHOT_H))

    text_zone = Image.new('RGB', (PIN_W, TEXT_H - 6), BG_WHITE)
    pin.paste(text_zone, (0, SHOT_H + 6))

    draw = ImageDraw.Draw(pin)
    pad_x = 60
    top_y = SHOT_H + 6

    brand_font = ImageFont.truetype(FONT_B, 18)
    brand_text = 'NotionTemplaFix'
    brand_y = top_y + 32
    draw.text((pad_x, brand_y), brand_text, font=brand_font, fill=ACCENT)
    brand_w = int(draw.textlength(brand_text, font=brand_font))
    draw.rectangle([pad_x, brand_y + 24, pad_x + brand_w, brand_y + 27], fill=ACCENT)

    title_font = ImageFont.truetype(FONT_B, 58)
    title_lines = wrap_text(draw, app['title'], title_font, PIN_W - pad_x * 2)
    title_y = brand_y + 52
    for line in title_lines:
        draw.text((pad_x, title_y), line, font=title_font, fill=TXT_DARK)
        title_y += 68

    sep_y = title_y + 10
    draw.rectangle([pad_x, sep_y, PIN_W - pad_x, sep_y + 2], fill=(220, 220, 230))

    sub_font = ImageFont.truetype(FONT_R, 28)
    sub_lines = wrap_text(draw, app['sub'], sub_font, PIN_W - pad_x * 2)
    sub_y = sep_y + 22
    for line in sub_lines:
        draw.text((pad_x, sub_y), line, font=sub_font, fill=TXT_GREY)
        sub_y += 38

    url_font = ImageFont.truetype(FONT_B, 22)
    url_y = PIN_H - 52
    draw.text((pad_x, url_y), 'notiontemplafix.com', font=url_font, fill=ACCENT)

    return pin


os.makedirs(OUT_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=CHROME,
        args=['--no-sandbox', '--disable-dev-shm-usage']
    )
    context = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = context.new_page()

    for app in APPS:
        slug = app['file'].replace('.html', '')
        out_name = slug + '-pin.jpg'
        print(f'\n>>> {out_name}')
        url = f'https://notiontemplafix.com/{app["file"]}'
        shot = take_screenshot_after_demo(page, url)
        pin  = make_pin(shot, app)
        out_path = os.path.join(OUT_DIR, out_name)
        pin.save(out_path, 'JPEG', quality=92)
        size_kb = os.path.getsize(out_path) // 1024
        print(f'  Saved: {out_path} ({size_kb} KB)')

    browser.close()

print(f'\nAll {len(APPS)} pins generated.')
