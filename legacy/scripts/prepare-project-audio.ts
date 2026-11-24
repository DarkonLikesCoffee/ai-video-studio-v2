import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import type { AudioTrack, VideoProject } from "../packages/video-engine/src/project";
import { buildAudioInputArgs, buildMainAudioFilter, buildSidechainTailFilter } from "./audio-processing";
import { isSafeProjectAssetPath, isRemoteMediaUrl, validateProjectDefinition } from "../packages/video-engine/src/project";

const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const projectArg = process.argv[2];
if (!projectArg) {
  console.error("Usage: tsx scripts/prepare-project-audio.ts <project.json>");
  process.exit(2);
}

const projectPath = resolve(projectArg);
const projectDirectory = await realpath(dirname(projectPath));
const project = JSON.parse(await readFile(projectPath, "utf8")) as VideoProject;
const errors = validateProjectDefinition(project);
if (errors.length > 0) {
  throw new Error("Cannot prepare audio for an invalid project:\n" + errors.join("\n"));
}

const quoteNumber = (value: number): string => {
  if (!Number.isFinite(value)) throw new Error("Audio filter values must be finite");
  return String(Number(value.toFixed(5)));
};

const buildAtempoFilters = (playbackRate: number): string[] => {
  const filters: string[] = [];
  let remaining = playbackRate;
  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }
  while (remaining > 2) {
    filters.push("atempo=2");
    remaining /= 2;
  }
  if (Math.abs(remaining - 1) > 0.00001) filters.push(`atempo=${quoteNumber(remaining)}`);
  return filters;
};

const runFfmpeg = async (args: string[]): Promise<void> => {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(ffmpeg, ["-hide_banner", "-loglevel", "warning", ...args], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      if (stderr.length > 20_000) stderr = stderr.slice(-20_000);
    });
    child.on("error", (error) => reject(new Error(`Could not start FFmpeg (${ffmpeg}): ${error.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`FFmpeg exited with code ${code}:\n${stderr}`));
    });
  });
};

const resolveLocalAudio = async (track: AudioTrack): Promise<string> => {
  if (!isSafeProjectAssetPath(track.src) || isRemoteMediaUrl(track.src)) {
    throw new Error(`Audio processing requires a local assets/ file: track ${track.id}`);
  }
  const path = await realpath(resolve(projectDirectory, track.src));
  const rel = relative(projectDirectory, path);
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) {
    throw new Error(`Audio track ${track.id} resolves outside its project folder`);
  }
  return path;
};

const tracks = project.audioTracks ?? [];
const processedTracks = tracks.map((track) => ({ ...track }));
const byId = new Map(tracks.map((track) => [track.id, track]));
const fps = project.composition.fps;
let processedCount = 0;

for (let index = 0; index < tracks.length; index += 1) {
  const track = tracks[index]!;
  if (!track.effects && !track.ducking) continue;

  const inputPath = await resolveLocalAudio(track);
  const sidechainTracks = (track.ducking?.sidechainTrackIds ?? []).map((id) => {
    const sidechain = byId.get(id);
    if (!sidechain || sidechain.role !== "voiceover") {
      throw new Error(`Track ${track.id} references an unknown voice-over track: ${id}`);
    }
    return sidechain;
  });
  const sidechainPaths: string[] = [];
  for (const sidechain of sidechainTracks) sidechainPaths.push(await resolveLocalAudio(sidechain));

  const trackDurationInFrames = track.durationInFrames ??
    project.scenes.reduce((total, scene) => total + scene.durationInFrames, 0) - track.startInFrames;
  const trackDurationSeconds = trackDurationInFrames / fps;
  const args = ["-y", ...buildAudioInputArgs({ src: inputPath, loop: track.loop ?? false })];
  for (const path of sidechainPaths) args.push("-i", path);

  const filters: string[] = [];
  filters.push(buildMainAudioFilter(trackDurationSeconds, track.loop ?? false));
  let current = "main0";

  if (sidechainTracks.length > 0 && track.ducking) {
    const sidechainLabels: string[] = [];
    sidechainTracks.forEach((sidechain, sidechainIndex) => {
      const inputIndex = sidechainIndex + 1;
      const deltaFrames = sidechain.startInFrames - track.startInFrames;
      const delayMs = Math.max(0, Math.round((deltaFrames / fps) * 1000));
      const trimSeconds = Math.max(0, -deltaFrames / fps);
      const label = `sc${sidechainIndex}`;
      const preFilters = [
        "aresample=48000",
        "aformat=sample_fmts=fltp:channel_layouts=stereo",
        `atrim=start=${quoteNumber((sidechain.trimBefore ?? 0) / fps)}`,
        "asetpts=PTS-STARTPTS",
      ];
      if (trimSeconds > 0) preFilters.push(`atrim=start=${quoteNumber(trimSeconds)}`, "asetpts=PTS-STARTPTS");
      if (sidechain.playbackRate && sidechain.playbackRate !== 1) {
        preFilters.push(...buildAtempoFilters(sidechain.playbackRate));
      }
      if (delayMs > 0) preFilters.push(`adelay=${delayMs}|${delayMs}`);
      // sidechaincompress stops at its shortest input. Pad after timeline delay so the
      // sidechain bus spans the complete music-track window, including the post-voice tail.
      preFilters.push(...buildSidechainTailFilter(trackDurationSeconds));
      filters.push(`[${inputIndex}:a]${preFilters.join(",")}[${label}]`);
      sidechainLabels.push(`[${label}]`);
    });

    let sidechainBus = sidechainLabels[0]!;
    if (sidechainLabels.length > 1) {
      filters.push(`${sidechainLabels.join("")}amix=inputs=${sidechainLabels.length}:normalize=0:duration=longest[voicebus]`);
      sidechainBus = "[voicebus]";
    }

    const duck = track.ducking;
    const threshold = Math.pow(10, (duck.thresholdDb ?? -30) / 20);
    filters.push(
      `[main0]${sidechainBus}sidechaincompress=threshold=${quoteNumber(threshold)}:ratio=${quoteNumber(duck.ratio ?? 8)}:attack=${quoteNumber(duck.attackMs ?? 18)}:release=${quoteNumber(duck.releaseMs ?? 320)}[ducked]`
    );
    current = "ducked";
  }

  const effects = track.effects;
  const processing: string[] = [];
  if (effects?.highPassHz !== undefined) processing.push(`highpass=f=${quoteNumber(effects.highPassHz)}`);
  if (effects?.lowPassHz !== undefined) processing.push(`lowpass=f=${quoteNumber(effects.lowPassHz)}`);

  for (const band of effects?.eqBands ?? []) {
    processing.push(
      `equalizer=f=${quoteNumber(band.frequency)}:t=q:w=${quoteNumber(band.q ?? 1)}:g=${quoteNumber(band.gainDb)}`
    );
  }

  if (effects?.compressor) {
    const compressor = effects.compressor;
    const threshold = Math.pow(10, compressor.thresholdDb / 20);
    const makeup = Math.pow(10, (compressor.makeupGainDb ?? 0) / 20);
    processing.push(
      `acompressor=threshold=${quoteNumber(threshold)}:ratio=${quoteNumber(compressor.ratio)}:attack=${quoteNumber(compressor.attackMs ?? 20)}:release=${quoteNumber(compressor.releaseMs ?? 250)}:makeup=${quoteNumber(makeup)}`
    );
  }

  if (effects?.reverb) {
    const { roomSize, wet } = effects.reverb;
    const firstDelay = Math.round(35 + roomSize * 75);
    const secondDelay = Math.round(80 + roomSize * 190);
    const firstDecay = quoteNumber(wet * (0.22 + roomSize * 0.12));
    const secondDecay = quoteNumber(wet * (0.12 + roomSize * 0.08));
    processing.push(`aecho=0.85:1:${firstDelay}|${secondDelay}:${firstDecay}|${secondDecay}`);
  }

  if (effects?.pan !== undefined) {
    const pan = effects.pan;
    const left = pan > 0 ? 1 - pan : 1;
    const right = pan < 0 ? 1 + pan : 1;
    processing.push(`pan=stereo|c0=${quoteNumber(left)}*c0|c1=${quoteNumber(right)}*c1`);
  }

  processing.push("alimiter=limit=0.98:attack=5:release=50");
  filters.push(`[${current}]${processing.join(",")}[outa]`);

  const outputRelative = `assets/audio/.processed/${track.id}.wav`;
  const outputPath = resolve(projectDirectory, outputRelative);
  await mkdir(dirname(outputPath), { recursive: true });
  await runFfmpeg([
    ...args,
    "-filter_complex", filters.join(";"),
    "-map", "[outa]",
    "-vn",
    "-ar", "48000",
    "-ac", "2",
    "-c:a", "pcm_s16le",
    outputPath,
  ]);

  const { effects: _effects, ducking: _ducking, ...renderTrack } = track;
  processedTracks[index] = {
    ...renderTrack,
    src: outputRelative,
  };
  processedCount += 1;
  console.log(`Processed audio track: ${track.id}`);
}

const renderProject = {
  ...project,
  audioTracks: processedTracks,
};
const propsPath = resolve(projectDirectory, ".render-project.json");
await writeFile(propsPath, JSON.stringify(renderProject, null, 2) + "\n", "utf8");

console.log(`Prepared ${processedCount} processed audio track(s).`);
console.log(`Render props: ${propsPath}`);
