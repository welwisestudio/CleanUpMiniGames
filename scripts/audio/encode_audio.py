import sys, os, subprocess, numpy as np, soundfile as sf, imageio_ffmpeg
IN, OUT, MUSIC = sys.argv[1], sys.argv[2], sys.argv[3]
FF = imageio_ffmpeg.get_ffmpeg_exe()
# runtime key: (source, mode)  mode: loop = active span with fades; shot = span around the first strong hit
PLAN = {
    'sfx-tap': ('put.ogg', 'shot', 0.18),
    'sfx-success': ('Right.ogg', 'shot', 1.2),
    'sfx-pop': ('Bubble.ogg', 'shot', 0.25),
    'sfx-squeak': ('GlassWipe.ogg', 'shot', 0.3),
    'sfx-snip': ('cut.ogg', 'shot', 0.45),
    'sfx-crumble': ('peeling.ogg', 'shot', 0.5),
    'loop-brush': ('BrushingHair.ogg', 'loop', 2.4),
    'loop-softbrush': ('MakeupBrush.ogg', 'loop', 1.1),
    'loop-lather': ('ShampooWash.ogg', 'loop', 2.4),
    'loop-wipe': ('wipescrub.ogg', 'loop', 2.6),
    'loop-dab': ('Cotton.ogg', 'loop', 1.0),
    'loop-file': ('Nail-File.ogg', 'loop', 1.4),
    'loop-scrape': ('card-friction.ogg', 'loop', 1.0),
    'loop-water': ('WaterPoor.ogg', 'loop', 2.0),
    'loop-spray': ('spray.ogg', 'loop', 1.6),
    'loop-foam': ('xitkem.ogg', 'loop', 0.5),
    'loop-laser': ('FireCrack.ogg', 'loop', 2.4),
    'loop-polish': ('FaceMassage.ogg', 'loop', 1.6),
}
def env(x, sr):
    hop = int(sr * 0.01)
    return np.array([np.sqrt((x[i:i+hop] ** 2).mean()) for i in range(0, len(x) - hop, hop)]), hop
report = []
for key, (src, mode, maxlen) in PLAN.items():
    d, sr = sf.read(os.path.join(IN, src), always_2d=True)
    x = d.mean(axis=1)
    e, hop = env(x, sr)
    thr = e.max() * (0.08 if mode == 'loop' else 0.05)
    act = np.where(e > thr)[0]
    a = act[0] * hop
    b = act[-1] * hop + hop
    if mode == 'shot':
        a = max(0, a - int(0.005 * sr))
    seg = x[a:min(b, a + int(maxlen * sr))].copy()
    # fades: loops 25 ms each side (no clicks at the wrap), shots 4 ms in / 40 ms out
    fi = int(sr * (0.025 if mode == 'loop' else 0.004))
    fo = int(sr * (0.025 if mode == 'loop' else 0.04))
    seg[:fi] *= np.linspace(0, 1, fi)
    seg[-fo:] *= np.linspace(1, 0, fo)
    seg *= 0.89 / max(np.abs(seg).max(), 1e-6)  # peak-normalise to -1 dBFS (mixing happens in code)
    wav = os.path.join(OUT, key + '.wav')
    sf.write(wav, seg, sr)
    dst = os.path.join(OUT, key + '.ogg')
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '22050', '-c:a', 'libvorbis', '-q:a', '1', dst], check=True)
    os.remove(wav)
    report.append((key, src, round(len(seg) / sr, 2), os.path.getsize(dst)))
# music: mono, 32 kHz, Vorbis q0 (~45 kbps); loudness checked separately
dst = os.path.join(OUT, 'music-main.ogg')
subprocess.run([FF, '-y', '-loglevel', 'error', '-i', MUSIC, '-ac', '1', '-ar', '32000', '-c:a', 'libvorbis', '-q:a', '0', dst], check=True)
report.append(('music-main', 'BackgroundMusic.ogg', 111.36, os.path.getsize(dst)))
tot = 0
for r in report:
    tot += r[3]
    print(*r)
print('TOTAL', tot)
