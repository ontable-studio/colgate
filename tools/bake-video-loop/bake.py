"""Bake a seamless loop: the last X frames of the clip are cross-faded INTO its first X frames,
so the video's end flows straight into its start when it repeats. Needs OpenCV + imageio-ffmpeg."""
import cv2, numpy as np, sys, os, subprocess, imageio_ffmpeg
src, dst, X = sys.argv[1], sys.argv[2], int(sys.argv[3])
width = int(sys.argv[4]) if len(sys.argv) > 4 else 0   # optional: scale down to this width (lighter to decode)
c = cv2.VideoCapture(src)
fps = c.get(cv2.CAP_PROP_FPS)
frames = []
while True:
    ok, f = c.read()
    if not ok: break
    frames.append(f)
if width:
    frames = [cv2.resize(f, (width, round(f.shape[0] * width / f.shape[1]) // 2 * 2), interpolation=cv2.INTER_AREA) for f in frames]
N = len(frames); L = N - X
h, w = frames[0].shape[:2]
p = subprocess.Popen([imageio_ffmpeg.get_ffmpeg_exe(), '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'bgr24',
                      '-s', f'{w}x{h}', '-r', str(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
                      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', dst], stdin=subprocess.PIPE)
for t in range(L):
    if t < X:
        a = (t + 0.5) / X
        a = a * a * (3 - 2 * a)
        f = cv2.addWeighted(frames[L + t], 1 - a, frames[t], a, 0)
    else:
        f = frames[t]
    p.stdin.write(f.tobytes())
p.stdin.close(); p.wait()
print(dst, L, 'frames', round(os.path.getsize(dst) / 1e6, 2), 'MB')
