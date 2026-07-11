txt = open('my-library.html', encoding='utf-8').read()
txt = txt.replace('href="https://payhip.com"', 'href="https://payhip.com" target="_blank" rel="noopener"')
open('my-library.html', 'w', encoding='utf-8').write(txt)
print('done')
