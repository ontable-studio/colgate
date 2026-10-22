"""Convert raw client assets (CMYK TIF/PSD/PNG, huge) into small game-ready WebP files.

Usage (from the repo root):
    pip install -r tools/export-assets/requirements.txt
    python tools/export-assets/export_assets.py [--src .resources] [--out src/assets]

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
    hits = glob.glob(os.path.join(glob.escape(src), "**", name), recursive=True)
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


def export_packshot(path: str, out_dir: str) -> None:
    """Tube on the podium -> 'packshot.webp' (1520 px wide, centred on the tube) + its geometry."""
    full = trim(read_cmyk_alpha(path, 3000))
    alpha = np.asarray(full.getchannel("A"))
    # Tube = the opaque columns of the topmost rows; its centre is where the crop is centred.
    top_rows = np.where(alpha[: full.height // 4] > 128)[1]
    cx = (int(top_rows.min()) + int(top_rows.max())) // 2
    half = 760
    left = max(0, min(full.width - 2 * half, cx - half))
    crop = full.crop((left, 0, left + 2 * half, full.height))
    # Extra rows under the podium (its last row repeated), so the scene can lift the packshot
    # without a gap showing under it.
    extra = 200
    padded = Image.new("RGBA", (crop.width, crop.height + extra))
    padded.paste(crop, (0, 0))
    padded.paste(crop.crop((0, crop.height - 1, crop.width, crop.height)).resize((crop.width, extra)), (0, crop.height))
    save(padded, out_dir, "packshot")
    tube_w = int(top_rows.max()) - int(top_rows.min())
    print(f"packshot crop {crop.size}, tube centre x={cx - left}, tube width ~{tube_w}px")


def export_brush(outline_path: str, fill_path: str, out_dir: str) -> None:
    """Toothbrush PNGs (RGBA, same canvas) -> three WebPs of the same shape and size.

    'brush-fill' is the filled toothbrush with its faint halo cleaned off. 'brush-empty' is the
    outline artwork laid over a translucent white copy of that silhouette, so the glass handle
    reads as a pale empty brush on the red background. 'brush-outline' is the white border drawn
    over both.
    """
    fill = Image.open(fill_path).convert("RGBA")
    outline = Image.open(outline_path).convert("RGBA")
    a = np.asarray(fill.getchannel("A"))
    shape = Image.fromarray(np.where(a > 128, 255, 0).astype("uint8"), "L")
    # Close the pinholes left by thresholding, so the silhouette is solid.
    shape = shape.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    box = shape.getbbox()
    assert box
    clean = fill.copy()
    clean.putalpha(Image.fromarray(np.where(a > 24, a, 0).astype("uint8"), "L"))
    empty = Image.new("RGBA", fill.size, (255, 255, 255, 0))
    empty.putalpha(shape.point(lambda v: 90 if v else 0))
    empty.alpha_composite(outline)
    # Top layer: only the pale border of the outline artwork (not the tan bristles), made white,
    # so it stays visible over the gold fill.
    o = np.asarray(outline).astype("int")
    border = (o[..., 3] > 90) & (o[..., 2] > 180)
    edge = np.zeros(o.shape, dtype="uint8")
    edge[..., :3] = 255
    edge[..., 3] = np.where(border, o[..., 3], 0)
    top = Image.fromarray(edge, "RGBA")
    for name, im in (("brush-empty", empty), ("brush-fill", clean), ("brush-outline", top)):
        save(fit(im.crop(box), height=1000), out_dir, name)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=".resources")
    ap.add_argument("--out", default="src/assets")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    # Vitamin C capsule (transparent orange orb with molecule).
    save(fit(trim(read_cmyk_alpha(find(args.src, "VitC_Ball_Main_FLAT.tif"))), width=280), args.out, "capsule")

    # Product packshot: tube standing on the glossy podium (CMYK TIF with alpha). Cropped to a
    # 1520 px wide band around the tube so it fills the 1080 px wide screen.
    export_packshot(find(args.src, "tube podium_CMYK.tif"), args.out)
    # Toothbrush meter (outline + filled, both on white) and the timer clock.
    export_brush(find(args.src, "outline sikat gigi.png"), find(args.src, "isi sikat gigi.png"), args.out)
    save(fit(trim(Image.open(find(args.src, "Golden Twin-Bell Alarm Clock.png")).convert("RGBA"), 4), height=320), args.out, "ico-clock")
    # Still of the new background (to be baked into a video later).
    bg = Image.open(find(args.src, "image.png_2K_*.jpeg")).convert("RGB")
    save(bg.resize((1080, round(bg.height * 1080 / bg.width)), Image.LANCZOS), args.out, "bg-photo")
    # logo-colgate.webp / logo-wordmark.webp are NOT generated here any more: they come from the
    # Colgate logo with the smile (Wikimedia Commons "Colgate.svg"), rendered white on transparent.
    # Replace them with the official logo from the client when available.

    # Dropper + glow flare for the attract screen.
    save(fit(trim(read_cmyk_alpha(find(args.src, "VitC_Dropper_Main_FLAT.tif"))), height=900), args.out, "dropper")
    save(fit(trim(read_cmyk_alpha(find(args.src, "flare CMYK.tif"))), width=640), args.out, "flare")

    # Teeth: stage 1 (stained) to stage 4 (clean) for the Day 1 -> Day 7 row.
    for stage in (1, 2, 3, 4):
        tooth = remove_white_bg(Image.open(find(args.src, f"Tooth {stage}.tif")))
        save(fit(trim(tooth), height=900), args.out, f"tooth{stage}")


if __name__ == "__main__":
    main()
