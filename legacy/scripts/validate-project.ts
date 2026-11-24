import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { isRemoteMediaUrl, validateProjectDefinition } from "../packages/video-engine/src/project";

const input = process.argv[2];
if (!input) {
  console.error("Usage: tsx scripts/validate-project.ts <project.json>");
  process.exit(2);
}

const projectPath = resolve(input);
let project: unknown;
try {
  project = JSON.parse(await readFile(projectPath, "utf8")) as unknown;
} catch (error) {
  console.error("Could not parse project JSON:", error);
  process.exit(1);
}

const errors = validateProjectDefinition(project);
if (errors.length > 0) {
  console.error("Project validation failed:\n" + errors.map((error) => "- " + error).join("\n"));
  process.exit(1);
}

const metadata = project as {
  title: string;
  composition: { id: string; durationInFrames?: number };
  scenes?: Array<{
    durationInFrames: number;
    media?: { src: string };
    mediaLayers?: Array<{ src: string }>;
  }>;
  audioTracks?: Array<{ id: string; src: string }>;
};
const durationInFrames = metadata.composition.id === "ProjectVideo"
  ? metadata.scenes?.reduce((total, scene) => total + scene.durationInFrames, 0) ?? 0
  : metadata.composition.durationInFrames ?? 0;

if (metadata.composition.id === "ProjectVideo") {
  const projectDirectory = await realpath(dirname(projectPath));
  const localAssets: Array<{ label: string; src: string }> = [];

  for (const [sceneIndex, scene] of (metadata.scenes ?? []).entries()) {
    const mediaItems = scene.mediaLayers ?? (scene.media ? [scene.media] : []);
    for (const [layerIndex, media] of mediaItems.entries()) {
      if (typeof media.src === "string") {
        const label = scene.mediaLayers
          ? `scenes[${sceneIndex}].mediaLayers[${layerIndex}].src`
          : `scenes[${sceneIndex}].media.src`;
        localAssets.push({ label, src: media.src });
      }
    }
  }

  for (const [index, track] of (metadata.audioTracks ?? []).entries()) {
    if (typeof track.src === "string") {
      localAssets.push({ label: `audioTracks[${index}].src`, src: track.src });
    }
  }

  for (const asset of localAssets) {
    if (isRemoteMediaUrl(asset.src)) continue;

    try {
      const assetPath = await realpath(resolve(projectDirectory, asset.src));
      const relativePath = relative(projectDirectory, assetPath);
      if (relativePath === ".." || relativePath.startsWith(".." + sep) || isAbsolute(relativePath)) {
        throw new Error("asset resolves outside the project directory");
      }
      const assetInfo = await stat(assetPath);
      if (!assetInfo.isFile()) throw new Error("asset is not a file");
    } catch (error) {
      console.error(`Project asset validation failed for ${asset.label} (${asset.src}):`, error);
      process.exit(1);
    }
  }
}

const sceneCount = metadata.scenes?.length ?? 1;
const audioTrackCount = metadata.audioTracks?.length ?? 0;
console.log(
  `Valid project: ${metadata.title} — ${sceneCount} scenes, ${durationInFrames} frames, ${audioTrackCount} audio tracks`
);
