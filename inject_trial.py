import re, os

BASE = r'C:\Users\Administrator\notiontemplafix'

APPS = [
    ('personal-dashboard-app','Personal Dashboard','$9',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/a9fcf35a-c307-44dd-9ca0-9ad3ddcb6584'),
    ('weekly-planner-app','Weekly Planner','$9',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/bd798ed2-554a-4de7-961c-30a107875c84'),
    ('study-planner-app','Study Planner','$9',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/4701313c-55d7-4984-b8e7-63179a5aa91b'),
    ('meeting-notes-app','Meeting Notes','$9',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/0e693918-d7db-4a5b-a9a8-9cd46a5dac59'),
    ('content-calendar-app','Content Calendar','$9',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/08216c91-848d-4696-9114-da346332f64d'),
    ('job-tracker-app','Job Tracker','$9',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/d7139060-d38f-4bd1-b281-3f8f7f612a81'),
    ('budget-tracker-app','Budget Tracker','$9',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/c1195b2d-079e-4572-86e9-72be4b0920c9'),
    ('project-manager-app','Project Manager','$9',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/1eb16d33-e975-45cc-bbc2-4d538ccbf34b'),
    ('crm-template-app','CRM Template','$19',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/2e347777-7f62-4a5d-9d34-113a5b497a60'),
    ('life-os-app','Life OS Dashboard','$19',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/838cf7a7-6733-4ddb-8350-6a451479a809'),
    ('second-brain-app','Second Brain','$19',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/1c61f64e-d34b-4876-8ed9-b9aba02ec3e3'),
    ('student-os-app','Student OS','$15',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/47341d6a-8b3e-4228-abda-33d07a33c92b'),
    ('finance-tracker-app','Finance Tracker Pro','$15',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/20d2604e-3554-438f-b493-74dd5728801f'),
    ('content-creator-app','Content Creator OS','$19',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/abedadda-729b-483d-9c07-430c74158a1d'),
    ('business-os-app','Business OS','$29',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/08055181-7730-4390-ba81-b5faa9f621cb'),
    ('freelancer-hub-app','Freelancer Hub','$15',
     'https://notiontemplafix.lemonsqueezy.com/checkout/buy/52d2c14d-6fe5-4e95-835d-f7f8041827f2'),
]

LOCK_CSS = '''
/* === NTF Trial Mode === */
#ntf-lock{position:fixed;inset:0;background:rgba(0,0,0,.90);backdrop-filter:blur(14px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}
.ntf-lbox{background:#1a1a1a;border:1px solid #2d2d2d;border-radius:18px;padding:36px 32px;max-width:420px;width:100%;text-align:center}
.ntf-lico{font-size:44px;margin-bottom:10px}
.ntf-lname{font-size:22px;font-weight:800;color:#f0f0f0;margin-bottom:6px}
.ntf-lprice{display:inline-block;font-size:13px;font-weight:700;color:#8b6dff;background:rgba(108,71,255,.15);padding:4px 14px;border-radius:99px;margin-bottom:14px}
.ntf-ldesc{font-size:13px;color:#a0a0a0;line-height:1.65;margin-bottom:22px}
.ntf-lbuy{display:block;padding:13px 20px;background:#6C47FF;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;margin-bottom:10px;transition:background .2s}
.ntf-lbuy:hover{background:#8b6dff}
.ntf-ldemo{display:block;width:100%;padding:11px 20px;background:#242424;color:#a0a0a0;border:1px solid #333;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;text-align:center}
.ntf-ldemo:hover{background:#2e2e2e;color:#e0e0e0;border-color:#555}
.ntf-lback{display:block;font-size:12px;color:#555;margin-top:14px;text-decoration:none;transition:color .2s}
.ntf-lback:hover{color:#a0a0a0}
#ntf-banner{display:none;position:fixed;top:0;left:0;right:0;z-index:9998;background:#6C47FF;color:#fff;padding:10px 18px;font-size:13px;font-weight:500;align-items:center;gap:10px;flex-wrap:wrap}
.ntf-btxt{flex:1;min-width:0}
.ntf-bbuy{padding:5px 14px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;text-decoration:none;transition:background .2s}
.ntf-bbuy:hover{background:rgba(255,255,255,.3)}
'''

DEMO_VARS = '''
var DEMO=sessionStorage.getItem('ntf_demo')==='1';
var LS=DEMO?sessionStorage:localStorage;
function ntfAddCheck(){
  if(!DEMO)return true;
  var n=parseInt(sessionStorage.getItem('ntf_adds')||'0');
  if(n>=3){setTimeout(function(){alert('Upgrade to save unlimited entries');},0);return false;}
  sessionStorage.setItem('ntf_adds',n+1);
  return true;
}
'''

def lock_html(name, price, buy_url):
    return f'''<div id="ntf-lock">
<div class="ntf-lbox">
  <div class="ntf-lico">🔒</div>
  <div class="ntf-lname">{name}</div>
  <span class="ntf-lprice">{price}</span>
  <p class="ntf-ldesc">Try the interactive demo before you buy — explore all features with sample data.</p>
  <a class="ntf-lbuy" href="{buy_url}" target="_blank" rel="noopener">Unlock App &mdash; {price}</a>
  <button class="ntf-ldemo" id="ntf-try-demo">Try Demo</button>
  <a class="ntf-lback" href="/my-library.html">&#8592; Back to Library</a>
</div>
</div>
<div id="ntf-banner">
  <span class="ntf-btxt">Preview Mode &mdash; Data won&#8217;t be saved. Buy to unlock full access.</span>
  <a class="ntf-bbuy" href="{buy_url}" target="_blank" rel="noopener">Buy Now</a>
</div>'''

def init_js(app_key, buy_url):
    return f'''
(function(){{
  var unkey='ntf_unlock_{app_key}';
  var unlocked=localStorage.getItem(unkey);
  var demo=DEMO;
  var demoBtn=document.getElementById('ntf-try-demo');
  if(unlocked){{
    document.getElementById('ntf-lock').style.display='none';
    if(demoBtn)demoBtn.style.display='none';
    return;
  }}
  if(demo){{
    document.getElementById('ntf-lock').style.display='none';
    var b=document.getElementById('ntf-banner');
    b.style.display='flex';
    document.body.style.paddingTop='44px';
    return;
  }}
  document.getElementById('ntf-lock').style.display='flex';
  if(demoBtn){{
    demoBtn.addEventListener('click',function(){{
      sessionStorage.setItem('ntf_demo','1');
      window.location.reload();
    }});
  }}
}})();
'''

def process_app(slug, name, price, buy_url):
    fp = os.path.join(BASE, slug + '.html')
    with open(fp, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Add lock CSS before </style>
    c = c.replace('</style>', LOCK_CSS + '</style>', 1)

    # 2. Add lock HTML + banner after <body>
    c = c.replace('<body>', '<body>\n' + lock_html(name, price, buy_url) + '\n', 1)

    # 3. Find LAST inline <script> block and inject DEMO vars at its start
    # Find last occurrence of <script> without src= attribute
    last_inline = -1
    for m in re.finditer(r'<script>(?!\s*window)', c):
        last_inline = m.end()
    if last_inline == -1:
        # fallback: find last <script> at all
        m2 = list(re.finditer(r'<script>', c))
        if m2:
            last_inline = m2[-1].end()
    if last_inline != -1:
        c = c[:last_inline] + '\n' + DEMO_VARS + c[last_inline:]

    # 4. Replace localStorage. with LS. (but NOT inside comments or already replaced)
    c = c.replace('localStorage.getItem(', 'LS.getItem(')
    c = c.replace('localStorage.setItem(', 'LS.setItem(')
    c = c.replace('localStorage.removeItem(', 'LS.removeItem(')

    # 5. Add ntfAddCheck() before user-initiated push/unshift with uid()
    # Pattern A: else arr.push({id:uid()   → else{if(!ntfAddCheck())return;arr.push({id:uid()
    c = re.sub(
        r'\belse (\w+)\.(push|unshift)\(\{id:uid\(\)',
        r'else{if(!ntfAddCheck())return;\1.\2({id:uid()',
        c
    )
    # Pattern B: else{obj.id=uid();arr.push(obj);}
    c = re.sub(
        r'else\{obj\.id=uid\(\);(\w+)\.(push)\(obj\);\}',
        r'else{if(!ntfAddCheck())return;obj.id=uid();\1.\2(obj);}',
        c
    )
    # Pattern C: standalone arr.push({id:uid() / arr.unshift({id:uid()
    # Exclude lines with .forEach( or for( (seed loops), or function names with seed
    lines = c.split('\n')
    new_lines = []
    inside_seed = False
    for line in lines:
        stripped = line.strip()
        # Detect entering/leaving seed functions
        if re.search(r'function (seed|SEED|_seed)\w*\s*\(', line):
            inside_seed = True
        if inside_seed and stripped == '}':
            inside_seed = False
        # Skip if inside seed function or is a seed loop
        skip = inside_seed or 'forEach(' in line or 'for(var' in line or 'for (var' in line
        if not skip and re.search(r'(?<!else )(\w+)\.(push|unshift)\(\{id:uid\(\)', line):
            # Make sure it's not already handled (else case covered above)
            if 'else' not in line.split('.push')[0].split('.unshift')[0].split('\n')[-1]:
                indent = len(line) - len(line.lstrip())
                sp = ' ' * indent
                # Only inject if we can find the pattern cleanly
                new_line = re.sub(
                    r'(\w+)\.(push|unshift)\(\{id:uid\(\)',
                    r'if(!ntfAddCheck())return;\n' + sp + r'\1.\2({id:uid()',
                    line, count=1
                )
                new_lines.append(new_line)
                continue
        new_lines.append(line)
    c = '\n'.join(new_lines)

    # Also handle: arr.unshift(Object.assign({id:uid()  (finance-tracker)
    c = re.sub(
        r'(\w+)\.(push|unshift)\(Object\.assign\(\{id:uid\(\)',
        lambda m: 'if(!ntfAddCheck())return;\n  ' + m.group(1) + '.' + m.group(2) + '(Object.assign({id:uid()',
        c
    )

    # 6. Add init JS before </script></body> or </script>\n</body>
    app_key = slug
    ij = init_js(app_key, buy_url)
    # Find the last </script>
    last_sc = c.rfind('</script>')
    if last_sc != -1:
        c = c[:last_sc] + ij + '\n</script>' + c[last_sc + len('</script>'):]

    with open(fp, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f'OK  {slug}')

for args in APPS:
    process_app(*args)
print('All done')
