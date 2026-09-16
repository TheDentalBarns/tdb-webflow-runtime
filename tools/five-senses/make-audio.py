"""Original, deterministic prototype soundscapes. No third-party recordings.

The calm track combines a sparse piano-like additive instrument, room reverb
and quiet synthesized bird phrases. The clinical track combines filtered air,
equipment hum and subdued voice-like room murmur. These are design-test audio,
not recordings of a real practice. Render to PCM, then encode with ffmpeg.
"""
from pathlib import Path
import subprocess
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io.wavfile import write

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/five-senses'
RATE = 32000
LENGTH = 48
N = RATE * LENGTH
rng = np.random.default_rng(1652026)

def band(x, lo, hi):
    return sosfilt(butter(3, [lo, hi], btype='bandpass', fs=RATE, output='sos'), x)

def add(track, sound, at, pan=0):
    start = int(at * RATE)
    idx = (np.arange(len(sound)) + start) % N
    track[idx, 0] += sound * np.sqrt((1-pan)/2)
    track[idx, 1] += sound * np.sqrt((1+pan)/2)

def piano(freq, duration=9):
    t = np.arange(int(duration * RATE)) / RATE
    y = np.zeros_like(t)
    for h, level in enumerate([1, .43, .21, .11, .065, .027, .012], 1):
        decay = np.exp(-t * (.30 + h*.105))
        wave = np.sin(2*np.pi*freq*h*np.sqrt(1+.00006*h*h)*t)
        wave += .19*np.sin(2*np.pi*(freq*h+.27)*t)
        y += wave*level*decay
    y *= (1-np.exp(-t*110))
    y += band(rng.normal(0, .09, len(t)), 800, 4700) * np.exp(-t*70)
    return y*.052

calm = np.zeros((N,2), np.float64)
phrase=[(0,48),(1.9,55),(4.8,62),(9.4,64),(14.6,57),(17.3,60),
        (23.8,53),(26.1,60),(29.8,67),(34.4,64),(39.8,55),(42.1,62)]
for at, midi in phrase:
    add(calm, piano(440*2**((midi-69)/12)), at, rng.uniform(-.3,.3))
dry=calm.copy()
for delay, gain in [(.137,.11),(.283,.09),(.471,.07),(.719,.045),(1.019,.023)]:
    calm += np.roll(dry, int(delay*RATE), axis=0)*gain

for start in [3.3, 11.7, 21.1, 32.2, 43.3]:
    pan=rng.uniform(-.7,.7)
    for j in range(3):
        d=rng.uniform(.08,.16)
        t=np.arange(int(d*RATE))/RATE
        f=2200+rng.uniform(0,1200)+1000*np.sin(np.pi*t/d)
        phase=2*np.pi*np.cumsum(f)/RATE
        env=np.sin(np.pi*t/d)**2
        y=(np.sin(phase)+.16*np.sin(2*phase))*env*.008
        add(calm,y,start+j*.21,pan)
for ch in range(2):
    air=band(rng.normal(0,1,N),200,1400)
    calm[:,ch]+=air*.0007

t=np.arange(N)/RATE
clinical=np.zeros((N,2),np.float64)
for ch in range(2):
    air=band(rng.normal(0,1,N),450,4100)
    suction=.008*(.45+.55*np.sin(2*np.pi*t/16+ch*.1)**4)
    murmur=band(rng.normal(0,1,N),180,1050)
    voices=.004*(.2+.8*np.sin(2*np.pi*t/12+1.1)**6)
    hum=.003*(np.sin(2*np.pi*100*t)+.5*np.sin(2*np.pi*200*t))
    clinical[:,ch]=air*suction+murmur*voices+hum

OUT.mkdir(parents=True,exist_ok=True)
for name, track in [('calm',calm),('clinical',clinical)]:
    # Keep loop junctions inaudible without boosting the intentionally quiet mix.
    fade=int(.08*RATE)
    track[:fade]*=np.linspace(0,1,fade)[:,None]
    track[-fade:]*=np.linspace(1,0,fade)[:,None]
    pcm=np.int16(np.clip(track,-1,1)*32767)
    wav=OUT/(name+'.wav')
    write(wav,RATE,pcm)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),
        '-c:a','libmp3lame','-b:a','80k',str(OUT/(name+'.mp3'))],check=True)
    wav.unlink()
    print(name, (OUT/(name+'.mp3')).stat().st_size, 'bytes')
