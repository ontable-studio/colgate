# bake-video-loop

Makes a video loop without a visible jump: the last N frames are cross-faded into the first N,
so when the clip repeats the end flows into the start.

```bash
pip install opencv-python imageio-ffmpeg
python tools/bake-video-loop/bake.py "<source>.mp4" public/assets/video/<name>.mp4 48 720
```

`48` = frames blended (2 s at 24 fps); `720` = output width (optional, lighter to decode on a weak TV); the result is that many frames shorter than the source.
The clips in `public/assets/video` were made from the files in `.resources/Ready to use`.
