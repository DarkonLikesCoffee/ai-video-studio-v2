import { access, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { AudioTrack, VideoProject } from "../packages/video-engine/src/project";
import { getProjectDurationInFrames, validateProjectDefinition } from "../packages/video-engine/src/project";
import { buildNarrationSubtitles, type NarrationAlignedWord, type NarrationSubtitleOptions } from "../packages/video-engine/src/narration";
import { retimeProjectToDuration } from "../packages/video-engine/src/narration-timeline";
import { applyNarratedFootageToProject, buildNarratedFootageTimeline } from "../packages/video-engine/src/footage";

const projectArg = process.argv[2];
const configArg = process.argv[3];
const alignmentArg = process.argv[4];
if (!projectArg || !configArg || !alignmentArg) {
  console.error("Usage: npm run narration:apply -- <project.json> <narration.json> <narration-alignment.json>");
  process.exit(2);
}

const projectPath = resolve(projectArg);
const configPath = resolve(configArg);
const alignmentPath = resolve(alignmentArg);
const projectDirectory = dirname(projectPath);
const project = JSON.parse(await readFile(projectPath, "utf8")) as unknown;
const config = JSON.parse(await readFile(configPath, "utf8")) as {
  subtitle?: NarrationSubtitleOptions;
  speaker?: string;
};
const alignment = JSON.parse(await readFile(alignmentPath, "utf8")) as {
  schemaVersion?: number;
  durationSeconds?: number;
  words?: NarrationAlignedWord[];
};

if (alignment.schemaVersion !== 1 || !Number.isFinite(alignment.durationSeconds) ||
    !Array.isArray(alignment.words) || alignment.words.length === 0) {
  throw new Error("Narration alignment file is missing valid duration or word timestamps.");
}

if (!project || typeof project !== "object" || !("composition" in project) ||
    !project.composition || typeof project.composition !== "object" || !("id" in project.composition)) {
  throw new Error("Project metadata is missing its composition definition.");
}

const compositionId = project.composition.id;
if (compositionId === "NarratedSkyExplainer") {
  const metadata = project as {
    schemaVersion?: number;
    title?: string;
    composition: { id: string; width: number; height: number; fps: number; durationInFrames: number };
  };
  if (metadata.schemaVersion !== 1 || typeof metadata.title !== "string" ||
      !Number.isInteger(metadata.composition.durationInFrames) ||
      !Number.isInteger(metadata.composition.fps) || metadata.composition.fps < 1 ||
      metadata.composition.fps > 120) {
    throw new Error("NarratedSkyExplainer metadata has an invalid schema or duration.");
  }
  const durationInFrames = metadata.composition.durationInFrames;
  const narrationDurationInFrames = Math.ceil(alignment.durationSeconds! * metadata.composition.fps);
  if (narrationDurationInFrames > durationInFrames) {
    throw new Error(
      `Narration is ${alignment.durationSeconds!.toFixed(2)}s but the custom composition is only ${(durationInFrames / metadata.composition.fps).toFixed(2)}s. ` +
      "Extend the composition; narration will not be sped up or clipped automatically."
    );
  }
  await Promise.all([
    access(resolve(projectDirectory, "assets/audio/narration.wav")),
    access(resolve(projectDirectory, "assets/audio/score.wav")),
    access(resolve(projectDirectory, "assets/audio/transition-whoosh.wav")),
  ]);
  const subtitleCues = buildNarrationSubtitles(
    alignment.words,
    metadata.composition.fps,
    durationInFrames,
    {
      ...(config.subtitle ?? {}),
      ...(config.speaker ? { speaker: config.speaker } : {}),
    },
  );
  const storyboardPath = resolve(projectDirectory, "production/production-plan.json");
  const assetManifestPath = resolve(projectDirectory, "production/asset-manifest.json");
  const hasStoryboard = await access(storyboardPath).then(() => true).catch(() => false);
  const hasAssetManifest = await access(assetManifestPath).then(() => true).catch(() => false);
  if (hasAssetManifest && !hasStoryboard) {
    throw new Error("Narrated footage asset manifest requires production/production-plan.json.");
  }
  const footageClips = hasStoryboard && hasAssetManifest
    ? buildNarratedFootageTimeline(
        JSON.parse(await readFile(assetManifestPath, "utf8")) as unknown,
        JSON.parse(await readFile(storyboardPath, "utf8")) as unknown,
        metadata.composition.fps,
      ).map(({ shotId: _shotId, ...clip }) => clip)
    : [];
  for (const clip of footageClips) {
    await access(resolve(projectDirectory, clip.src));
  }

  const customProps = {
    title: metadata.title,
    durationInFrames,
    narrationAudioSrc: "assets/audio/narration.wav",
    musicAudioSrc: "assets/audio/score.wav",
    transitionAudioSrc: "assets/audio/transition-whoosh.wav",
    subtitleCues,
    ...(footageClips.length > 0 ? { footageClips } : {}),
  };
  const outputPath = resolve(projectDirectory, ".narrated-project.json");
  await writeFile(outputPath, JSON.stringify(customProps, null, 2) + "\n", "utf8");
  console.log(`Applied generated voice-over and ${subtitleCues.length} timed caption cues to NarratedSkyExplainer.`);
  console.log(`Added ${footageClips.length} storyboard-matched footage clips.`);
  console.log(`Custom composition props: ${outputPath}`);
  process.exit(0);
}

if (compositionId !== "ProjectVideo") {
  throw new Error("Generated narration is supported only for ProjectVideo and NarratedSkyExplainer.");
}

const narrationAsset = resolve(projectDirectory, "assets/audio/narration.wav");
await access(narrationAsset);
const originalProject = project as VideoProject;
const fps = originalProject.composition.fps;
const originalDurationInFrames = getProjectDurationInFrames(originalProject);
const narrationDurationInFrames = Math.ceil(alignment.durationSeconds! * fps);
// Keep a short visual/music landing after the final spoken word, then retime
// every scene and its internal events together instead of leaving a long
// un-narrated visual tail.
const visualTailFrames = Math.round(fps * 0.4);
const targetDurationInFrames = narrationDurationInFrames + visualTailFrames;
const videoProject = retimeProjectToDuration(originalProject, targetDurationInFrames);
const projectDurationInFrames = getProjectDurationInFrames(videoProject);
const storyboardPath = resolve(projectDirectory, "production/production-plan.json");
const assetManifestPath = resolve(projectDirectory, "production/asset-manifest.json");
const hasStoryboard = await access(storyboardPath).then(() => true).catch(() => false);
const hasAssetManifest = await access(assetManifestPath).then(() => true).catch(() => false);
if (hasStoryboard !== hasAssetManifest) {
  throw new Error("Narrated ProjectVideo footage requires both production/production-plan.json and production/asset-manifest.json.");
}
let footageProject = videoProject;
let appliedFootageCount = 0;
if (hasStoryboard && hasAssetManifest) {
  const plan = JSON.parse(await readFile(storyboardPath, "utf8")) as unknown;
  const manifest = JSON.parse(await readFile(assetManifestPath, "utf8")) as unknown;
  footageProject = applyNarratedFootageToProject(videoProject, manifest, plan);
  const footageLayers = footageProject.scenes.flatMap((scene) => scene.mediaLayers ?? [])
    .filter((layer) => layer.type === "video");
  await Promise.all(footageLayers.map((layer) => access(resolve(projectDirectory, layer.src))));
  appliedFootageCount = footageLayers.length;
}
console.log(`Applied ${appliedFootageCount} storyboard-matched full-frame footage clips.`);
console.log(
  `Retimed storyboard from ${(originalDurationInFrames / fps).toFixed(2)}s to ${(projectDurationInFrames / fps).toFixed(2)}s ` +
  `to follow the ${alignment.durationSeconds!.toFixed(2)}s narration, with a ${(visualTailFrames / fps).toFixed(2)}s visual landing.`
);

const existingTracks = footageProject.audioTracks ?? [];
if (existingTracks.some((track) => track.role === "voiceover")) {
  throw new Error("This project already has a voiceover track. Remove it before adding generated narration.");
}
const voiceTrackId = "generated-narration";
const voiceTrack: AudioTrack = {
  id: voiceTrackId,
  role: "voiceover",
  src: "assets/audio/narration.wav",
  startInFrames: 0,
  durationInFrames: narrationDurationInFrames,
  volume: 1,
  preservePitch: true,
  loop: false,
};
const audioTracks: AudioTrack[] = [
  ...existingTracks.map((track) => track.role === "music"
    ? {
        ...track,
        ducking: {
          ...(track.ducking ?? {}),
          sidechainTrackIds: [...new Set([...(track.ducking?.sidechainTrackIds ?? []), voiceTrackId])],
          thresholdDb: track.ducking?.thresholdDb ?? -28,
          ratio: track.ducking?.ratio ?? 7,
          attackMs: track.ducking?.attackMs ?? 20,
          releaseMs: track.ducking?.releaseMs ?? 280,
        },
      }
    : track),
  voiceTrack,
];

const subtitleOptions: NarrationSubtitleOptions = {
  ...(config.subtitle ?? {}),
  ...(config.speaker ? { speaker: config.speaker } : {}),
};
const generatedSubtitles = buildNarrationSubtitles(
  alignment.words,
  fps,
  projectDurationInFrames,
  subtitleOptions,
);
const existingSubtitleIds = new Set((videoProject.subtitles ?? []).map((cue) => cue.id));
for (const cue of generatedSubtitles) {
  if (existingSubtitleIds.has(cue.id)) {
    throw new Error(`Generated subtitle ID conflicts with an existing cue: ${cue.id}`);
  }
}

const narratedProject: VideoProject = {
  ...footageProject,
  audioTracks,
  subtitles: [...(footageProject.subtitles ?? []), ...generatedSubtitles],
};
const validationErrors = validateProjectDefinition(narratedProject);
if (validationErrors.length > 0) {
  throw new Error("Generated narrated project failed validation:\n" + validationErrors.join("\n"));
}

const outputPath = resolve(projectDirectory, ".narrated-project.json");
await writeFile(outputPath, JSON.stringify(narratedProject, null, 2) + "\n", "utf8");
console.log(`Applied generated voice-over and ${generatedSubtitles.length} timed caption cues.`);
console.log(`Narrated project: ${outputPath}`);
