# Builds every runtime audio file in public/assets/audio/ from the source records (never shipped).
# Usage: python encode_audio.py <Sounds.zip extracted dir> <reference/input dir> <out dir>
# Needs numpy, soundfile, imageio-ffmpeg (a scratch venv; not a game dependency).
#
# Modes:
#   shot  – from the first strong onset, at most `maxlen` s, 4 ms fade-in / 40 ms fade-out
#   head  – the first `maxlen` s of the sound (bright onset of a jingle), short fade-out
#   loop  – the most CONTINUOUS window of `maxlen` s (highest minimum loudness), 25 ms fades both ends
# All: mono; shots peak-normalised to -1 dBFS, loops loudness-normalised (RMS 0.12, soft limiter);
# the mix is done in code (src/content/audio.js MIX). Vorbis 22.05 kHz q1;
# music: mono 32 kHz q0.
import sys, os, subprocess, numpy as np, soundfile as sf, imageio_ffmpeg

PACK, INPUT, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
FF = imageio_ffmpeg.get_ffmpeg_exe()
P = lambda f: os.path.join(PACK, f)  # Sounds.zip
I = lambda f: os.path.join(INPUT, f)  # reference/input

PLAN = {
    'sfx-tap': (P('put.ogg'), 'shot', 0.18),
    'sfx-wow': (P('Right.ogg'), 'shot', 1.2),  # voiced "wow" — rare level-complete celebration only
    'sfx-pop': (P('Bubble.ogg'), 'shot', 0.25),
    'sfx-squeak': (P('GlassWipe.ogg'), 'shot', 0.3),
    'sfx-snip': (P('cut.ogg'), 'shot', 0.45),
    'sfx-crumble': (P('peeling.ogg'), 'shot', 0.5),
    'sfx-win': (I('Win.mp3'), 'shot', 2.2),  # level complete / big rewards
    'sfx-chime': (I('Win.mp3'), 'head', 0.45),  # short bright chime: stage complete, coins, unlocks
    'loop-brush': (P('BrushingHair.ogg'), 'loop', 2.4),
    'loop-softbrush': (P('MakeupBrush.ogg'), 'loop', 1.1),
    'loop-lather': (P('ShampooWash.ogg'), 'loop', 2.4),
    'loop-wipe': (P('wipescrub.ogg'), 'loop', 2.6),
    'loop-paint': (I('Painting.mp3'), 'loop', 2.6),  # replaces Cotton.ogg (rollers / stain) + paint brush
    'loop-file': (P('Nail-File.ogg'), 'loop', 1.4),
    'loop-scrape': (P('card-friction.ogg'), 'loop', 1.0),
    'loop-water': (I('WaterSound.mp3'), 'loop', 3.0),  # replaces WaterPoor.ogg
    'loop-spray': (P('spray.ogg'), 'loop', 1.6),
    'loop-aerosol': (I('salamisound-8612318-aerosol-spray-hair-spray.mp3'), 'loop', 0.8),  # spray paint / aerosol foam can
    'loop-foam': (P('xitkem.ogg'), 'loop', 0.5),
    'loop-laser': (I('laser_zjsudyn_.mp3'), 'loop', 3.0),  # replaces FireCrack.ogg
    'loop-polish': (P('FaceMassage.ogg'), 'loop', 1.6),
}


def read(path):
    if path.endswith('.mp3'):
        wav = os.path.join(OUT, '_tmp.wav')
        subprocess.run([FF, '-y', '-loglevel', 'error', '-i', path, wav], check=True)
        d, sr = sf.read(wav, always_2d=True)
        os.remove(wav)
    else:
        d, sr = sf.read(path, always_2d=True)
    return d.mean(axis=1), sr


def env(x, sr, win=0.01):
    hop = int(sr * win)
    return np.array([np.sqrt((x[i:i + hop] ** 2).mean()) for i in range(0, len(x) - hop, hop)]), hop


report = []
for key, (src, mode, maxlen) in PLAN.items():
    x, sr = read(src)
    e, hop = env(x, sr)
    n = int(maxlen * sr)
    if mode == 'loop':
        # the window with the highest 10th-percentile loudness = the most even, continuous part
        w = max(1, int(n / hop))
        best, bi = -1, 0
        for i in range(0, max(1, len(e) - w), max(1, w // 8)):
            q = np.percentile(e[i:i + w], 10)
            if q > best:
                best, bi = q, i
        a = bi * hop
        seg = x[a:a + n].copy()
        fi = fo = int(sr * 0.025)
    else:
        act = np.where(e > e.max() * 0.05)[0]
        a = 0 if mode == 'head' else max(0, act[0] * hop - int(0.005 * sr))
        b = n + a if mode == 'head' else act[-1] * hop + hop
        seg = x[a:min(b, a + n)].copy()
        fi, fo = int(sr * 0.004), int(sr * (0.12 if mode == 'head' else 0.04))
    seg[:fi] *= np.linspace(0, 1, fi)
    seg[-fo:] *= np.linspace(1, 0, fo)
    if mode == 'loop':
        # loudness-normalise loops to one target (RMS 0.12) with a soft limiter on the peaks, so a
        # splashy / sparse source (water, paint) is as present as a continuous one
        seg *= 0.12 / max(np.sqrt((seg ** 2).mean()), 1e-6)
        seg = np.tanh(seg / 0.89) * 0.89
    else:
        seg *= 0.89 / max(np.abs(seg).max(), 1e-6)
    wav = os.path.join(OUT, key + '.wav')
    sf.write(wav, seg, sr)
    dst = os.path.join(OUT, key + '.ogg')
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '22050', '-c:a', 'libvorbis', '-q:a', '1', dst], check=True)
    os.remove(wav)
    report.append((key, os.path.basename(src), round(len(seg) / sr, 2), os.path.getsize(dst)))
dst = os.path.join(OUT, 'music-main.ogg')
subprocess.run([FF, '-y', '-loglevel', 'error', '-i', I('BackgroundMusic.ogg'), '-ac', '1', '-ar', '24000', '-c:a', 'libvorbis', '-q:a', '0', dst], check=True)  # 24 kHz (size pass 2026-10-16)
report.append(('music-main', 'BackgroundMusic.ogg', 111.36, os.path.getsize(dst)))
tot = 0
for r in report:
    tot += r[3]
    print(*r)
print('TOTAL', tot)
