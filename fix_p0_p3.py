import glob, re, os, json

# ── constants ───────────────────────────────────────────────────────────────
HINT_DUAL = ('<div style="font-size:11px;color:#8b7fd4;margin-bottom:10px;'
             'display:flex;align-items:center;gap:4px">'
             '<span>&#10022;</span><span>Includes free web app + Notion template</span></div>')
HINT_FREE = ('<div style="font-size:11px;color:#8b7fd4;margin-bottom:10px;'
             'display:flex;align-items:center;gap:4px">'
             '<span>&#10022;</span><span>Free web app &mdash; no download needed</span></div>')
PRIVACY_LINK = '<a href="/privacy-policy.html">Privacy Policy</a>'
LOCAL_NOTICE = ('<span title="Your data is saved in this browser. Export regularly to avoid data loss." '
                'style="font-size:12px;color:#666;cursor:help;margin-left:auto">&#128190; Data saved locally</span>')

log = []

# ═══════════════════════════════════════════════════════════════════════════
# P0-A: index.html — card hint labels, newsletter CSS cleanup,
#        og:url, social proof, bundle card, schema.org
# ═══════════════════════════════════════════════════════════════════════════
idx = open('index.html', encoding='utf-8', errors='ignore').read()
orig_idx = idx

# --- P0: add hint to dual-button (premium) cards ---
def add_hint_dual(m):
    body = m.group(0)
    if HINT_DUAL in body or HINT_FREE in body:
        return body
    return body.replace('<div class="btn-row">', HINT_DUAL + '<div class="btn-row">', 1)

idx = re.sub(
    r'<div class="card" data-price="premium">[\s\S]*?</div></div></div>',
    add_hint_dual, idx
)

# --- P0: add hint to free single-button cards ---
def add_hint_free(m):
    body = m.group(0)
    if HINT_DUAL in body or HINT_FREE in body:
        return body
    return body.replace('<a class="card-btn" href=', HINT_FREE + '<a class="card-btn" href=', 1)

idx = re.sub(
    r'<div class="card" data-price="free">[\s\S]*?</div></div></div>',
    add_hint_free, idx
)

# --- P1: remove newsletter CSS (lines with .newsletter) ---
idx = re.sub(r'\s*\.newsletter[^{]*\{[^}]*\}', '', idx)
idx = re.sub(r'\s*\.newsletter-[a-z]+[^{]*\{[^}]*\}', '', idx)
# also remove newsletter from media query
idx = re.sub(r'\.newsletter-form\{[^}]*\}', '', idx)
idx = re.sub(r'\.newsletter\s+h2\{[^}]*\}', '', idx)
idx = re.sub(r'\.newsletter\{[^}]*\}', '', idx)

# --- P1: add og:url ---
if 'og:url' not in idx:
    idx = idx.replace(
        '<meta property="og:image"',
        '<meta property="og:url" content="https://notiontemplafix.com/">\n<meta property="og:image"'
    )

# --- P1: schema.org ItemList ---
if 'ItemList' not in idx:
    # Extract cards from index
    cards_data = re.findall(
        r'data-price="([^"]+)"[\s\S]*?<h3>([^<]+)</h3>[\s\S]*?href="(/[^"]+\.html)"[\s\S]*?</div></div></div>',
        idx
    )
    items = []
    for i, (price, name, url) in enumerate(cards_data, 1):
        items.append({
            "@type": "ListItem",
            "position": i,
            "name": name.strip(),
            "url": "https://notiontemplafix.com" + url
        })
    schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "NotionTemplaFix Templates",
        "url": "https://notiontemplafix.com",
        "itemListElement": items
    }
    schema_tag = '<script type="application/ld+json">\n' + json.dumps(schema, indent=2) + '\n</script>\n'
    idx = idx.replace('</head>', schema_tag + '</head>', 1)

# --- P2: social proof below hero <p> ---
SOCIAL_PROOF = '''<div style="display:flex;justify-content:center;gap:24px;margin-top:16px;flex-wrap:wrap;margin-bottom:24px">
  <div style="text-align:center"><div style="font-size:22px;font-weight:800;color:#6c5ce7">500+</div><div style="font-size:12px;color:#888">Downloads</div></div>
  <div style="text-align:center"><div style="font-size:22px;font-weight:800;color:#6c5ce7">16</div><div style="font-size:12px;color:#888">Templates</div></div>
  <div style="text-align:center"><div style="font-size:22px;font-weight:800;color:#6c5ce7">Free</div><div style="font-size:12px;color:#888">No signup</div></div>
</div>'''

if 'social-proof' not in idx and '500+' not in idx:
    # Find the hero p tag end and CTA buttons
    idx = re.sub(
        r'(<p>Beautiful[^<]*</p>)',
        r'\1' + '\n' + SOCIAL_PROOF,
        idx, count=1
    )

# --- P2: bundle card at top of grid ---
BUNDLE_CARD = '''<div class="card" data-price="premium" style="background:linear-gradient(135deg,#6c5ce7,#5a4bd6);border:none;color:#fff">
  <div class="thumb" style="background:linear-gradient(135deg,#5a4bd6,#4a3bc6);height:140px">
    <span style="font-size:48px">&#127873;</span>
    <span class="price-tag paid" style="background:rgba(255,255,255,.25);color:#fff">$49</span>
  </div>
  <div class="body" style="color:#fff">
    <h3 style="color:#fff">All Templates Bundle</h3>
    <p style="color:rgba(255,255,255,.85)">Get all 10+ premium templates + web apps. Best value — save over 60%.</p>
    <div style="font-size:11px;color:rgba(255,255,255,.7);margin-bottom:10px;display:flex;align-items:center;gap:4px"><span>&#10022;</span><span>Instant access to everything</span></div>
    <a class="card-btn" href="https://payhip.com/b/notiontemplafix" target="_blank" rel="noopener" style="background:#fff;color:#6c5ce7;font-weight:800">Buy Bundle &mdash; $49</a>
  </div>
</div>'''

if 'All Templates Bundle' not in idx:
    # Insert at top of grid (before first card)
    idx = re.sub(
        r'(<div id="templateGrid"[^>]*>)',
        r'\1\n' + BUNDLE_CARD,
        idx, count=1
    )
    if 'All Templates Bundle' not in idx:
        # Try without id
        idx = re.sub(
            r'(<div class="grid"[^>]*>)',
            r'\1\n' + BUNDLE_CARD,
            idx, count=1
        )

# --- P1: footer privacy link (index.html) ---
if PRIVACY_LINK not in idx:
    idx = idx.replace(
        '<a href="/#faq">FAQ</a></div>',
        '<a href="/#faq">FAQ</a>' + PRIVACY_LINK + '</div>'
    )

if idx != orig_idx:
    open('index.html', 'w', encoding='utf-8').write(idx)
    log.append('index.html: og:url, newsletter CSS, social proof, bundle card, hints, schema, privacy link')

# ═══════════════════════════════════════════════════════════════════════════
# P0-B: my-library.html — add top notice banner
# ═══════════════════════════════════════════════════════════════════════════
lib = open('my-library.html', encoding='utf-8', errors='ignore').read()
orig_lib = lib
LIBRARY_BANNER = '''<div style="background:#f5f3ff;border:1.5px solid #e0d9ff;border-radius:10px;padding:16px 20px;margin:16px 24px 0;display:flex;align-items:flex-start;gap:12px;max-width:860px;margin-left:auto;margin-right:auto">
  <span style="font-size:22px">&#128238;</span>
  <div>
    <div style="font-weight:700;color:#1a1a2e;margin-bottom:4px">Your purchased templates are delivered via email by Payhip</div>
    <div style="font-size:13px;color:#555;line-height:1.6">Check your inbox for the download link after purchase, or visit your Payhip account to re-download anytime.</div>
    <a href="https://payhip.com/account" target="_blank" rel="noopener"
       style="display:inline-block;margin-top:10px;padding:8px 20px;background:#6c5ce7;color:#fff;font-size:13px;font-weight:700;border-radius:7px;text-decoration:none">
      Go to Payhip Account &#8599;
    </a>
  </div>
</div>'''
if 'Payhip Account' not in lib:
    lib = re.sub(r'(</nav>)', r'\1\n' + LIBRARY_BANNER, lib, count=1)
    open('my-library.html', 'w', encoding='utf-8').write(lib)
    log.append('my-library.html: added Payhip delivery notice banner')

# ═══════════════════════════════════════════════════════════════════════════
# P1: footer privacy link in ALL html pages
# ═══════════════════════════════════════════════════════════════════════════
footer_fixed = 0
for fpath in glob.glob('*.html'):
    if fpath in ['privacy-policy.html', 'privacy.html']:
        continue
    txt = open(fpath, encoding='utf-8', errors='ignore').read()
    orig = txt
    # Look for footer-links div with anchor pattern
    if PRIVACY_LINK in txt:
        continue
    # Pattern: footer links
    if re.search(r'footer-links', txt):
        txt = re.sub(
            r'(<div class="footer-links">[\s\S]*?)(</div>)',
            lambda m: m.group(1) + PRIVACY_LINK + m.group(2),
            txt, count=1
        )
    elif re.search(r'class="footer"', txt):
        txt = re.sub(
            r'(<div class="footer"><div class="footer-links">[\s\S]*?)(</div>)',
            lambda m: m.group(1) + PRIVACY_LINK + m.group(2),
            txt, count=1
        )
    if txt != orig:
        open(fpath, 'w', encoding='utf-8').write(txt)
        footer_fixed += 1

log.append(f'footer privacy link: added to {footer_fixed} files')

# ═══════════════════════════════════════════════════════════════════════════
# P1: og:url for template pages (not index)
# ═══════════════════════════════════════════════════════════════════════════
og_fixed = 0
for fpath in sorted(glob.glob('*.html')):
    if fpath == 'index.html':
        continue
    txt = open(fpath, encoding='utf-8', errors='ignore').read()
    orig = txt
    if 'og:url' in txt:
        continue
    # Only fix if og:image exists (i.e., has OG meta)
    if 'og:image' not in txt:
        continue
    canon = re.search(r'<link rel="canonical" href="([^"]+)"', txt)
    url = canon.group(1) if canon else f'https://notiontemplafix.com/{fpath}'
    txt = re.sub(
        r'(<meta property="og:image")',
        f'<meta property="og:url" content="{url}">\n\\1',
        txt, count=1
    )
    if txt != orig:
        open(fpath, 'w', encoding='utf-8').write(txt)
        og_fixed += 1

log.append(f'og:url: added to {og_fixed} pages')

# ═══════════════════════════════════════════════════════════════════════════
# P3: localStorage notice in *-app.html topbar/navbar
# ═══════════════════════════════════════════════════════════════════════════
app_fixed = 0
for fpath in glob.glob('*-app.html'):
    txt = open(fpath, encoding='utf-8', errors='ignore').read()
    orig = txt
    if 'Data saved locally' in txt:
        continue
    if 'localStorage' not in txt:
        continue
    # Add notice to end of navbar / topbar
    # Try common patterns: </nav> or </div><!-- end topbar -->
    if '</nav>' in txt:
        # Insert just before closing nav
        txt = txt.replace(
            '</nav>',
            LOCAL_NOTICE + '</nav>',
            1
        )
    elif 'class="topbar"' in txt or 'class="navbar"' in txt:
        txt = re.sub(r'(class="(?:topbar|navbar)"[^>]*>[\s\S]*?)(</div>)',
                     lambda m: m.group(1) + LOCAL_NOTICE + m.group(2),
                     txt, count=1)
    if txt != orig:
        open(fpath, 'w', encoding='utf-8').write(txt)
        app_fixed += 1

log.append(f'localStorage notice: added to {app_fixed} app pages')

# ═══════════════════════════════════════════════════════════════════════════
print('\n=== FIX SUMMARY ===')
for l in log:
    print('  OK: ' + l)
