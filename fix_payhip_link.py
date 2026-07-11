txt = open('my-library.html', encoding='utf-8').read()
old = 'href="https://payhip.com/account" target="_blank" rel="noopener"'
new = 'href="https://payhip.com/account"'
txt2 = txt.replace(old, new)
if txt2 != txt:
    open('my-library.html', 'w', encoding='utf-8').write(txt2)
    print('fixed')
else:
    print('pattern not found, checking actual tag:')
    import re
    for m in re.finditer(r'href="https://payhip.com/account[^"]*"[^>]*>', txt):
        print(' ', m.group(0))
