"""Favicon, PWA icons and the social share image, built from the game's own assets.

    python tools/generate-icons/generate_icons.py
"""

import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ASSETS = os.path.join(ROOT, "public", "assets")
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
    """Red tile with the Vitamin C capsule. `scale` is the capsule size relative to the tile."""
    base = gradient((size, size))
    cap = asset("capsule.webp")
    side = round(size * scale)
    base.alpha_composite(glow(round(side * 1.5)), (size // 2 - round(side * 0.75), size // 2 - round(side * 0.75)))
    base.alpha_composite(cap.resize((side, side), Image.LANCZOS), ((size - side) // 2, (size - side) // 2))
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
    lw = 300
    img.alpha_composite(logo.resize((lw, round(lw * logo.height / logo.width)), Image.LANCZOS), (70, 62))

    bold = os.path.join(ASSETS, "fonts", "ColgateReady-Bold.otf")
    light = os.path.join(ASSETS, "fonts", "ColgateReady-Light.otf")
    d = ImageDraw.Draw(img)
    d.text((70, 210), "CATCH THE", font=ImageFont.truetype(bold, 92), fill="white")
    d.text((70, 305), "BRIGHTNESS", font=ImageFont.truetype(bold, 112), fill=(255, 201, 60))
    d.text((74, 450), "OPTIC WHITE+ VITAMIN C", font=ImageFont.truetype(light, 40), fill="white")
    d.text((74, 510), "Catch the capsules. Unlock your brightest smile.", font=ImageFont.truetype(light, 30), fill=(255, 233, 166))

    img.alpha_composite(glow(900), (490, -135))
    tube = asset("tube.webp")
    th = 560
    tube = tube.resize((round(tube.width * th / tube.height), th), Image.LANCZOS).rotate(8, expand=True, resample=Image.BICUBIC)
    img.alpha_composite(tube, (800, 40))
    cap = asset("capsule.webp")
    for (x, y, s) in [(650, 90, 150), (1030, 400, 130), (1085, 60, 90)]:
        img.alpha_composite(cap.resize((s, s), Image.LANCZOS), (x, y))
    return img.convert("RGB")


def main() -> None:
    os.makedirs(ICONS, exist_ok=True)
    icon(512, 0.66, True).save(os.path.join(ICONS, "icon-512.png"))
    icon(192, 0.66, True).save(os.path.join(ICONS, "icon-192.png"))
    # Maskable: full-bleed background, artwork inside the 80% safe zone.
    icon(512, 0.5, False).save(os.path.join(ICONS, "icon-maskable-512.png"))
    icon(180, 0.66, False).convert("RGB").save(os.path.join(ICONS, "apple-touch-icon.png"))
    icon(64, 0.8, True).resize((32, 32), Image.LANCZOS).save(os.path.join(ICONS, "favicon-32.png"))
    icon(256, 0.8, True).save(os.path.join(ROOT, "public", "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])
    share_image().save(os.path.join(ICONS, "og-image.png"), optimize=True)
    print("done")


if __name__ == "__main__":
    main()
