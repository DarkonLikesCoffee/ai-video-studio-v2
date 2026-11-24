import { spawn } from "node:child_process";

export type AudioMode = "required" | "optional" | "silent";

export type MediaQaOptions = {
  audioMode?: AudioMode;
  ffmpegPath?: string;
  ffprobePath?: string;
  silenceNoiseDb?: number;
  silenceMinDurationSeconds?: number;
  freezeNoiseDb?: number;
  freezeMinDurationSeconds?: number;
  blackPixelThreshold?: number;
  blackMinDurationSeconds?: number;
  maxSilenceDurationSeconds?: number;
  maxFreezeDurationSeconds?: number;
  maxBlackDurationSeconds?: number;
  maxAudioVideoDriftSeconds?: number;
  maxAudioVideoStartOffsetSeconds?: number;
  expectedDurationSeconds?: number;
  maxExpectedDurationDriftSeconds?: number;
  maxTruePeakDbfs?: number;
  warningTruePeakDbfs?: number;
};

export type MediaStream = {
  index: number;
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  sample_rate?: string;
  channels?: number;
  duration?: string;
  start_time?: string;
  avg_frame_rate?: string;
  r_frame_rate?: string;
};

export type MediaQaReport = {
  schemaVersion: 1;
  audioMode: AudioMode;
  file: string;
  passed: boolean;
  thresholds: {
    silenceNoiseDb: number;
    silenceMinDurationSeconds: number;
    freezeNoiseDb: number;
    freezeMinDurationSeconds: number;
    blackPixelThreshold: number;
    blackMinDurationSeconds: number;
    maxSilenceDurationSeconds: number;
    maxFreezeDurationSeconds: number;
    maxBlackDurationSeconds: number;
    maxAudioVideoDriftSeconds: number;
    maxAudioVideoStartOffsetSeconds: number;
    expectedDurationSeconds?: number;
    maxExpectedDurationDriftSeconds: number;
    maxTruePeakDbfs: number;
    warningTruePeakDbfs: number;
  };
  format: {
    durationSeconds: number;
    sizeBytes: number;
    bitRate?: number;
    formatName?: string;
  };
  streams: MediaStream[];
  video?: {
    codec: string;
    width: number;
    height: number;
    fps: number;
    frameCount?: number;
  };
  audio?: {
    codec: string;
    sampleRate: number;
    channels: number;
    durationSeconds?: number;
  };
  findings: Array<{
    severity: "error" | "warning" | "info";
    code: string;
    message: string;
    startSeconds?: number;
    endSeconds?: number;
    durationSeconds?: number;
  }>;
  measurements: {
    silenceIntervals: Array<{ startSeconds: number; endSeconds: number; durationSeconds: number }>;
    frozenIntervals: Array<{ startSeconds: number; endSeconds: number; durationSeconds: number }>;
    blackIntervals: Array<{ startSeconds: number; endSeconds: number; durationSeconds: number }>;
    loudnessSummary?: string;
    audioVideoDurationDriftSeconds?: number;
    audioVideoStartOffsetSeconds?: number;
    truePeakDbfs?: number;
  };
};

const defaults: Required<MediaQaOptions> = {
  audioMode: "optional",
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  ffprobePath: process.env.FFPROBE_PATH || "ffprobe",
  silenceNoiseDb: -50,
  silenceMinDurationSeconds: 0.75,
  freezeNoiseDb: -60,
  freezeMinDurationSeconds: 1.5,
  blackPixelThreshold: 0.02,
  blackMinDurationSeconds: 0.5,
  maxSilenceDurationSeconds: 2,
  maxFreezeDurationSeconds: 2.5,
  maxBlackDurationSeconds: 1,
  maxAudioVideoDriftSeconds: 0.5,
  maxAudioVideoStartOffsetSeconds: 0.5,
  expectedDurationSeconds: Number.NaN,
  maxExpectedDurationDriftSeconds: 0.75,
  maxTruePeakDbfs: 0,
  warningTruePeakDbfs: -1,
};

const run = (command: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", error => reject(new Error(`Could not start ${command}: ${error.message}`)));
    child.on("close", code => code === 0
      ? resolve(stdout + "\n" + stderr)
      : reject(new Error(`${command} exited with code ${code}:\n${stderr.slice(-12000)}`)));
  });

const parseIntervals = (
  output: string,
  expression: RegExp,
): Array<{ startSeconds: number; endSeconds: number; durationSeconds: number }> => {
  const intervals = [];
  for (const match of output.matchAll(expression)) {
    const startSeconds = Number(match[1]);
    const endSeconds = Number(match[2]);
    if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || endSeconds <= startSeconds) continue;
    intervals.push({
      startSeconds,
      endSeconds,
      durationSeconds: Number((endSeconds - startSeconds).toFixed(3)),
    });
  }
  return intervals;
};

const parseSilenceIntervals = (output: string, mediaDurationSeconds: number) => {
  const intervals = parseIntervals(
    output,
    /silence_start:\s*(-?[0-9.]+)[\s\S]*?silence_end:\s*([0-9.]+)/g,
  );
  const starts = [...output.matchAll(/silence_start:\s*(-?[0-9.]+)/g)];
  const ends = [...output.matchAll(/silence_end:\s*(-?[0-9.]+)/g)];
  const lastStart = starts.length ? Number(starts[starts.length - 1]![1]) : undefined;
  const lastEnd = ends.length ? Number(ends[ends.length - 1]![1]) : undefined;
  if (lastStart !== undefined && Number.isFinite(lastStart) &&
      Number.isFinite(mediaDurationSeconds) && mediaDurationSeconds > lastStart &&
      (lastEnd === undefined || lastStart > lastEnd)) {
    intervals.push({
      startSeconds: lastStart,
      endSeconds: mediaDurationSeconds,
      durationSeconds: Number((mediaDurationSeconds - lastStart).toFixed(3)),
    });
  }
  return intervals;
};

const fpsNumber = (value?: string): number => {
  if (!value) return 0;
  const [numeratorText, denominatorText] = value.split("/");
  const numerator = Number(numeratorText);
  const denominator = Number(denominatorText);
  if (!numeratorText || !denominatorText ||
      !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return 0;
  return numerator / denominator;
};

const streamStartSeconds = (stream?: MediaStream): number | undefined => {
  const value = stream?.start_time;
  if (value === undefined || value.trim() === "") return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? seconds : undefined;
};

export const buildMediaQaReport = (
  file: string,
  probe: { streams?: MediaStream[]; format?: Record<string, string | number> },
  audioLog: string,
  videoLog: string,
  options: MediaQaOptions = {},
): MediaQaReport => {
  const config = { ...defaults, ...options };
  const audioMode = options.audioMode ?? "optional";
  const streams = probe.streams ?? [];
  const format = probe.format ?? {};
  const durationSeconds = Number(format.duration ?? 0);
  const sizeBytes = Number(format.size ?? 0);
  const videoStream = streams.find(stream => stream.codec_type === "video");
  const audioStream = streams.find(stream => stream.codec_type === "audio");
  const silenceIntervals = audioMode === "silent" ? [] : parseSilenceIntervals(audioLog, durationSeconds);
  const frozenIntervals = parseIntervals(
    videoLog,
    /freeze_start:\s*([0-9.]+)[\s\S]*?freeze_end:\s*([0-9.]+)/g,
  );
  const blackIntervals = parseIntervals(
    videoLog,
    /black_start:\s*([0-9.]+)[\s\S]*?black_end:\s*([0-9.]+)/g,
  );

  const findings: MediaQaReport["findings"] = [];
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    findings.push({ severity: "error", code: "invalid-duration", message: "The file has no valid positive duration." });
  }
  if (Number.isFinite(config.expectedDurationSeconds) && config.expectedDurationSeconds > 0) {
    const drift = Math.abs(durationSeconds - config.expectedDurationSeconds);
    if (drift > config.maxExpectedDurationDriftSeconds) {
      findings.push({
        severity: "error",
        code: "expected-duration-mismatch",
        message: `Rendered duration ${durationSeconds.toFixed(2)}s differs from the planned ${config.expectedDurationSeconds.toFixed(2)}s by ${drift.toFixed(2)}s (maximum ${config.maxExpectedDurationDriftSeconds.toFixed(2)}s).`,
      });
    }
  }
  if (!videoStream) {
    findings.push({ severity: "error", code: "missing-video-stream", message: "The MP4 contains no video stream." });
  }
  if (!audioStream) {
    findings.push({
      severity: audioMode === "required" ? "error" : "info",
      code: "missing-audio-stream",
      message: audioMode === "required"
        ? "Audio is required by the project configuration, but the MP4 contains no audio stream."
        : audioMode === "silent"
          ? "No audio stream is present, as expected for a silent project."
          : "The project allows audio to be absent, and the MP4 contains no audio stream.",
    });
  } else if (audioMode === "silent") {
    findings.push({ severity: "warning", code: "unexpected-audio-stream", message: "The project is configured as silent, but the MP4 contains an audio stream." });
  }
  for (const interval of silenceIntervals) {
    const excessive = interval.durationSeconds > config.maxSilenceDurationSeconds;
    findings.push({
      severity: "warning",
      code: "silence",
      message: `Audio silence detected for ${interval.durationSeconds.toFixed(2)} seconds` +
        (excessive ? ` (maximum ${config.maxSilenceDurationSeconds.toFixed(2)}s).` : "."),
      ...interval,
    });
  }
  for (const interval of frozenIntervals) {
    const excessive = interval.durationSeconds > config.maxFreezeDurationSeconds;
    findings.push({
      severity: "warning",
      code: "frozen-video",
      message: `Video freeze detected for ${interval.durationSeconds.toFixed(2)} seconds` +
        (excessive ? ` (maximum ${config.maxFreezeDurationSeconds.toFixed(2)}s).` : "."),
      ...interval,
    });
  }
  for (const interval of blackIntervals) {
    const excessive = interval.durationSeconds > config.maxBlackDurationSeconds;
    findings.push({
      severity: excessive ? "error" : "warning",
      code: "black-video",
      message: `Black frame interval detected for ${interval.durationSeconds.toFixed(2)} seconds` +
        (excessive ? ` (maximum ${config.maxBlackDurationSeconds.toFixed(2)}s).` : "."),
      ...interval,
    });
  }

  const videoDuration = Number(videoStream?.duration ?? 0);
  const audioDuration = Number(audioStream?.duration ?? 0);
  const audioVideoDurationDriftSeconds = Number.isFinite(videoDuration) && videoDuration > 0 &&
    Number.isFinite(audioDuration) && audioDuration > 0
    ? Math.abs(videoDuration - audioDuration)
    : undefined;
  if (audioVideoDurationDriftSeconds !== undefined && audioVideoDurationDriftSeconds > config.maxAudioVideoDriftSeconds) {
    findings.push({
      severity: "error",
      code: "audio-video-duration-mismatch",
      message: `Audio/video duration differs by ${audioVideoDurationDriftSeconds.toFixed(2)} seconds (maximum ${config.maxAudioVideoDriftSeconds.toFixed(2)}s).`,
    });
  }

  const videoStartSeconds = streamStartSeconds(videoStream);
  const audioStartSeconds = streamStartSeconds(audioStream);
  const audioVideoStartOffsetSeconds = videoStartSeconds !== undefined && audioStartSeconds !== undefined
    ? Number((audioStartSeconds - videoStartSeconds).toFixed(3))
    : undefined;
  if (audioVideoStartOffsetSeconds !== undefined &&
      Math.abs(audioVideoStartOffsetSeconds) > config.maxAudioVideoStartOffsetSeconds) {
    const direction = audioVideoStartOffsetSeconds > 0 ? "after" : "before";
    findings.push({
      severity: "error",
      code: "audio-video-start-offset",
      message: `Audio starts ${Math.abs(audioVideoStartOffsetSeconds).toFixed(3)}s ${direction} video (maximum absolute offset ${config.maxAudioVideoStartOffsetSeconds.toFixed(3)}s).`,
    });
  }

  const loudnessSummary = audioLog.match(/Integrated loudness:\s*([^\n]+)/)?.[1]?.trim();
  const truePeakMatch = audioLog.match(/True peak:\s*(?:Peak:\s*)?(-?[0-9.]+)\s*dBFS/i);
  const truePeakDbfs = truePeakMatch ? Number(truePeakMatch[1]) : undefined;
  if (truePeakDbfs !== undefined && Number.isFinite(truePeakDbfs)) {
    if (truePeakDbfs > config.maxTruePeakDbfs) {
      findings.push({ severity: "error", code: "true-peak-over-limit", message: `True peak ${truePeakDbfs.toFixed(2)} dBFS exceeds the maximum ${config.maxTruePeakDbfs.toFixed(2)} dBFS.` });
    } else if (truePeakDbfs > config.warningTruePeakDbfs) {
      findings.push({ severity: "warning", code: "true-peak-near-limit", message: `True peak ${truePeakDbfs.toFixed(2)} dBFS is above the recommended warning threshold ${config.warningTruePeakDbfs.toFixed(2)} dBFS.` });
    }
  }
  const video = videoStream ? {
    codec: videoStream.codec_name ?? "unknown",
    width: Number(videoStream.width ?? 0),
    height: Number(videoStream.height ?? 0),
    fps: fpsNumber(videoStream.avg_frame_rate || videoStream.r_frame_rate),
    ...(Number.isFinite(Number(videoStream.duration)) && Number(videoStream.duration) > 0
      ? { frameCount: Math.round(Number(videoStream.duration) * fpsNumber(videoStream.avg_frame_rate || videoStream.r_frame_rate)) }
      : {}),
  } : undefined;
  const audio = audioStream ? {
    codec: audioStream.codec_name ?? "unknown",
    sampleRate: Number(audioStream.sample_rate ?? 0),
    channels: Number(audioStream.channels ?? 0),
    ...(Number.isFinite(Number(audioStream.duration)) && Number(audioStream.duration) > 0
      ? { durationSeconds: Number(audioStream.duration) }
      : {}),
  } : undefined;

  return {
    schemaVersion: 1,
    audioMode,
    file,
    passed: !findings.some(finding => finding.severity === "error"),
    thresholds: {
      silenceNoiseDb: config.silenceNoiseDb,
      silenceMinDurationSeconds: config.silenceMinDurationSeconds,
      freezeNoiseDb: config.freezeNoiseDb,
      freezeMinDurationSeconds: config.freezeMinDurationSeconds,
      blackPixelThreshold: config.blackPixelThreshold,
      blackMinDurationSeconds: config.blackMinDurationSeconds,
      maxSilenceDurationSeconds: config.maxSilenceDurationSeconds,
      maxFreezeDurationSeconds: config.maxFreezeDurationSeconds,
      maxBlackDurationSeconds: config.maxBlackDurationSeconds,
      maxAudioVideoDriftSeconds: config.maxAudioVideoDriftSeconds,
      maxAudioVideoStartOffsetSeconds: config.maxAudioVideoStartOffsetSeconds,
      ...(Number.isFinite(config.expectedDurationSeconds) ? { expectedDurationSeconds: config.expectedDurationSeconds } : {}),
      maxExpectedDurationDriftSeconds: config.maxExpectedDurationDriftSeconds,
      maxTruePeakDbfs: config.maxTruePeakDbfs,
      warningTruePeakDbfs: config.warningTruePeakDbfs,
    },
    format: {
      durationSeconds,
      sizeBytes,
      ...(Number.isFinite(Number(format.bit_rate)) ? { bitRate: Number(format.bit_rate) } : {}),
      ...(typeof format.format_name === "string" ? { formatName: format.format_name } : {}),
    },
    streams,
    ...(video ? { video } : {}),
    ...(audio ? { audio } : {}),
    findings,
    measurements: {
      silenceIntervals,
      frozenIntervals,
      blackIntervals,
      ...(loudnessSummary ? { loudnessSummary } : {}),
      ...(truePeakDbfs === undefined || !Number.isFinite(truePeakDbfs) ? {} : { truePeakDbfs }),
      ...(audioVideoDurationDriftSeconds === undefined ? {} : { audioVideoDurationDriftSeconds }),
      ...(audioVideoStartOffsetSeconds === undefined ? {} : { audioVideoStartOffsetSeconds }),
    },
  };
};

export const buildMediaQaAudioFilter = (options: MediaQaOptions = {}): string => {
  const config = { ...defaults, ...options };
  return `silencedetect=noise=${config.silenceNoiseDb}dB:d=${config.silenceMinDurationSeconds},ebur128=peak=true:framelog=verbose`;
};

export const inspectMedia = async (
  file: string,
  options: MediaQaOptions = {},
): Promise<MediaQaReport> => {
  const config = { ...defaults, ...options };
  const probeRaw = await run(config.ffprobePath, [
    "-v", "error", "-show_streams", "-show_format", "-of", "json", file,
  ]);
  const probe = JSON.parse(probeRaw) as { streams?: MediaStream[]; format?: Record<string, string | number> };
  const audioMode = options.audioMode ?? "optional";
  const hasAudio = audioMode !== "silent" && (probe.streams ?? []).some(stream => stream.codec_type === "audio");
  const hasVideo = (probe.streams ?? []).some(stream => stream.codec_type === "video");

  const audioLog = hasAudio ? await run(config.ffmpegPath, [
    "-hide_banner", "-nostats", "-i", file, "-map", "0:a:0", "-af",
    buildMediaQaAudioFilter(options),
    "-f", "null", "-",
  ]) : "";
  const videoLog = hasVideo ? await run(config.ffmpegPath, [
    "-hide_banner", "-nostats", "-i", file, "-map", "0:v:0", "-vf",
    `freezedetect=n=-${Math.abs(config.freezeNoiseDb)}dB:d=${config.freezeMinDurationSeconds},blackdetect=d=${config.blackMinDurationSeconds}:pix_th=${config.blackPixelThreshold}`,
    "-an", "-f", "null", "-",
  ]) : "";

  return buildMediaQaReport(file, probe, audioLog, videoLog, { ...options, audioMode });
};
