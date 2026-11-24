import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const sampleRate = 22_050;
const bitsPerSample = 16;
const bytesPerSample = bitsPerSample / 8;

const writeMonoWav = async (
  filePath: string,
  durationSeconds: number,
  sampleAt: (timeSeconds: number) => number
): Promise<void> => {
  const sampleCount = Math.ceil(sampleRate * durationSeconds);
  const dataBytes = sampleCount * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataBytes);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataBytes, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const timeSeconds = index / sampleRate;
    const sample = Math.max(-1, Math.min(1, sampleAt(timeSeconds)));
    buffer.writeInt16LE(Math.round(sample * 32_767), 44 + index * bytesPerSample);
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
};

const legacyAudioDirectory = resolve("projects/examples/three-scene-story/assets/audio");
await writeMonoWav(resolve(legacyAudioDirectory, "ambient-bed.wav"), 10, (time) => {
  const envelope = Math.max(0, Math.min(1, time / 1.6, (10 - time) / 1.8));
  const chord =
    Math.sin(2 * Math.PI * 130.81 * time) * 0.34 +
    Math.sin(2 * Math.PI * 155.56 * time) * 0.26 +
    Math.sin(2 * Math.PI * 196 * time) * 0.22 +
    Math.sin(2 * Math.PI * 261.63 * time) * 0.12;
  const shimmer = Math.sin(2 * Math.PI * 523.25 * time + Math.sin(time * 0.7)) * 0.06;
  return (chord + shimmer) * envelope * 0.24;
});
await writeMonoWav(resolve(legacyAudioDirectory, "transition-chime.wav"), 1.6, (time) => {
  const envelope = Math.min(1, time / 0.012) * Math.exp(-time * 3.8);
  const partials =
    Math.sin(2 * Math.PI * 880 * time) +
    Math.sin(2 * Math.PI * 1320 * time) * 0.38 +
    Math.sin(2 * Math.PI * 1760 * time) * 0.16;
  return partials * envelope * 0.34;
});

const showcaseDirectory = resolve("projects/showcase-motion/assets/audio");
const showcaseDuration = 16;
const chordSets = [
  [110, 164.81, 220, 261.63],
  [98, 146.83, 196, 246.94],
  [123.47, 185, 246.94, 293.66],
  [110, 164.81, 220, 261.63],
];

await writeMonoWav(resolve(showcaseDirectory, "score.wav"), showcaseDuration, (time) => {
  const fadeIn = Math.min(1, time / 1.1);
  const fadeOut = Math.min(1, (showcaseDuration - time) / 1.5);
  const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
  const chord = chordSets[Math.min(3, Math.floor(time / 4))]!;
  const pad = chord.reduce((sum, frequency, index) => {
    const slowDetune = Math.sin(2 * Math.PI * (frequency * (index % 2 === 0 ? 1 : 1.003)) * time);
    return sum + slowDetune * (0.16 - index * 0.018);
  }, 0);
  const beat = time % (60 / 92);
  const kickEnvelope = Math.exp(-beat * 28);
  const kickFrequency = 48 + 42 * Math.exp(-beat * 18);
  const kick = Math.sin(2 * Math.PI * kickFrequency * beat) * kickEnvelope * 0.16;
  const pulse = 0.78 + 0.22 * Math.sin(2 * Math.PI * 0.115 * time);
  const highTexture =
    Math.sin(2 * Math.PI * 440 * time) * 0.028 +
    Math.sin(2 * Math.PI * 659.25 * time + Math.sin(time * 0.6)) * 0.024 +
    Math.sin(2 * Math.PI * 880 * time) * 0.012;
  return (pad + kick + highTexture) * pulse * envelope * 0.72;
});

await writeMonoWav(resolve(showcaseDirectory, "transition-whoosh.wav"), 1.35, (time) => {
  const envelope = Math.pow(Math.sin(Math.PI * time / 1.35), 1.7);
  const noise =
    Math.sin(time * 1281.7) * 0.36 +
    Math.sin(time * 1997.3) * 0.28 +
    Math.sin(time * 2873.1) * 0.2 +
    Math.sin(time * 4079.9) * 0.16;
  const tonalSweep = Math.sin(2 * Math.PI * (160 + 850 * time) * time) * 0.2;
  return (noise + tonalSweep) * envelope * 0.28;
});

await writeMonoWav(resolve(showcaseDirectory, "impact.wav"), 1.1, (time) => {
  const envelope = Math.exp(-time * 5.6);
  const frequency = 78 - 26 * (1 - Math.exp(-time * 9));
  const body = Math.sin(2 * Math.PI * frequency * time) * 0.7;
  const click = Math.sin(2 * Math.PI * 1480 * time) * Math.exp(-time * 65) * 0.3;
  return (body + click) * envelope * 0.48;
});

await writeMonoWav(resolve(showcaseDirectory, "transition-chime.wav"), 1.55, (time) => {
  const envelope = Math.min(1, time / 0.012) * Math.exp(-time * 3.1);
  const chord =
    Math.sin(2 * Math.PI * 659.25 * time) * 0.42 +
    Math.sin(2 * Math.PI * 880 * time) * 0.32 +
    Math.sin(2 * Math.PI * 1318.5 * time) * 0.22 +
    Math.sin(2 * Math.PI * 1760 * time) * 0.12;
  return chord * envelope * 0.42;
});

// This muted test signal is used only as the sidechain key for automatic music ducking.
await writeMonoWav(resolve(showcaseDirectory, "ducking-key.wav"), showcaseDuration, (time) => {
  const phrases = [[5.1, 6.7], [10.0, 11.2]];
  const active = phrases.some(([start, end]) => time >= start! && time <= end!);
  if (!active) return 0;
  const pulse = 0.25 + 0.75 * Math.pow(Math.max(0, Math.sin((time - Math.floor(time * 3.2) / 3.2) * Math.PI * 3.2)), 2);
  const syllable = Math.sin(2 * Math.PI * 185 * time) * 0.62 +
    Math.sin(2 * Math.PI * 370 * time) * 0.25 +
    Math.sin(2 * Math.PI * 555 * time) * 0.13;
  return syllable * pulse * 0.34;
});

const pulseDirectory = resolve("projects/showcase-pulse/assets/audio");
const pulseDuration = 20;
const pulseChords = [
  [82.41, 123.47, 164.81, 207.65],
  [73.42, 110, 146.83, 185],
  [98, 146.83, 196, 246.94],
  [87.31, 130.81, 174.61, 220],
];

await writeMonoWav(resolve(pulseDirectory, "score.wav"), pulseDuration, (time) => {
  const fadeIn = Math.min(1, time / 0.8);
  const fadeOut = Math.min(1, (pulseDuration - time) / 1.4);
  const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
  const chord = pulseChords[Math.min(3, Math.floor(time / 5))]!;
  const pad = chord.reduce((sum, frequency, index) =>
    sum + Math.sin(2 * Math.PI * frequency * time) * (0.12 - index * 0.015), 0
  );
  const beatLength = 60 / 112;
  const beat = time % beatLength;
  const kick = Math.sin(2 * Math.PI * (52 + 38 * Math.exp(-beat * 20)) * beat) *
    Math.exp(-beat * 24) * 0.24;
  const offBeat = (time + beatLength / 2) % beatLength;
  const snap = Math.sin(2 * Math.PI * 1650 * time) * Math.exp(-offBeat * 55) * 0.045;
  const arpeggioNotes = [329.63, 392, 493.88, 587.33, 493.88, 392, 293.66, 392];
  const step = Math.floor(time / (beatLength / 2)) % arpeggioNotes.length;
  const notePhase = (time % (beatLength / 2)) / (beatLength / 2);
  const pluck = Math.sin(2 * Math.PI * arpeggioNotes[step]! * time) *
    Math.exp(-notePhase * 4) * 0.07;
  const texture = Math.sin(2 * Math.PI * 880 * time) * 0.012 +
    Math.sin(2 * Math.PI * 1320 * time + Math.sin(time * 0.7)) * 0.009;
  return (pad + kick + snap + pluck + texture) * envelope * 0.82;
});

await writeMonoWav(resolve(pulseDirectory, "transition-whoosh.wav"), 1.25, (time) => {
  const envelope = Math.pow(Math.sin(Math.PI * time / 1.25), 1.4);
  const noise = Math.sin(time * 1511.3) * 0.34 +
    Math.sin(time * 2387.1) * 0.28 +
    Math.sin(time * 3319.7) * 0.2;
  const sweep = Math.sin(2 * Math.PI * (120 + 1100 * time) * time) * 0.28;
  return (noise + sweep) * envelope * 0.3;
});

await writeMonoWav(resolve(pulseDirectory, "impact.wav"), 0.95, (time) => {
  const envelope = Math.exp(-time * 5.1);
  const sub = Math.sin(2 * Math.PI * (72 - 18 * time) * time) * 0.72;
  const transient = Math.sin(2 * Math.PI * 1900 * time) * Math.exp(-time * 48) * 0.28;
  return (sub + transient) * envelope * 0.52;
});


const soraDirectory = resolve("projects/sora/assets/audio");
const soraDuration = 12;
const soraChords = [
  [130.81, 164.81, 196, 261.63],
  [110, 146.83, 174.61, 220],
  [123.47, 155.56, 185, 246.94],
  [130.81, 164.81, 196, 261.63],
];
await writeMonoWav(resolve(soraDirectory, "score.wav"), soraDuration, (time) => {
  const fadeIn = Math.min(1, time / 1.4);
  const fadeOut = Math.min(1, (soraDuration - time) / 1.8);
  const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
  const chord = soraChords[Math.min(3, Math.floor(time / 3))]!;
  const warmPad = chord.reduce((sum, frequency, index) =>
    sum + Math.sin(2 * Math.PI * frequency * time + Math.sin(time * 0.23 + index) * 0.08) * (0.12 - index * 0.018), 0
  );
  const beatLength = 60 / 86;
  const beat = time % beatLength;
  const lowPulse = Math.sin(2 * Math.PI * (48 + 18 * Math.exp(-beat * 8)) * beat) * Math.exp(-beat * 15) * 0.13;
  const tickPhase = (time + beatLength / 2) % beatLength;
  const softTick = Math.sin(2 * Math.PI * 1850 * time) * Math.exp(-tickPhase * 42) * 0.018;
  const airy = Math.sin(2 * Math.PI * 659.25 * time + Math.sin(time * 0.4)) * 0.018 +
    Math.sin(2 * Math.PI * 987.77 * time) * 0.009;
  return (warmPad + lowPulse + softTick + airy) * envelope * 0.56;
});



const madridTravelDirectory = resolve("packages/video-engine/public/audio");
const madridTravelDuration = 24;
const madridTravelChords = [
  [110, 164.81, 220, 261.63],
  [98, 146.83, 196, 246.94],
  [130.81, 164.81, 196, 261.63],
  [110, 164.81, 220, 261.63],
];
await writeMonoWav(resolve(madridTravelDirectory, "madrid-travel-score.wav"), madridTravelDuration, (time) => {
  const fadeIn = Math.min(1, time / 2.2);
  const fadeOut = Math.min(1, (madridTravelDuration - time) / 2.2);
  const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
  const chord = madridTravelChords[Math.min(3, Math.floor(time / 7.5))]!;
  const pad = chord.reduce((sum, frequency, index) => {
    const modulation = Math.sin(2 * Math.PI * 0.08 * time + index * 0.7) * 0.035;
    return sum + Math.sin(2 * Math.PI * frequency * time + modulation) * (0.13 - index * 0.014);
  }, 0);
  const airy = Math.sin(2 * Math.PI * 392 * time + Math.sin(time * 0.35)) * 0.025 +
    Math.sin(2 * Math.PI * 587.33 * time + Math.sin(time * 0.23)) * 0.018 +
    Math.sin(2 * Math.PI * 783.99 * time) * 0.01;
  const pulse = 0.92 + 0.08 * Math.sin(2 * Math.PI * 0.12 * time);
  return (pad + airy) * pulse * envelope * 0.52;
});

const stormlightDirectory = resolve("projects/stormlight-keeper/assets/audio");
const stormlightDuration = 24;
const stormlightChords = [
  [73.42, 110, 146.83, 185],
  [82.41, 123.47, 164.81, 207.65],
  [65.41, 98, 130.81, 164.81],
  [87.31, 130.81, 174.61, 220],
];
await writeMonoWav(resolve(stormlightDirectory, "stormlight-score.wav"), stormlightDuration, (time) => {
  const fadeIn = Math.min(1, time / 2.0);
  const fadeOut = Math.min(1, (stormlightDuration - time) / 2.5);
  const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
  const chord = stormlightChords[Math.min(3, Math.floor(time / 6))]!;
  const pad = chord.reduce((sum, frequency, index) =>
    sum + Math.sin(2 * Math.PI * frequency * time + Math.sin(time * 0.18 + index) * 0.05) * (0.14 - index * 0.016), 0
  );
  const lowDrone = Math.sin(2 * Math.PI * 38 * time + Math.sin(time * 0.2) * 0.1) * 0.055;
  const pulse = 0.88 + 0.12 * Math.sin(2 * Math.PI * 0.09 * time);
  const swell = Math.sin(2 * Math.PI * 220 * time) * (time > 15 ? 0.035 : 0.012);
  return (pad + lowDrone + swell) * envelope * pulse * 0.62;
});
await writeMonoWav(resolve(stormlightDirectory, "stormlight-atmosphere.wav"), stormlightDuration, (time) => {
  const wind = Math.sin(time * 1731.1) * 0.29 +
    Math.sin(time * 2137.7) * 0.2 +
    Math.sin(time * 2981.3) * 0.18 +
    Math.sin(time * 3877.9) * 0.1;
  const gust = 0.24 + 0.76 * Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 0.11 * time + 0.7), 2);
  const surf = Math.sin(2 * Math.PI * (43 + 7 * Math.sin(time * 0.26)) * time) * 0.18;
  const thunderTimes = [3.9, 7.4, 11.4, 13.3, 18.2];
  const thunder = thunderTimes.reduce((sum, at) => {
    const t = time - at;
    if (t < 0 || t > 1.8) return sum;
    return sum + Math.sin(2 * Math.PI * (48 - 12 * t) * t) * Math.exp(-t * 2.9) * 0.42;
  }, 0);
  const metalTimes = [6.5, 8.2, 12.2, 13.8, 15.2, 16.1];
  const metal = metalTimes.reduce((sum, at, i) => {
    const t = time - at;
    if (t < 0 || t > 0.5) return sum;
    const tick = Math.sin(2 * Math.PI * (680 + i * 93) * t) * Math.exp(-t * 16);
    return sum + tick * 0.12;
  }, 0);
  return (wind * gust + surf + thunder + metal) * 0.25;
});


const jumpingCatDirectory = resolve("packages/video-engine/public/audio");
const windDuration = 20;
await writeMonoWav(resolve(jumpingCatDirectory, "jumping-cat-wind.wav"), windDuration, (time) => {
  const slow = Math.sin(2 * Math.PI * 0.17 * time) * 0.09 +
    Math.sin(2 * Math.PI * 0.31 * time + 0.8) * 0.06 +
    Math.sin(2 * Math.PI * 0.071 * time + 1.4) * 0.045;
  const gust = 0.78 + 0.22 * Math.sin(2 * Math.PI * 0.055 * time + 0.4);
  // Inharmonic, softly weighted mid/high components create an airy wind texture
  // rather than relying on near-infrasonic oscillators that are hard to hear.
  const air = (
    Math.sin(2 * Math.PI * 173.3 * time) * 0.04 +
    Math.sin(2 * Math.PI * 227.7 * time + 0.4) * 0.04 +
    Math.sin(2 * Math.PI * 311.9 * time + 1.1) * 0.04 +
    Math.sin(2 * Math.PI * 419.3 * time + 0.7) * 0.04 +
    Math.sin(2 * Math.PI * 563.1 * time + 1.7) * 0.04 +
    Math.sin(2 * Math.PI * 719.7 * time + 0.2) * 0.04 +
    Math.sin(2 * Math.PI * 887.9 * time + 2.1) * 0.04 +
    Math.sin(2 * Math.PI * 1093.1 * time + 0.9) * 0.04 +
    Math.sin(2 * Math.PI * 1379.3 * time + 1.4) * 0.04 +
    Math.sin(2 * Math.PI * 1697.1 * time + 0.6) * 0.04 +
    Math.sin(2 * Math.PI * 2011.7 * time + 2.2) * 0.04 +
    Math.sin(2 * Math.PI * 2393.9 * time + 1.8) * 0.04
  );
  return (slow + air) * gust * 0.72;
});

console.log("Generated legacy samples, original Aether, PULSE, SORA, Madrid travel, Stormlight Keeper and Jumping Cat audio fixtures.");
