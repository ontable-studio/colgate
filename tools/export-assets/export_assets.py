"""Convert raw client assets (CMYK TIF/PSD/PNG, huge) into small game-ready WebP files.

Usage (from the repo root):
    pip install -r tools/export-assets/requirements.txt
    python tools/export-assets/export_assets.py [--src .resources] [--out public/assets]

Source files are looked up by name anywhere under --src (the Drive export has many duplicates).
Re-run whenever Oji sends a new version of a source file.
"""

from __future__ import annotations

import argparse
import colorsys
import glob
import os
import sys

import numpy as np
import tifffile
from PIL import Image, ImageDraw, ImageFilter

Image.MAX_IMAGE_PIXELS = None


def find(src: str, name: str) -> str:
    hits = glob.glob(os.path.join(src, "**", name), recursive=True)
    if not hits:
        sys.exit(f"Source file not found under {src}: {name}")
    return hits[0]


def read_cmyk_alpha(path: str, max_side: int = 2400) -> Image.Image:
    """CMYK + alpha TIFF -> RGBA, strided down first so huge files fit in memory."""
    a = tifffile.imread(path, maxworkers=1)
    step = max(1, max(a.shape[:2]) // max_side)
    a = np.ascontiguousarray(a[::step, ::step])
    rgb = Image.fromarray(np.ascontiguousarray(a[..., :4]), "CMYK").convert("RGB")
    rgb.putalpha(Image.fromarray(np.ascontiguousarray(a[..., 4]), "L"))
    return rgb


def trim(im: Image.Image, pad: int = 0) -> Image.Image:
    box = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if not box:
        return im
    l, t, r, b = box
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def fit(im: Image.Image, width: int | None = None, height: int | None = None) -> Image.Image:
    if width is not None:
        height = round(im.height * width / im.width)
    elif height is not None:
        width = round(im.width * height / im.height)
    assert width and height
    return im.resize((width, height), Image.LANCZOS)


def remove_white_bg(im: Image.Image, thresh: int = 14) -> Image.Image:
    """Flood-fill the near-white background from the corners and make it transparent."""
    rgb = im.convert("RGB")
    marker = (255, 0, 255)
    for xy in ((0, 0), (rgb.width - 1, 0), (0, rgb.height - 1), (rgb.width - 1, rgb.height - 1)):
        if rgb.getpixel(xy) != marker:
            ImageDraw.floodfill(rgb, xy, marker, thresh=thresh)
    mask = np.all(np.asarray(rgb) == marker, axis=-1)
    alpha = Image.fromarray(np.where(mask, 0, 255).astype("uint8"), "L").filter(ImageFilter.GaussianBlur(1.2))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out


def recolor(im: Image.Image, hue_deg: float, sat_mul: float, val_mul: float = 1.0) -> Image.Image:
    """Shift hue/saturation (used to derive the decoy capsule from the real one)."""
    rgba = im.convert("RGBA")
    h, w = rgba.height, rgba.width
    flat = np.asarray(rgba).reshape(-1, 4)
    out = flat.copy()
    # Per-pixel colorsys is slow, so cache by colour quantised to steps of 4 (use on small images).
    cache: dict[tuple[int, int, int], tuple[int, int, int]] = {}
    for i in range(flat.shape[0]):
        key = (int(flat[i, 0]) // 4, int(flat[i, 1]) // 4, int(flat[i, 2]) // 4)
        rgb = cache.get(key)
        if rgb is None:
            _, ss, vv = colorsys.rgb_to_hsv(key[0] * 4 / 255, key[1] * 4 / 255, key[2] * 4 / 255)
            r, g, b = colorsys.hsv_to_rgb(
                hue_deg / 360.0, min(1.0, ss * sat_mul), min(1.0, vv * val_mul)
            )
            rgb = (round(r * 255), round(g * 255), round(b * 255))
            cache[key] = rgb
        out[i, :3] = rgb
    return Image.fromarray(out.reshape(h, w, 4), "RGBA")


def save(im: Image.Image, out_dir: str, name: str) -> None:
    path = os.path.join(out_dir, f"{name}.webp")
    im.save(path, "WEBP", quality=88, method=6)
    print(f"{name}.webp  {im.width}x{im.height}  {os.path.getsize(path) / 1024:.0f} KB")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=".resources")
    ap.add_argument("--out", default="public/assets")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    # Vitamin C capsule (transparent orange orb with molecule) + derived decoy.
    capsule = fit(trim(read_cmyk_alpha(find(args.src, "VitC_Ball_Main_FLAT.tif"))), width=280)
    save(capsule, args.out, "capsule")
    # TODO(art): confirm decoy look with Oji. For now: capsule shifted to pink/crimson.
    small = recolor(fit(capsule, width=140), hue_deg=345, sat_mul=0.75)
    save(small.resize(capsule.size, Image.LANCZOS), args.out, "decoy")

    # Product tube (already RGBA PNG).
    tube = Image.open(find(args.src, "CP11548-OW-Vit-C---Color-Conversion-80g-tube-Front-2.png"))
    save(fit(trim(tube.convert("RGBA")), height=1200), args.out, "tube")

    # Dropper + glow flare for the attract screen.
    save(fit(trim(read_cmyk_alpha(find(args.src, "VitC_Dropper_Main_FLAT.tif"))), height=900), args.out, "dropper")
    save(fit(trim(read_cmyk_alpha(find(args.src, "flare CMYK.tif"))), width=640), args.out, "flare")

    # Teeth: stage 1 (stained) and stage 4 (clean) for the Day 1 -> Day 7 reveal.
    for stage in (1, 4):
        tooth = remove_white_bg(Image.open(find(args.src, f"Tooth {stage}.tif")))
        save(fit(trim(tooth), height=900), args.out, f"tooth{stage}")


if __name__ == "__main__":
    main()
