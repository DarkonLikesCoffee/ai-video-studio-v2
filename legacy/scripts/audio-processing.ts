import type { AudioTrack } from "../packages/video-engine/src/project";

export const buildAudioInputArgs = (track: Pick<AudioTrack, "src" | "loop">): string[] => [
  ...(track.loop ? ["-stream_loop", "-1"] : []),
  "-i",
  track.src,
];

export const buildMainAudioFilter = (durationSeconds: number, loop: boolean): string => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Audio track duration must be a positive finite number.");
  }
  const filters = ["aresample=48000"];
  if (loop) filters.push(`atrim=duration=${durationSeconds.toFixed(5)}`);
  filters.push("aformat=sample_fmts=fltp:channel_layouts=stereo");
  return `[0:a]${filters.join(",")}[main0]`;
};

export const buildSidechainTailFilter = (durationSeconds: number): string[] => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Sidechain duration must be a positive finite number.");
  }
  return [
    `apad=whole_dur=${durationSeconds.toFixed(5)}`,
    `atrim=duration=${durationSeconds.toFixed(5)}`,
  ];
};
