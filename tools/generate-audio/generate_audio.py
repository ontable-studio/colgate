"""Procedural sound design for "95% Vitamin C Blast" (no samples, everything is synthesised).

Usage (from the repo root):
    pip install -r tools/generate-audio/requirements.txt
    python tools/generate-audio/generate_audio.py [--out public/assets/audio] [--report]

Sound direction
    Bright, clean and fresh like the product: glassy bells and plucks (the "sparkle" of Vitamin C),
    warm pads, a soft four-on-the-floor pulse. Rewards are high, short and rising; penalties are
    low and dull but never harsh, so a booth next to other noise stays pleasant.

Everything is rendered at 44.1 kHz and written as OGG (gapless loops) plus MP3 (fallback for TV
browsers that cannot play Vorbis). The random seed is fixed, so re-running gives identical files.
"""

from __future__ import annotations

import argparse
import os

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44_100
RNG = np.random.default_rng(2026)


# --------------------------------------------------------------------------- helpers


def n_of(seconds: float) -> int:
    return int(round(seconds * SR))


def tt(seconds: float) -> np.ndarray:
    return np.arange(n_of(seconds)) / SR


def mtof(midi: float) -> float:
    return float(440.0 * 2 ** ((midi - 69) / 12))


def lowpass(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, fc, "low", fs=SR, output="sos"), x, axis=-1)


def highpass(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x, axis=-1)


def bandpass(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=-1)


def adsr(n: int, a: float, d: float, s: float, r: float) -> np.ndarray:
    env = np.zeros(n)
    na = min(int(a * SR), n)
    nd = min(int(d * SR), max(n - na, 0))
    if na:
        env[:na] = np.linspace(0, 1, na, endpoint=False)
    if nd:
        env[na : na + nd] = np.linspace(1, s, nd, endpoint=False)
    env[na + nd :] = s
    nr = min(int(r * SR), n)
    if nr:
        env[n - nr :] *= np.linspace(1, 0, nr)
    return env


def declick(x: np.ndarray, fade_in: float = 0.002, fade_out: float = 0.012) -> np.ndarray:
    x = x.copy()
    ni, no = min(n_of(fade_in), len(x)), min(n_of(fade_out), len(x))
    if ni:
        x[:ni] *= np.linspace(0, 1, ni)
    if no:
        x[-no:] *= np.linspace(1, 0, no)
    return x


def peak_normalise(x: np.ndarray, peak: float = 0.8) -> np.ndarray:
    top = float(np.max(np.abs(x)))
    return x * (peak / top) if top > 0 else x


# --------------------------------------------------------------------------- voices


def bell(freq: float, dur: float, tau: float = 0.5) -> np.ndarray:
    """Glockenspiel / glass bell: inharmonic partials that decay at different speeds."""
    t = tt(dur)
    out = np.zeros_like(t)
    for ratio, amp, decay in ((1.0, 1.0, 1.0), (2.0, 0.45, 0.7), (2.76, 0.32, 0.5), (4.07, 0.16, 0.35), (5.4, 0.1, 0.25)):
        if freq * ratio > SR / 2 - 2000:
            continue
        out += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t / (tau * decay))
    return out * np.minimum(1.0, t / 0.002)


def pluck(freq: float, dur: float, tone: float = 1.0) -> np.ndarray:
    """Bright plucked string: harmonic series where the upper harmonics die first."""
    t = tt(dur)
    out = np.zeros_like(t)
    for k in range(1, min(int((SR / 2 - 1000) / freq), 18) + 1):
        out += np.sin(2 * np.pi * k * freq * t) / k * np.exp(-t * (7 + k * 4 * tone))
    return out * np.minimum(1.0, t / 0.002)


def saw(freq: float, t: np.ndarray) -> np.ndarray:
    out = np.zeros_like(t)
    for k in range(1, min(int((SR / 2 - 1000) / freq), 24) + 1):
        out += np.sin(2 * np.pi * k * freq * t) / k
    return out * (2 / np.pi)


def pad_note(freq: float, dur: float) -> np.ndarray:
    """Three slightly detuned saws, low-passed, slow attack and release: a warm bed."""
    t = tt(dur)
    voice = sum(saw(freq * 2 ** (cents / 1200), t) for cents in (-9, 0, 9)) / 3
    return lowpass(voice, 1900) * adsr(len(t), 0.4, 0.3, 0.8, 0.6)


def bass_note(freq: float, dur: float) -> np.ndarray:
    t = tt(dur)
    body = np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(4 * np.pi * freq * t) + 0.25 * lowpass(saw(freq, t), 600)
    return body * adsr(len(t), 0.006, 0.12, 0.6, 0.05)


def kick(dur: float = 0.35) -> np.ndarray:
    t = tt(dur)
    phase = 2 * np.pi * np.cumsum(42 + 120 * np.exp(-t * 32)) / SR
    body = np.sin(phase) * np.exp(-t / 0.16)
    click = np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.004) * 0.3
    return np.tanh(1.4 * (body + click))


def hat(open_: bool = False) -> np.ndarray:
    tau = 0.11 if open_ else 0.022
    t = tt(tau * 6)
    return highpass(RNG.standard_normal(len(t)), 7000) * np.exp(-t / tau)


def snap() -> np.ndarray:
    """Soft clap: three tiny bursts then a short tail."""
    t = tt(0.16)
    noise = bandpass(RNG.standard_normal(len(t)), 900, 3600)
    env = np.zeros_like(t)
    for start in (0.0, 0.011, 0.023):
        i = int(start * SR)
        env[i:] += np.exp(-np.arange(len(t) - i) / SR / 0.004) * 0.6
    env += np.exp(-t / 0.045) * 0.5
    return noise * env


def noise_sweep(dur: float, f0: float, f1: float, bandwidth: float = 500) -> np.ndarray:
    """Band-limited noise whose centre frequency glides from f0 to f1 (whooshes and risers)."""
    n = n_of(dur)
    t = np.arange(n) / SR
    freq = f0 * (f1 / f0) ** (t / dur)
    base = lowpass(RNG.standard_normal(n), bandwidth, 4)
    base /= np.std(base)
    return base * np.sin(2 * np.pi * np.cumsum(freq) / SR)


# --------------------------------------------------------------------------- space and mixing


def _impulse_response(length: float, seed: int, lp_hz: float = 5500) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = n_of(length * 1.2)
    t = np.arange(n) / SR
    ir = lowpass(rng.standard_normal(n) * np.exp(-t * 6.9 / length), lp_hz)
    ramp = int(0.012 * SR)
    ir[:ramp] *= np.linspace(0, 1, ramp)
    return ir / np.sqrt(np.sum(ir**2))


def reverb(x: np.ndarray, length: float = 1.6, wet: float = 0.25) -> np.ndarray:
    """Convolution reverb. Mono or stereo in, stereo out, same duration as the input."""
    stereo = x if x.ndim == 2 else np.vstack([x, x])
    n = stereo.shape[1]
    left = fftconvolve(stereo[0], _impulse_response(length, 11))[:n]
    right = fftconvolve(stereo[1], _impulse_response(length, 23))[:n]
    return stereo * (1 - wet * 0.5) + np.vstack([left, right]) * wet


def echo(stereo: np.ndarray, delay: float, feedback: float = 0.45, taps: int = 4, mix: float = 0.4) -> np.ndarray:
    """Ping-pong delay: every repeat jumps to the other channel."""
    out = stereo.copy()
    shift = n_of(delay)
    for k in range(1, taps + 1):
        gain = mix * feedback ** (k - 1)
        src = stereo[::-1] if k % 2 else stereo
        end = stereo.shape[1]
        out[:, k * shift :] += src[:, : end - k * shift] * gain
    return out


def pan_gains(pan: float) -> tuple[float, float]:
    angle = (pan + 1) * np.pi / 4
    return float(np.cos(angle)), float(np.sin(angle))


def put(buf: np.ndarray, sig: np.ndarray, start: float, gain: float = 1.0, pan: float = 0.0) -> None:
    """Add a mono signal into a stereo buffer at `start` seconds."""
    i = n_of(start)
    end = min(buf.shape[1], i + len(sig))
    if end <= i:
        return
    left, right = pan_gains(pan)
    seg = sig[: end - i] * gain
    buf[0, i:end] += seg * left
    buf[1, i:end] += seg * right


def fold_tail(x: np.ndarray, loop_samples: int) -> np.ndarray:
    """Wrap everything after the loop point back onto the start so the loop is seamless."""
    out = x[:, :loop_samples].copy()
    tail = x[:, loop_samples:]
    m = min(tail.shape[1], loop_samples)
    out[:, :m] += tail[:, :m]
    return out


def master(x: np.ndarray, target_rms_db: float, ceiling: float = 0.89) -> np.ndarray:
    x = highpass(x, 28)
    rms = float(np.sqrt(np.mean(x**2)))
    x = x * (10 ** (target_rms_db / 20) / rms)
    x = np.tanh(x * 1.15) / np.tanh(1.15)  # gentle saturation instead of hard clipping
    top = float(np.max(np.abs(x)))
    return x * min(1.0, ceiling / top)


# --------------------------------------------------------------------------- sound effects


def sfx_ui_tap() -> np.ndarray:
    t = tt(0.12)
    sweep = 600 + 300 * np.minimum(1, t / 0.03)
    tone = np.sin(2 * np.pi * np.cumsum(sweep) / SR) * np.exp(-t / 0.03)
    click = highpass(RNG.standard_normal(len(t)), 3000) * np.exp(-t / 0.003) * 0.15
    return declick(tone + click)


def sfx_pop() -> np.ndarray:
    t = tt(0.14)
    sweep = 380 + 440 * np.minimum(1, t / 0.05)
    return declick(np.sin(2 * np.pi * np.cumsum(sweep) / SR) * np.exp(-t / 0.05) * np.minimum(1, t / 0.003))


def sfx_ui_start() -> np.ndarray:
    buf = np.zeros(n_of(1.3))
    for i, midi in enumerate((84, 88, 91, 96)):
        b = bell(mtof(midi), 0.7, tau=0.22)
        buf[n_of(0.055 * i) : n_of(0.055 * i) + len(b)] += b * (0.55 + 0.12 * i)
    rise = noise_sweep(0.38, 500, 5200) * np.sin(np.linspace(0, np.pi, n_of(0.38))) * 0.22
    buf[: len(rise)] += rise
    return declick(reverb(buf, 1.1, 0.32).mean(axis=0))


def sfx_key() -> np.ndarray:
    t = tt(0.05)
    return declick(np.sin(2 * np.pi * 1500 * t) * np.exp(-t / 0.008) + 0.3 * np.sin(2 * np.pi * 3000 * t) * np.exp(-t / 0.005))


def sfx_key_del() -> np.ndarray:
    t = tt(0.07)
    sweep = 900 - 400 * np.minimum(1, t / 0.05)
    return declick(np.sin(2 * np.pi * np.cumsum(sweep) / SR) * np.exp(-t / 0.02))


def sfx_catch() -> np.ndarray:
    ding = bell(mtof(84), 0.55, tau=0.26)
    t = tt(0.55)
    sparkle = np.sin(2 * np.pi * np.cumsum(2500 + 2500 * np.minimum(1, t / 0.03)) / SR) * np.exp(-t / 0.02) * 0.25
    return declick(reverb(ding + sparkle, 0.55, 0.16).mean(axis=0))


def sfx_stain() -> np.ndarray:
    t = tt(0.45)
    thud = lowpass(RNG.standard_normal(len(t)), 1400) * np.exp(-t / 0.09) * 0.8
    drop = np.sin(2 * np.pi * np.cumsum(50 + 130 * np.exp(-t * 18)) / SR) * np.exp(-t / 0.14)
    return declick(np.tanh(1.6 * (thud + drop)))


def sfx_decoy() -> np.ndarray:
    t = tt(0.3)
    sweep = 260 + 160 * np.exp(-t * 22)
    tri = (2 / np.pi) * np.arcsin(np.sin(2 * np.pi * np.cumsum(sweep) / SR))
    click = highpass(RNG.standard_normal(len(t)), 2500) * np.exp(-t / 0.004) * 0.2
    return declick(tri * np.exp(-t / 0.08) + click)


def sfx_tick() -> np.ndarray:
    t = tt(0.08)
    return declick(np.sin(2 * np.pi * 1250 * t) * np.exp(-t / 0.012) + 0.4 * np.sin(2 * np.pi * 2000 * t) * np.exp(-t / 0.008))


def sfx_timeup() -> np.ndarray:
    buf = np.zeros(n_of(1.4))
    for start, midi in ((0.0, 79), (0.2, 72)):
        b = bell(mtof(midi), 1.0, tau=0.6)
        buf[n_of(start) : n_of(start) + len(b)] += b
    return declick(reverb(buf, 1.3, 0.3).mean(axis=0), fade_out=0.05)


def sfx_count() -> np.ndarray:
    t = tt(0.04)
    return declick(np.sin(2 * np.pi * 2100 * t) * np.exp(-t / 0.007), fade_out=0.006)


def sfx_whoosh() -> np.ndarray:
    n = n_of(0.45)
    shape = np.sin(np.linspace(0, np.pi, n)) ** 2
    return declick(noise_sweep(0.45, 300, 3500, 700) * shape, fade_out=0.05)


def sfx_unlock() -> np.ndarray:
    buf = np.zeros(n_of(3.0))
    rise_len = n_of(0.9)
    rise = noise_sweep(0.9, 500, 9000, 800) * np.linspace(0, 1, rise_len) ** 2 * 0.5
    buf[:rise_len] += rise
    for midi in (72, 76, 79, 83, 86):  # C major 9
        b = bell(mtof(midi), 2.0, tau=0.9)
        buf[rise_len : rise_len + len(b)] += b * 0.5
    boom = np.sin(2 * np.pi * np.cumsum(60 + 40 * np.exp(-tt(0.6) * 12)) / SR) * np.exp(-tt(0.6) / 0.2)
    buf[rise_len : rise_len + len(boom)] += boom * 0.8
    for k in range(14):  # a handful of random twinkles on top
        start = 0.9 + 1.1 * RNG.random()
        midi = int(RNG.choice((96, 98, 100, 103, 105)))
        b = bell(mtof(midi), 0.6, tau=0.18)
        i = n_of(start)
        buf[i : i + len(b)] += b * 0.18
    return declick(reverb(buf, 2.0, 0.35).mean(axis=0), fade_out=0.15)


def sfx_result() -> np.ndarray:
    buf = np.zeros(n_of(2.6))
    for i, midi in enumerate((72, 74, 76, 79, 84, 88)):
        b = bell(mtof(midi), 0.9, tau=0.35)
        buf[n_of(0.08 * i) : n_of(0.08 * i) + len(b)] += b * 0.6
    for midi in (84, 88, 91, 96):
        b = bell(mtof(midi), 2.0, tau=1.1)
        buf[n_of(0.52) : n_of(0.52) + len(b)] += b * 0.5
    return declick(reverb(buf, 1.8, 0.33).mean(axis=0), fade_out=0.12)


SFX = {
    "sfx-ui-tap": sfx_ui_tap,
    "sfx-pop": sfx_pop,
    "sfx-ui-start": sfx_ui_start,
    "sfx-key": sfx_key,
    "sfx-key-del": sfx_key_del,
    "sfx-catch": sfx_catch,
    "sfx-stain": sfx_stain,
    "sfx-decoy": sfx_decoy,
    "sfx-tick": sfx_tick,
    "sfx-timeup": sfx_timeup,
    "sfx-count": sfx_count,
    "sfx-whoosh": sfx_whoosh,
    "sfx-unlock": sfx_unlock,
    "sfx-result": sfx_result,
}


# --------------------------------------------------------------------------- music

CHORDS = {
    "C": {"notes": (60, 64, 67), "root": 36},
    "G": {"notes": (59, 62, 67), "root": 31},
    "Am": {"notes": (57, 60, 64), "root": 33},
    "F": {"notes": (57, 60, 65), "root": 29},
}


def duck_curve(n: int, beat: float, depth: float = 0.55, tau: float = 0.09) -> np.ndarray:
    """Volume dip on every beat so the kick punches through (cheap side-chain compression)."""
    t = np.arange(n) / SR
    return 1 - depth * np.exp(-(t % beat) / tau)


def bgm_game() -> np.ndarray:
    """124 BPM, 16 bars (~31 s). Energy builds in four 4-bar sections, then loops."""
    bpm = 124
    beat = 60 / bpm
    bar = beat * 4
    bars = 16
    loop = n_of(bar * bars)
    length = loop + n_of(3.0)

    dry = np.zeros((2, length))
    bassb = np.zeros((2, length))
    padb = np.zeros((2, length))
    arpb = np.zeros((2, length))
    bellb = np.zeros((2, length))

    progression = ["C", "G", "Am", "F"] * 4
    arp_seq = (0, 2, 1, 3, 2, 4, 3, 1, 0, 2, 1, 3, 4, 3, 2, 1)
    bell_motif = {
        "C": ((0, 79), (3, 81), (4, 84), (6, 81)),
        "G": ((0, 79), (3, 83), (4, 86), (6, 83)),
        "Am": ((0, 81), (3, 84), (4, 88), (6, 84)),
        "F": ((0, 81), (3, 84), (4, 89), (6, 84)),
    }
    kick_hit, snap_hit = kick(), snap()
    hat_closed, hat_open = hat(False), hat(True)

    for b_idx, name in enumerate(progression):
        chord = CHORDS[name]
        t0 = b_idx * bar
        section = b_idx // 4  # 0..3

        for k in range(4):  # kick on every beat
            put(dry, kick_hit, t0 + k * beat, 0.9)
        if section >= 1:
            for k in (1, 3):
                put(dry, snap_hit, t0 + k * beat, 0.26, pan=0.15)
            for e in range(1, 8, 2):  # off-beat closed hats
                put(dry, hat_closed, t0 + e * beat / 2, 0.2, pan=-0.2 + 0.05 * e)
        if section >= 3:
            for e in (3, 7):
                put(dry, hat_open, t0 + e * beat / 2, 0.16, pan=0.25)

        # Bass: rolling off-beat pattern, octave pop on the last hit.
        for slot, octave in ((0, 0), (3, 0), (4, 0), (6, 12)):
            put(bassb, bass_note(mtof(chord["root"] + octave), beat * 0.45), t0 + slot * beat / 2, 0.62)

        # Warm pad holds the chord for the whole bar.
        for midi in chord["notes"]:
            put(padb, pad_note(mtof(midi), bar + 0.4), t0, 0.1, pan=(midi % 5 - 2) * 0.2)

        # Pluck arpeggio: eighths in the first section, sixteenths afterwards.
        pool = [chord["notes"][0] + 12, chord["notes"][1] + 12, chord["notes"][2] + 12, chord["notes"][0] + 24, chord["notes"][1] + 24]
        step = 2 if section == 0 else 1
        for s in range(0, 16, step):
            accent = 1.0 if s % 4 == 0 else 0.62
            put(arpb, pluck(mtof(pool[arp_seq[s]]), 0.4), t0 + s * beat / 4, 0.3 * accent, pan=-0.45 if (s // step) % 2 == 0 else 0.45)

        # Bell melody joins from bar 9; an octave-down double joins in the last section.
        if section >= 2:
            for slot, midi in bell_motif[name]:
                at = t0 + slot * beat / 2
                put(bellb, bell(mtof(midi), 0.8, tau=0.4), at, 0.34, pan=0.3 if slot % 2 == 0 else -0.3)
                if section >= 3:
                    put(bellb, bell(mtof(midi - 12), 0.8, tau=0.4), at, 0.18, pan=0.0)

    # Rising noise sweep during the last bar, like a DJ build into the loop point.
    riser = noise_sweep(bar, 400, 9500, 900) * np.linspace(0, 1, n_of(bar)) ** 2 * 0.3
    put(dry, riser, (bars - 1) * bar, 1.0)

    duck = duck_curve(length, beat)
    bassb *= duck
    padb *= duck
    arpb *= 0.55 + 0.45 * duck
    arpb = echo(arpb, beat * 0.75, 0.42, 4, 0.38)

    send = reverb(arpb + bellb + padb * 0.6, 2.0, 1.0)
    mix = dry + bassb + padb + arpb + bellb + send * 0.32
    return master(fold_tail(mix, loop), target_rms_db=-17.5)


def bgm_attract() -> np.ndarray:
    """92 BPM, 8 bars (~21 s): calm, sparkling, inviting; soft pulse, no hard drums."""
    bpm = 92
    beat = 60 / bpm
    bar = beat * 4
    bars = 8
    loop = n_of(bar * bars)
    length = loop + n_of(3.5)

    dry = np.zeros((2, length))
    padb = np.zeros((2, length))
    arpb = np.zeros((2, length))

    progression = ["C", "Am", "F", "G"] * 2
    seq = (0, 1, 2, 3, 2, 1, 2, 1)
    kick_hit = kick() * 0.5

    for b_idx, name in enumerate(progression):
        chord = CHORDS[name]
        t0 = b_idx * bar
        for midi in chord["notes"]:
            put(padb, pad_note(mtof(midi), bar + 0.6), t0, 0.13, pan=(midi % 5 - 2) * 0.25)
        put(dry, bass_note(mtof(chord["root"]), bar * 0.95), t0, 0.5)
        for k in (0, 2):
            put(dry, kick_hit, t0 + k * beat, 0.55)
        for s in range(16):  # barely-there shaker
            put(dry, hat(False), t0 + s * beat / 4, 0.045 if s % 2 else 0.07, pan=-0.3 + 0.04 * s)

        tones = [chord["notes"][0] + 24, chord["notes"][1] + 24, chord["notes"][2] + 24, chord["notes"][0] + 36]
        for s, idx in enumerate(seq):
            velocity = 0.9 + 0.2 * RNG.random()
            put(arpb, bell(mtof(tones[idx % 4]), 1.1, tau=0.45), t0 + s * beat / 2, 0.2 * velocity, pan=-0.4 if s % 2 == 0 else 0.4)

    # A sparkle glide at the start of the second half.
    glide = noise_sweep(1.2, 2000, 9000, 600) * np.sin(np.linspace(0, np.pi, n_of(1.2))) ** 2 * 0.1
    put(dry, glide, 4 * bar - 0.8, 1.0)

    padb *= duck_curve(length, beat * 2, 0.25, 0.12)
    arpb = echo(arpb, beat * 0.75, 0.5, 5, 0.5)
    send = reverb(arpb + padb * 0.7, 2.6, 1.0)
    mix = dry + padb + arpb + send * 0.4
    return master(fold_tail(mix, loop), target_rms_db=-21.0)


MUSIC = {"bgm-game": bgm_game, "bgm-attract": bgm_attract}


# --------------------------------------------------------------------------- output


WRITE_CHUNK = 4096


def write_all(name: str, audio: np.ndarray, out_dir: str) -> None:
    data = audio.T if audio.ndim == 2 else audio
    data = np.ascontiguousarray(np.clip(data, -1.0, 1.0).astype("float32"))
    channels = 1 if data.ndim == 1 else data.shape[1]
    for ext, fmt, subtype in (("ogg", "OGG", "VORBIS"), ("mp3", "MP3", "MPEG_LAYER_III")):
        path = os.path.join(out_dir, f"{name}.{ext}")
        # Write in small blocks: libsndfile's Vorbis encoder overflows the stack on Windows when
        # given a long array in a single call.
        with sf.SoundFile(path, "w", samplerate=SR, channels=channels, format=fmt, subtype=subtype) as out:
            for start in range(0, len(data), WRITE_CHUNK):
                out.write(data[start : start + WRITE_CHUNK])


def report(name: str, audio: np.ndarray, out_dir: str) -> str:
    mono = audio if audio.ndim == 1 else audio.mean(axis=0)
    peak = 20 * np.log10(np.max(np.abs(audio)) + 1e-12)
    rms = 20 * np.log10(np.sqrt(np.mean(mono**2)) + 1e-12)
    size = os.path.getsize(os.path.join(out_dir, f"{name}.ogg")) / 1024
    mp3 = os.path.getsize(os.path.join(out_dir, f"{name}.mp3")) / 1024
    return f"{name:14} {mono.shape[0] / SR:6.2f}s  peak {peak:6.1f} dBFS  rms {rms:6.1f} dBFS  ogg {size:6.0f} KB  mp3 {mp3:6.0f} KB"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="public/assets/audio")
    ap.add_argument("--report", action="store_true", help="print level / size summary")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    lines = []
    for name, make in SFX.items():
        audio = peak_normalise(make(), 0.8)
        write_all(name, audio, args.out)
        lines.append(report(name, audio, args.out))
    for name, make in MUSIC.items():
        audio = make()
        write_all(name, audio, args.out)
        lines.append(report(name, audio, args.out))
    print("\n".join(lines))


if __name__ == "__main__":
    main()
