import ftplib

HOST = "212.85.28.149"
USER = "u868313694.notiontemplafix.com"
PASS = "Xxh113324~"
BASE = "C:/Users/Administrator/notiontemplafix"
ROOT = "/public_html"

def up(ftp, local, remote):
    with open(local, "rb") as f:
        ftp.storbinary("STOR " + remote, f)
    print("  UP " + remote)

ftp = ftplib.FTP(HOST, timeout=30)
ftp.login(USER, PASS)
ftp.set_pasv(True)

up(ftp, BASE + "/webhook.php",        ROOT + "/webhook.php")
up(ftp, BASE + "/check-purchase.php", ROOT + "/check-purchase.php")
up(ftp, BASE + "/life-os-app.html",   ROOT + "/life-os-app.html")
up(ftp, BASE + "/index.html",         ROOT + "/index.html")
up(ftp, BASE + "/my-library.html",    ROOT + "/my-library.html")

ftp.quit()
print("Done.")
