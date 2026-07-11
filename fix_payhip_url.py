txt = open('my-library.html', encoding='utf-8').read()
txt = txt.replace('href="https://payhip.com/account"', 'href="https://payhip.com"')
open('my-library.html', 'w', encoding='utf-8').write(txt)
print('done')
