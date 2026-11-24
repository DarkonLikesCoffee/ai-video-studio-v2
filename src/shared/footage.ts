import type { VideoProject } from "../compositions/project-video/project";

export type NarratedFootageShot = {
  id: string;
  startSeconds: number;
  durationSeconds: number;
};

export type NarratedFootageAsset = {
  file: string;
  license?: string;
  /** Rights basis for footage supplied by the project owner rather than a public-license source. */
  rightsBasis?: "user-owned" | "permission-granted";
  /** Human-readable confirmation of ownership or permission. Required for user-supplied footage. */
  rightsNote?: string;
  shotIds: string[];
  trimBeforeSecondsByShotId?: Record<string, number>;
};

export type NarratedFootageTimelineClip = {
  id: string;
  shotId: string;
  src: string;
  startInFrames: number;
  durationInFrames: number;
  trimBefore?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSafeFootageFilename = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(?:mp4|webm|mov|ogv)$/i.test(value);

const isAllowedFootageLicense = (value: unknown): boolean =>
  typeof value === "string" &&
  /^(?:CC0(?:\s+1\.0)?|Public domain|PD-[A-Za-z0-9-]+|CC BY [234]\.0)$/i.test(value.trim());

const hasExplicitUserRights = (value: Record<string, unknown>): boolean =>
  (value.rightsBasis === "user-owned" || value.rightsBasis === "permission-granted") &&
  typeof value.rightsNote === "string" && value.rightsNote.trim().length >= 8;

/**
 * Resolve reviewed local footage assets onto matching storyboard shots.
 * Multiple assets assigned to a shot are placed sequentially across that shot.
 */
export const buildNarratedFootageTimeline = (
  manifestValue: unknown,
  planValue: unknown,
  fps: number,
): NarratedFootageTimelineClip[] => {
  if (!Number.isInteger(fps) || fps < 1 || fps > 120) {
    throw new Error("Narrated footage fps must be an integer between 1 and 120.");
  }
  if (!isRecord(manifestValue) || !Array.isArray(manifestValue.assets)) {
    throw new Error("Narrated footage manifest must contain an assets array.");
  }
  if (!isRecord(planValue) || !Array.isArray(planValue.shots)) {
    throw new Error("Narrated footage plan must contain a shots array.");
  }

  const shots = new Map<string, NarratedFootageShot>();
  for (const value of planValue.shots) {
    if (!isRecord(value) || typeof value.id !== "string" ||
        typeof value.startSeconds !== "number" || !Number.isFinite(value.startSeconds) ||
        typeof value.durationSeconds !== "number" || !Number.isFinite(value.durationSeconds) ||
        value.startSeconds < 0 || value.durationSeconds <= 0) {
      continue;
    }
    shots.set(value.id, {
      id: value.id,
      startSeconds: value.startSeconds,
      durationSeconds: value.durationSeconds,
    });
  }

  const assetsByShotId = new Map<string, Array<{ assetIndex: number; file: string; trimSeconds: number }>>();
  for (const [assetIndex, value] of manifestValue.assets.entries()) {
    if (!isRecord(value) || !isSafeFootageFilename(value.file) ||
        !(isAllowedFootageLicense(value.license) || hasExplicitUserRights(value)) ||
        !Array.isArray(value.shotIds)) {
      continue;
    }
    for (const shotId of value.shotIds) {
      if (typeof shotId !== "string" || !shots.has(shotId)) continue;
      const trimSeconds = isRecord(value.trimBeforeSecondsByShotId)
        ? value.trimBeforeSecondsByShotId[shotId]
        : 0;
      if (typeof trimSeconds !== "number" || !Number.isFinite(trimSeconds) || trimSeconds < 0) continue;
      const assets = assetsByShotId.get(shotId) ?? [];
      assets.push({ assetIndex, file: value.file, trimSeconds });
      assetsByShotId.set(shotId, assets);
    }
  }

  const clips: NarratedFootageTimelineClip[] = [];
  for (const [shotId, assets] of assetsByShotId) {
    const shot = shots.get(shotId);
    if (!shot || assets.length === 0) continue;
    const shotStartInFrames = Math.round(shot.startSeconds * fps);
    const shotDurationInFrames = Math.round(shot.durationSeconds * fps);
    if (shotDurationInFrames < assets.length) continue;

    // Multiple manifest assets assigned to one shot are intentional edit cuts.
    // Divide the storyboard window evenly so every selected source gets screen time.
    assets.forEach((asset, clipIndex) => {
      const startOffset = Math.floor(clipIndex * shotDurationInFrames / assets.length);
      const endOffset = Math.floor((clipIndex + 1) * shotDurationInFrames / assets.length);
      const durationInFrames = endOffset - startOffset;
      const trimBefore = Math.round(asset.trimSeconds * fps);
      if (durationInFrames < 1) return;
      clips.push({
        id: "footage-" + shot.id + "-" + asset.assetIndex,
        shotId: shot.id,
        src: "assets/" + asset.file,
        startInFrames: shotStartInFrames + startOffset,
        durationInFrames,
        ...(trimBefore > 0 ? { trimBefore } : {}),
      });
    });
  }
  return clips.sort((a, b) => a.startInFrames - b.startInFrames);
};

/**
 * Put approved footage behind each matching ProjectVideo scene's existing
 * vector overlays and typography. The scene's legacy SVG media is replaced,
 * because it is an opaque full-frame illustration rather than a transparent
 * overlay. Unmatched scenes remain unchanged.
 */
export const applyNarratedFootageToProject = (
  project: VideoProject,
  manifestValue: unknown,
  planValue: unknown,
): VideoProject => {
  const clips = buildNarratedFootageTimeline(
    manifestValue,
    planValue,
    project.composition.fps,
  );
  const clipsByShotId = new Map<string, NarratedFootageTimelineClip[]>();
  const shotsStartSeconds = new Map<string, number>();
  const shotsDurationFrames = new Map<string, number>();
  if (isRecord(planValue) && Array.isArray(planValue.shots)) {
    for (const shot of planValue.shots) {
      if (isRecord(shot) && typeof shot.id === "string" && typeof shot.startSeconds === "number") {
        shotsStartSeconds.set(shot.id, shot.startSeconds);
        if (typeof shot.durationSeconds === "number" && Number.isFinite(shot.durationSeconds) && shot.durationSeconds > 0) {
          shotsDurationFrames.set(shot.id, Math.round(shot.durationSeconds * project.composition.fps));
        }
      }
    }
  }
  for (const clip of clips) {
    const shotClips = clipsByShotId.get(clip.shotId) ?? [];
    shotClips.push(clip);
    clipsByShotId.set(clip.shotId, shotClips);
  }
  return {
    ...project,
    scenes: project.scenes.map((scene) => {
      const shotClips = clipsByShotId.get(scene.id);
      if (!shotClips?.length) return scene;
      const { media: _legacyMedia, ...sceneWithoutLegacyMedia } = scene;
      const shotStartInFrames = Math.round((shotsStartSeconds.get(scene.id) ?? 0) * project.composition.fps);
      const originalShotDurationInFrames = shotsDurationFrames.get(scene.id) ?? scene.durationInFrames;
      const scale = originalShotDurationInFrames > 0 ? scene.durationInFrames / originalShotDurationInFrames : 1;
      const mediaLayers = shotClips.map((clip, index) => {
        const scaledStart = Math.round((clip.startInFrames - shotStartInFrames) * scale);
        const startInFrames = Math.min(scene.durationInFrames - 1, Math.max(0, scaledStart));
        const scaledDuration = Math.max(1, Math.round(clip.durationInFrames * scale));
        // Rounding after retiming can push a layer one or two frames past the
        // scene boundary. Clamp the visible window to the actual scene timeline.
        const durationInFrames = Math.min(scaledDuration, scene.durationInFrames - startInFrames);
        return {
          id: clip.id,
          type: "video" as const,
          src: clip.src,
          placement: "background" as const,
          fit: "cover" as const,
          opacity: 0.82,
          muted: true,
          zIndex: index,
          startInFrames,
          durationInFrames,
          ...(clip.trimBefore === undefined ? {} : { trimBefore: clip.trimBefore }),
        };
      });
      return {
        ...sceneWithoutLegacyMedia,
        mediaLayers,
      };
    }),
  };
};
