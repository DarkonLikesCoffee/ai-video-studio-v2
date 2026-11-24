import { spawnSync } from "node:child_process";

export const ffmpegPath = process.env.FFMPEG_PATH ?? "ffmpeg";
export const ffprobePath = process.env.FFPROBE_PATH ?? "ffprobe";

export const mediaToolsAvailable =
  spawnSync(ffmpegPath, ["-version"], { stdio: "ignore" }).status === 0 &&
  spawnSync(ffprobePath, ["-version"], { stdio: "ignore" }).status === 0;

export const mediaToolsRequired = process.env.MEDIA_QA_INTEGRATION_REQUIRED === "1";

export const shouldSkipMediaIntegration = (available: boolean, required: boolean): boolean =>
  !available && !required;

export const skipMediaIntegration = shouldSkipMediaIntegration(mediaToolsAvailable, mediaToolsRequired);

export const assertMediaToolsAvailable = (): void => {
  if (!mediaToolsAvailable) {
    throw new Error(
      "Media QA integration tests require FFmpeg and FFprobe. " +
        "Install both tools or unset MEDIA_QA_INTEGRATION_REQUIRED when running locally.",
    );
  }
};
