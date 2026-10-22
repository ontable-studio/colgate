"""Build docs/INSTALL.pdf from docs/INSTALL.md (cover, table of contents, header, footer).

Needs: pip install markdown, and Google Chrome (used headless to print the PDF).
Run from the repo root:  python tools/docs-pdf/build_pdf.py
Brand assets come from src/assets (game-ready exports of the files in .resources).
"""

import json
import re
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "docs" / "INSTALL.md"
OUT = ROOT / "docs" / "INSTALL.pdf"
ASSETS = ROOT / "src" / "assets"
CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]

BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus",
         "September", "Oktober", "November", "Desember"]


def uri(p: Path) -> str:
    return p.resolve().as_uri()


def find_chrome() -> str:
    for c in CHROME_CANDIDATES:
        if Path(c).exists():
            return c
    sys.exit("Chrome not found; add its path to CHROME_CANDIDATES.")


def render_body(md_text: str):
    """Markdown -> (html, [(id, title)]) with numbered h2 ids and drawn checkboxes."""
    # the source indents list content with 3 spaces; python-markdown needs 4
    md_text = re.sub(r"(?m)^   (?=\S)", "    ", md_text)
    md_text = re.sub(r"(?m)^(\d+\. .*)\n    - ", r"\1\n\n    - ", md_text)
    md_text = re.sub(r"(?m)^(    (?:- |\S).*)\n(\d+\. )", r"\1\n\n\2", md_text)
    md = markdown.Markdown(extensions=["tables", "sane_lists", "fenced_code"])
    html = md.convert(md_text)
    html = html.replace("<li>[ ] ", '<li class="cb">')
    # first h1 is the cover title; drop it from the body
    html = re.sub(r"<h1>.*?</h1>\s*", "", html, count=1)
    toc = []

    def add_id(m):
        title = re.sub(r"<[^>]+>", "", m.group(1))
        sid = f"s{len(toc) + 1}"
        toc.append((sid, title))
        return f'<h2 id="{sid}">{m.group(1)}</h2>'

    html = re.sub(r"<h2>(.*?)</h2>", add_id, html)
    return html, toc


CSS = """
@font-face{font-family:'Colgate Ready';font-weight:300;src:url('%(f_light)s')}
@font-face{font-family:'Colgate Ready';font-weight:700;src:url('%(f_bold)s')}
@font-face{font-family:'Colgate Ready';font-weight:700;font-style:italic;src:url('%(f_boldit)s')}
:root{--red:#c8102e;--red-dark:#8f0a21;--orange:#f7941d;--ink:#2a2a2a;--soft:#fbeef0}
@page{size:A4;margin:24mm 18mm 20mm 18mm;
  @top-left{content:'95%% Vitamin C Blast \\00B7  Panduan Instalasi Booth';font:700 8pt 'Colgate Ready',sans-serif;color:var(--red);
    border-bottom:1.2pt solid var(--red);padding-bottom:3mm;vertical-align:bottom}
  @top-right{content:url('%(logo_red)s');text-align:right;vertical-align:bottom;border-bottom:1.2pt solid var(--red);padding-bottom:3mm}
  @bottom-left{content:'Ontable Studio  \\00B7  Colgate Optic White Vitamin C';font:300 8pt 'Colgate Ready',sans-serif;color:#777;vertical-align:top;padding-top:4mm}
  @bottom-right{content:'Halaman ' counter(page) ' dari ' counter(pages);font:300 8pt 'Colgate Ready',sans-serif;color:#777;vertical-align:top;padding-top:4mm}
}
@page cover{margin:0;@top-left{content:none;border:0}@top-right{content:none;background:none;border:0}
  @bottom-left{content:none}@bottom-right{content:none}}
@page toc{@top-left{content:none;border:0}@top-right{content:none;background:none;border:0}}
*{box-sizing:border-box}
body{font-family:'Colgate Ready','Segoe UI',Arial,sans-serif;font-weight:300;font-size:10.5pt;line-height:1.55;color:var(--ink);margin:0}
b,strong{font-weight:700}

/* cover */
.cover{page:cover;width:210mm;height:297mm;position:relative;overflow:hidden;color:#fff;break-after:page;
  background:var(--red-dark) url('%(bg_photo)s') center/cover no-repeat}
.cover .shade{position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(120,6,22,.55) 0%%,rgba(120,6,22,0) 38%%,rgba(70,0,12,0) 62%%,rgba(70,0,12,.8) 100%%)}
.cover .logo{position:absolute;left:20mm;top:20mm;width:52mm}
/* "OPTIC WHITE / VITAMIN C" lockup, as on the game's home screen (1 design unit = .109mm) */
.cover .lockup{position:absolute;right:20mm;top:17mm;text-align:center;line-height:1;white-space:nowrap}
.cover .lockup .l1{display:inline-block;position:relative;font-size:14.2pt;letter-spacing:.76mm;margin-right:-.76mm}
.cover .lockup .l1 svg{position:absolute;right:-5.2mm;top:-1.6mm;width:3.6mm;height:3.6mm;fill:#fff}
.cover .lockup .l2{display:block;margin-top:.4mm;color:#ffc93c;font-size:23pt;letter-spacing:1.53mm;margin-right:-1.53mm}
.cover .lockup .l2 span{font-size:36pt;letter-spacing:0;position:relative;top:1.4mm;margin-left:.7mm}
.cover .rule{position:absolute;left:20mm;top:56mm;width:22mm;height:2mm;background:#ffb43c;border-radius:2px}
.cover h1{position:absolute;left:20mm;right:20mm;top:63mm;margin:0;font-size:44pt;line-height:1.02;font-weight:700;border:0;color:#fff;
  text-shadow:0 1.2mm 4mm rgba(90,0,15,.35)}
.cover h1 small{display:block;font-size:14pt;font-weight:300;letter-spacing:.01em;margin-top:5mm;line-height:1.35;max-width:130mm;text-shadow:none}
.cover .ring{position:absolute;left:27mm;top:89mm;width:156mm;height:156mm;overflow:visible}
.cover .baru{position:absolute;left:126mm;top:103mm;width:31mm;filter:drop-shadow(0 .5mm .8mm rgba(90,10,0,.4))}
.cover .baru text{font-family:'Colgate Ready',sans-serif;font-weight:700;font-style:italic}
.cover .pack{position:absolute;left:0;top:99mm;width:210mm;filter:drop-shadow(0 6mm 8mm rgba(60,0,10,.45))}
.cover .cap{position:absolute;filter:drop-shadow(0 2mm 3mm rgba(60,0,10,.35))}
.cover .meta{position:absolute;left:0;right:0;bottom:0;height:38mm;padding:6mm 20mm 0;display:flex;align-items:center;justify-content:space-between;
  background:linear-gradient(180deg,rgba(70,0,12,0),rgba(70,0,12,.7));font-size:9.5pt;line-height:1.45}
.cover .meta b{display:block;font-size:7.5pt;letter-spacing:.2em;text-transform:uppercase;color:#ffb43c;margin-bottom:.8mm}

/* table of contents */
.toc{page:toc;break-after:page}
.toc h1{font-size:22pt;color:var(--red);border:0;margin:0 0 6mm}
.toc ol{list-style:none;margin:0;padding:0;counter-reset:t}
.toc li{counter-increment:t;display:flex;align-items:baseline;gap:4mm;padding:3.2mm 0;border-bottom:.6pt solid #e3c9ce;font-size:12pt}
.toc li::before{content:counter(t);flex:none;width:8mm;height:8mm;border-radius:50%%;background:var(--red);color:#fff;
  font-weight:700;font-size:10pt;display:flex;align-items:center;justify-content:center}
.toc a{color:var(--ink);text-decoration:none;font-weight:700}
.toc .note{margin-top:10mm;padding:5mm 6mm;background:var(--soft);border-left:1.6mm solid var(--red);border-radius:2mm;font-size:10pt}

/* content */
h2{color:var(--red);font-size:15pt;font-weight:700;margin:9mm 0 3mm;padding-bottom:1.5mm;border-bottom:1.2pt solid #f0c4cb;break-after:avoid}
h3{font-size:11.5pt;font-weight:700;color:var(--red-dark);margin:5mm 0 2mm;break-after:avoid}
p{margin:2mm 0}
ul,ol{padding-left:6mm;margin:2mm 0}
li{margin:1.2mm 0}
li.cb{list-style:none;position:relative;margin-left:-6mm;padding-left:8mm;break-inside:avoid}
li.cb::before{content:'';position:absolute;left:0;top:1.1mm;width:4mm;height:4mm;border:1.1pt solid var(--red);border-radius:1mm;background:#fff}
table{border-collapse:collapse;width:100%%;margin:3mm 0;font-size:9.5pt}
tr{break-inside:avoid}
th,td{border:.6pt solid #dcc;padding:2mm 2.6mm;text-align:left;vertical-align:top}
th{background:var(--red);color:#fff;font-weight:700;border-color:var(--red)}
tbody tr:nth-child(even) td{background:#fdf5f6}
code{font-family:Consolas,'Courier New',monospace;font-size:9pt;background:#f4eeee;padding:.3mm 1.3mm;border-radius:1mm}
pre{background:#2a2a2a;color:#f6f6f6;padding:3.5mm 4mm;border-radius:2mm;white-space:pre-wrap;overflow-wrap:break-word;break-inside:avoid;font-size:8.8pt}
pre code{background:none;color:inherit;padding:0}
"""


def build_html(body: str, toc, version: str, today: str) -> str:
    css = CSS % {
        "f_light": uri(ASSETS / "fonts" / "ColgateReady-Light.otf"),
        "f_bold": uri(ASSETS / "fonts" / "ColgateReady-Bold.otf"),
        "f_boldit": uri(ASSETS / "fonts" / "ColgateReady-BoldItalic.otf"),
        "bg_photo": uri(ASSETS / "bg-photo.webp"),
        "logo_red": uri(ROOT / "tools" / "docs-pdf" / "logo-red.svg"),
    }
    toc_items = "".join(f'<li><a href="#{i}">{t}</a></li>' for i, t in toc)
    return f"""<!doctype html><html lang="id"><head><meta charset="utf-8">
<title>Panduan Instalasi Booth - 95% Vitamin C Blast</title><style>{css}</style></head><body>
<section class="cover">
  <div class="shade"></div>
  <img class="logo" src="{uri(ASSETS / 'logo-colgate.webp')}" alt="Colgate">
  <div class="lockup">
    <div class="l1">OPTIC WHITE<svg viewBox="-15 -15 30 30"><path d="M0-15Q1.8-1.8 15 0Q1.8 1.8 0 15Q-1.8 1.8-15 0Q-1.8-1.8 0-15Z"/></svg></div>
    <div class="l2">VITAMIN<span>C</span></div>
  </div>
  <div class="rule"></div>
  <h1>95% Vitamin C Blast<small>Panduan instalasi dan operasional booth touchscreen</small></h1>
  <svg class="ring" viewBox="0 0 820 820">
    <defs>
      <linearGradient id="rim" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#ffe9a6"/><stop offset=".5" stop-color="#fff7dd"/><stop offset="1" stop-color="#ffb52e"/>
      </linearGradient>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>
    </defs>
    <path d="M685.8 625.5A350 350 0 1 1 685.8 194.5" fill="none" stroke="#ff9628" stroke-width="30" stroke-linecap="round" filter="url(#glow)"/>
    <path d="M685.8 625.5A350 350 0 1 1 685.8 194.5" fill="none" stroke="url(#rim)" stroke-width="18" stroke-linecap="round"/>
    <path d="M685.8 625.5A350 350 0 1 1 685.8 194.5" fill="none" stroke="rgba(255,255,255,.9)" stroke-width="7" stroke-linecap="round"/>
  </svg>
  <img class="cap" style="left:6mm;top:122mm;width:28mm;transform:rotate(-14deg)" src="{uri(ASSETS / 'capsule.webp')}" alt="">
  <img class="cap" style="right:20mm;top:112mm;width:22mm;transform:rotate(18deg)" src="{uri(ASSETS / 'capsule.webp')}" alt="">
  <img class="cap" style="right:30mm;top:178mm;width:34mm;transform:rotate(-8deg)" src="{uri(ASSETS / 'capsule.webp')}" alt="">
  <img class="cap" style="left:30mm;top:196mm;width:18mm;transform:rotate(25deg)" src="{uri(ASSETS / 'capsule.webp')}" alt="">
  <svg class="baru" viewBox="0 0 164 80">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fa9322"/><stop offset="1" stop-color="#f07f10"/></linearGradient></defs>
    <path d="M0 14H124Q148 12 162 3C154 32 142 70 78 70H0Z" fill="url(#bg)"/>
    <text x="36" y="53.9" font-size="34" fill="#fff">BARU</text>
  </svg>
  <img class="pack" src="{uri(ASSETS / 'packshot.webp')}" alt="">
  <div class="meta">
    <div><b>Disusun oleh</b>Ontable Studio</div>
    <div><b>Instalasi</b>24 - 25 Oktober 2026</div>
    <div><b>Event</b>28 Oktober - 1 November 2026</div>
    <div><b>Versi</b>{version} &middot; {today}</div>
  </div>
</section>
<section class="toc">
  <h1>Daftar isi</h1>
  <ol>{toc_items}</ol>
  <div class="note"><b>Cara memakai:</b> ikuti bagian 1 sampai 3 berurutan saat instalasi, centang tiap kotak.
  Bagian 4 sampai 7 dipakai harian selama event, bagian 8 setelah event selesai.</div>
</section>
<main>{body}</main></body></html>"""


def main():
    version = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
    d = date.today()
    today = f"{d.day} {BULAN[d.month - 1]} {d.year}"
    body, toc = render_body(SRC.read_text(encoding="utf-8"))
    html = build_html(body, toc, version, today)
    with tempfile.TemporaryDirectory() as tmp:
        page = Path(tmp) / "install.html"
        page.write_text(html, encoding="utf-8")
        subprocess.run(
            [find_chrome(), "--headless", "--disable-gpu", "--no-pdf-header-footer",
             "--allow-file-access-from-files", f"--user-data-dir={tmp}/profile",
             f"--print-to-pdf={OUT}", uri(page)],
            check=True, capture_output=True,
        )
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
