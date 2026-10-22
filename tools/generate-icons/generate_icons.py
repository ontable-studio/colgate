"""Favicon and PWA icons (Colgate wordmark on red) and the social share image, built from the game's own assets.

    python tools/generate-icons/generate_icons.py
"""

import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ASSETS = os.path.join(ROOT, "src", "assets")
ICONS = os.path.join(ROOT, "public", "icons")
RED_LIGHT, RED_DARK = (245, 32, 42), (190, 14, 28)


def asset(name: str) -> Image.Image:
    return Image.open(os.path.join(ASSETS, name)).convert("RGBA")


def gradient(size: tuple[int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    cx, cy = w / 2, h * 0.28
    reach = math.hypot(w, h) * 0.8
    for y in range(h):
        for x in range(w):
            t = min(1.0, math.hypot(x - cx, y - cy) / reach)
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(RED_LIGHT, RED_DARK))
    return img.convert("RGBA")


def glow(size: int, color=(255, 200, 80)) -> Image.Image:
    g = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(g).ellipse((size * 0.3, size * 0.3, size * 0.7, size * 0.7), fill=color + (210,))
    return g.filter(ImageFilter.GaussianBlur(size * 0.12))


def icon(size: int, scale: float, rounded: bool) -> Image.Image:
    """Red tile with the white Colgate logo (wordmark + smile). `scale` is the logo width relative to the tile."""
    base = gradient((size, size))
    logo = asset("logo-colgate.webp")
    w = round(size * scale)
    h = round(w * logo.height / logo.width)
    base.alpha_composite(logo.resize((w, h), Image.LANCZOS), ((size - w) // 2, (size - h) // 2))
    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=round(size * 0.22), fill=255)
        base.putalpha(mask)
    return base


def share_image() -> Image.Image:
    w, h = 1200, 630
    img = gradient((w, h))
    # Light rays from the top, like the booth backdrop.
    rays = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(rays)
    for i in range(-9, 10):
        a0, a1 = math.radians(90 + i * 7 - 2.2), math.radians(90 + i * 7 + 2.2)
        d.polygon([(w * 0.3, -40), (w * 0.3 + math.cos(a0) * 1500, -40 + math.sin(a0) * 1500),
                   (w * 0.3 + math.cos(a1) * 1500, -40 + math.sin(a1) * 1500)], fill=(255, 255, 255, 16))
    img.alpha_composite(rays)

    logo = asset("logo-colgate.webp")
    lw = 230
    lh = round(lw * logo.height / logo.width)
    img.alpha_composite(logo.resize((lw, lh), Image.LANCZOS), (70, 50))

    bold = os.path.join(ASSETS, "fonts", "ColgateReady-Bold.otf")
    light = os.path.join(ASSETS, "fonts", "ColgateReady-Light.otf")
    d = ImageDraw.Draw(img)
    d.text((70, 175), "95%", font=ImageFont.truetype(bold, 190), fill=(255, 201, 60))
    d.text((74, 395), "VITAMIN C BLAST", font=ImageFont.truetype(bold, 74), fill="white")
    d.text((76, 490), "OPTIC WHITE+ VITAMIN C", font=ImageFont.truetype(light, 38), fill="white")
    d.text((76, 545), "Shoot the molecules. Fill the brush to 95%.", font=ImageFont.truetype(light, 30), fill=(255, 233, 166))

    img.alpha_composite(glow(900), (490, -135))
    # The tube standing on its podium (from the packshot), low enough that the podium bleeds off the
    # bottom of the image. The sides fade out so the crop leaves no hard vertical edge.
    pack = asset("packshot.webp").crop((300, 0, 1220, 1416))
    scale = 0.42
    pack = pack.resize((round(pack.width * scale), round(pack.height * scale)), Image.LANCZOS)
    fade = Image.new("L", pack.size, 255)
    fpx = fade.load()
    ramp = round(pack.width * 0.22)
    for x in range(pack.width):
        v = min(1.0, x / ramp, (pack.width - 1 - x) / ramp)
        for y in range(pack.height):
            fpx[x, y] = round(255 * v)
    pack.putalpha(Image.fromarray(np.minimum(np.asarray(pack.getchannel("A")), np.asarray(fade))))
    # Tilted like the old share image; set low enough that the slanted bottom edge stays off-screen.
    pack = pack.rotate(8, expand=True, resample=Image.BICUBIC)
    img.alpha_composite(pack, (790, h - pack.height + 70))
    cap = asset("capsule.webp")
    for (x, y, s) in [(650, 90, 150), (750, 330, 110), (1085, 60, 90)]:
        img.alpha_composite(cap.resize((s, s), Image.LANCZOS), (x, y))
    return img.convert("RGB")


def main() -> None:
    os.makedirs(ICONS, exist_ok=True)
    icon(512, 0.68, True).save(os.path.join(ICONS, "icon-512.png"))
    icon(192, 0.68, True).save(os.path.join(ICONS, "icon-192.png"))
    # Maskable: full-bleed background, artwork inside the 80% safe zone.
    icon(512, 0.5, False).save(os.path.join(ICONS, "icon-maskable-512.png"))
    icon(180, 0.68, False).convert("RGB").save(os.path.join(ICONS, "apple-touch-icon.png"))
    icon(64, 0.74, True).resize((32, 32), Image.LANCZOS).save(os.path.join(ICONS, "favicon-32.png"))
    icon(256, 0.74, True).save(os.path.join(ROOT, "public", "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    share_image().save(os.path.join(ICONS, "og-image.png"), optimize=True)
    print("done")


if __name__ == "__main__":
    main()
