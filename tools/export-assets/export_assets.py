"""Convert raw client assets (CMYK TIF/PSD/PNG, huge) into small game-ready WebP files.

Usage (from the repo root):
    pip install -r tools/export-assets/requirements.txt
    python tools/export-assets/export_assets.py [--src .resources] [--out public/assets]

Source files are looked up by name anywhere under --src (the Drive export has many duplicates).
Re-run whenever Oji sends a new version of a source file.
"""

from __future__ import annotations

import argparse
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


def white_wordmark(tube: Image.Image) -> Image.Image:
    """White Colgate wordmark cut out of the tube artwork (white text on red -> alpha from G/B)."""
    left, top, right, bottom = 320, 410, 1135, 610  # wordmark + (R) on the 1500x3000 tube PNG
    crop = np.asarray(tube.crop((left, top, right, bottom)).convert("RGB")).astype("float32")
    alpha = np.clip((crop[..., 1:].min(axis=-1) - 95.0) / (245.0 - 95.0), 0.0, 1.0)
    # Blank the small "Fluoride Toothpaste" line that sits under the wordmark.
    alpha[570 - top :, 745 - left :] = 0.0
    out = np.dstack([np.full(alpha.shape, 255, dtype="uint8")] * 3 + [(alpha * 255).astype("uint8")])
    return trim(Image.fromarray(out, "RGBA"))


def save_lossless(im: Image.Image, out_dir: str, name: str) -> None:
    path = os.path.join(out_dir, f"{name}.webp")
    im.save(path, "WEBP", lossless=True, method=6)
    print(f"{name}.webp  {im.width}x{im.height}  {os.path.getsize(path) / 1024:.0f} KB (lossless)")


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

    # Vitamin C capsule (transparent orange orb with molecule).
    save(fit(trim(read_cmyk_alpha(find(args.src, "VitC_Ball_Main_FLAT.tif"))), width=280), args.out, "capsule")

    # Product tube (already RGBA PNG).
    tube = Image.open(find(args.src, "CP11548-OW-Vit-C---Color-Conversion-80g-tube-Front-2.png")).convert("RGBA")
    save(fit(trim(tube), height=1200), args.out, "tube")
    save_lossless(white_wordmark(tube), args.out, "logo-colgate")

    # Dropper + glow flare for the attract screen.
    save(fit(trim(read_cmyk_alpha(find(args.src, "VitC_Dropper_Main_FLAT.tif"))), height=900), args.out, "dropper")
    save(fit(trim(read_cmyk_alpha(find(args.src, "flare CMYK.tif"))), width=640), args.out, "flare")

    # Teeth: stage 1 (stained) and stage 4 (clean) for the Day 1 -> Day 7 reveal.
    for stage in (1, 4):
        tooth = remove_white_bg(Image.open(find(args.src, f"Tooth {stage}.tif")))
        save(fit(trim(tooth), height=900), args.out, f"tooth{stage}")


if __name__ == "__main__":
    main()
