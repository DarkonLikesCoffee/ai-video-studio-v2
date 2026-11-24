import test from "node:test";
import assert from "node:assert/strict";
import { buildMediaQaReport, buildMediaQaAudioFilter } from "../scripts/media-qa";

const probe = {
  format: { duration: "60.1", size: "7000000", bit_rate: "900000", format_name: "mov,mp4" },
  streams: [
    { index: 0, codec_type: "video", codec_name: "h264", width: 1920, height: 1080, avg_frame_rate: "30/1", duration: "60.1", start_time: "0.000000" },
    { index: 1, codec_type: "audio", codec_name: "aac", sample_rate: "48000", channels: 2, duration: "60.1", start_time: "0.000000" },
  ],
};

test("media QA reports metadata and clean audio/video", () => {
  const report = buildMediaQaReport("clean.mp4", probe, "", "");
  assert.equal(report.passed, true);
  assert.equal(report.video?.fps, 30);
  assert.equal(report.audio?.sampleRate, 48000);
  assert.equal(report.measurements.audioVideoStartOffsetSeconds, 0);
  assert.equal(report.findings.length, 0);
});

test("media QA detects long digital silence intervals with timestamps", () => {
  const report = buildMediaQaReport(
    "gapped.mp4",
    probe,
    "[silencedetect] silence_start: 46.850\n[silencedetect] silence_end: 50.070 | silence_duration: 3.220\n",
    "",
  );
  assert.equal(report.passed, true);
  assert.deepEqual(report.measurements.silenceIntervals, [
    { startSeconds: 46.85, endSeconds: 50.07, durationSeconds: 3.22 },
  ]);
  assert.equal(report.findings[0]?.code, "silence");
  assert.equal(report.findings[0]?.severity, "warning");
});

test("media QA keeps short silence as a warning but rejects excessive A/V duration drift", () => {
  const shortSilence = buildMediaQaReport(
    "brief-pause.mp4",
    probe,
    "[silencedetect] silence_start: 4.0\n[silencedetect] silence_end: 5.0 | silence_duration: 1.0",
    "",
  );
  assert.equal(shortSilence.passed, true);
  assert.equal(shortSilence.findings[0]?.severity, "warning");

  const mismatchedProbe = {
    ...probe,
    streams: [
      probe.streams[0]!,
      { ...probe.streams[1]!, duration: "58.9" },
    ],
  };
  const mismatch = buildMediaQaReport("mismatch.mp4", mismatchedProbe, "", "");
  assert.equal(mismatch.passed, false);
  assert.ok(Math.abs((mismatch.measurements.audioVideoDurationDriftSeconds ?? 0) - 1.2) < 0.001);
  assert.ok(mismatch.findings.some((finding) => finding.code === "audio-video-duration-mismatch"));
});

test("media QA detects late audio starts even when stream durations match", () => {
  const offsetProbe = {
    ...probe,
    streams: [
      { ...probe.streams[0]!, start_time: "1.250" },
      { ...probe.streams[1]!, start_time: "1.900" },
    ],
  };
  const report = buildMediaQaReport("late-audio.mp4", offsetProbe, "", "");
  assert.equal(report.measurements.audioVideoStartOffsetSeconds, 0.65);
  assert.equal(report.measurements.audioVideoDurationDriftSeconds, 0);
  assert.equal(report.passed, false);
  assert.ok(report.findings.some((finding) =>
    finding.code === "audio-video-start-offset" && finding.message.includes("after video"),
  ));
});

test("media QA detects audio that starts before video and honors the offset threshold", () => {
  const earlyAudioProbe = {
    ...probe,
    streams: [
      { ...probe.streams[0]!, start_time: "2.000" },
      { ...probe.streams[1]!, start_time: "1.400" },
    ],
  };
  const tooEarly = buildMediaQaReport("early-audio.mp4", earlyAudioProbe, "", "");
  assert.equal(tooEarly.measurements.audioVideoStartOffsetSeconds, -0.6);
  assert.equal(tooEarly.passed, false);
  assert.ok(tooEarly.findings.some((finding) =>
    finding.code === "audio-video-start-offset" && finding.message.includes("before video"),
  ));

  const accepted = buildMediaQaReport("allowed-offset.mp4", earlyAudioProbe, "", "", {
    maxAudioVideoStartOffsetSeconds: 0.65,
  });
  assert.equal(accepted.passed, true);
  assert.equal(accepted.thresholds.maxAudioVideoStartOffsetSeconds, 0.65);
});

test("media QA skips start-offset checks when ffprobe does not report both stream starts", () => {
  const missingStartProbe = {
    ...probe,
    streams: [
      { ...probe.streams[0]!, start_time: undefined },
      { ...probe.streams[1]!, start_time: "0.200" },
    ],
  };
  const report = buildMediaQaReport("missing-start-times.mp4", missingStartProbe, "", "");
  assert.equal(report.measurements.audioVideoStartOffsetSeconds, undefined);
  assert.equal(report.passed, true);
  assert.ok(!report.findings.some((finding) => finding.code === "audio-video-start-offset"));
});

test("media QA detects frozen video and black intervals", () => {
  const report = buildMediaQaReport(
    "bad-video.mp4",
    probe,
    "",
    "[freezedetect] freeze_start: 12.0\n[freezedetect] freeze_end: 15.0 | freeze_duration: 3.0\n[blackdetect] black_start:20.000 black_end:22.500 black_duration:2.500\n",
  );
  assert.equal(report.measurements.frozenIntervals[0]?.durationSeconds, 3);
  assert.equal(report.measurements.blackIntervals[0]?.durationSeconds, 2.5);
  assert.deepEqual(report.findings.map(f => f.code), ["frozen-video", "black-video"]);
  assert.equal(report.findings.find(f => f.code === "frozen-video")?.severity, "warning");
  assert.equal(report.findings.find(f => f.code === "black-video")?.severity, "error");
  assert.equal(report.passed, false, "only the independent black-video error should fail QA");
});

test("media QA fails when video or audio stream is missing", () => {
  const report = buildMediaQaReport("silent.mp4", { ...probe, streams: [probe.streams[0]!] }, "", "");
  assert.equal(report.passed, true);
  assert.ok(report.findings.some(f => f.code === "missing-audio-stream" && f.severity === "info"));
});


test("media QA reports true peak and warns above -1 dBFS without failing", () => {
  const report = buildMediaQaReport("near-peak.mp4", probe, "Integrated loudness: -16.0 LUFS\nTrue peak: -0.5 dBFS\n", "");
  assert.equal(report.measurements.truePeakDbfs, -0.5);
  assert.equal(report.passed, true);
  assert.ok(report.findings.some(f => f.code === "true-peak-near-limit" && f.severity === "warning"));
});

test("media QA fails true peak above 0 dBFS ceiling", () => {
  const report = buildMediaQaReport("clipped.mp4", probe, "Integrated loudness: -15.0 LUFS\nTrue peak: 0.3 dBFS\n", "");
  assert.equal(report.measurements.truePeakDbfs, 0.3);
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(f => f.code === "true-peak-over-limit" && f.severity === "error"));
});

test("media QA parses FFmpeg EBU R128 true peak summary format", () => {
  const report = buildMediaQaReport(
    "ebu-summary.mp4",
    probe,
    "Integrated loudness:\n  I: -16.0 LUFS\n\nTrue peak:\n  Peak: -1.5 dBFS\n",
    "",
  );
  assert.equal(report.measurements.truePeakDbfs, -1.5);
  assert.equal(report.passed, true);
  assert.equal(report.findings.length, 0);
});

test("media QA enables true-peak measurement and keeps silence thresholds configurable", () => {
  assert.match(buildMediaQaAudioFilter(), /ebur128=peak=true:framelog=verbose/);
  assert.match(buildMediaQaAudioFilter(), /silencedetect=noise=-50dB:d=0.75/);
  assert.equal(
    buildMediaQaAudioFilter({ silenceNoiseDb: -42, silenceMinDurationSeconds: 0.5 }),
    "silencedetect=noise=-42dB:d=0.5,ebur128=peak=true:framelog=verbose",
  );
});

test("media QA accepts true peak at or below recommended ceiling", () => {
  const report = buildMediaQaReport("safe-peak.mp4", probe, "True peak: -1.2 dBFS\n", "");
  assert.equal(report.measurements.truePeakDbfs, -1.2);
  assert.equal(report.passed, true);
  assert.equal(report.findings.length, 0);
});


test("media QA detects trailing silence that has no silence_end at EOF", () => {
  const report = buildMediaQaReport(
    "trailing-silence.mp4",
    probe,
    "[silencedetect] silence_start: 55.0\n",
    "",
  );
  assert.deepEqual(report.measurements.silenceIntervals, [
    { startSeconds: 55, endSeconds: 60.1, durationSeconds: 5.1 },
  ]);
  assert.equal(report.passed, true);
  assert.ok(report.findings.some(f => f.code === "silence" && f.severity === "warning"));
});

test("media QA closes short trailing silence at EOF and skips zero-length trailing intervals", () => {
  const short = buildMediaQaReport("short-trailing.mp4", probe, "silence_start: 58.2\n", "");
  assert.deepEqual(short.measurements.silenceIntervals, [
    { startSeconds: 58.2, endSeconds: 60.1, durationSeconds: 1.9 },
  ]);
  assert.equal(short.passed, true);
  const zeroLength = buildMediaQaReport("zero-trailing.mp4", probe, "silence_start: 60.1\n", "");
  assert.deepEqual(zeroLength.measurements.silenceIntervals, []);
});


test("media QA enforces planned delivery duration with configurable tolerance", () => {
  const withinTolerance = buildMediaQaReport("on-time.mp4", probe, "", "", {
    expectedDurationSeconds: 60,
  });
  assert.equal(withinTolerance.passed, true);
  assert.equal(withinTolerance.thresholds.expectedDurationSeconds, 60);
  assert.equal(withinTolerance.thresholds.maxExpectedDurationDriftSeconds, 0.75);

  const drift = buildMediaQaReport("short-render.mp4", {
    ...probe,
    format: { ...probe.format, duration: "47.899" },
    streams: [
      { ...probe.streams[0]!, duration: "47.7" },
      { ...probe.streams[1]!, duration: "47.899" },
    ],
  }, "", "", { expectedDurationSeconds: 60 });
  assert.equal(drift.passed, false);
  assert.ok(drift.findings.some((finding) =>
    finding.code === "expected-duration-mismatch" &&
    finding.message.includes("47.90s") &&
    finding.message.includes("60.00s"),
  ));

  const relaxed = buildMediaQaReport("accepted-short-render.mp4", {
    ...probe,
    format: { ...probe.format, duration: "59.4" },
  }, "", "", { expectedDurationSeconds: 60, maxExpectedDurationDriftSeconds: 0.75 });
  assert.equal(relaxed.passed, true);
  assert.ok(!relaxed.findings.some((finding) => finding.code === "expected-duration-mismatch"));
});


test("required audio mode blocks missing audio while optional and silent modes do not", () => {
  const videoOnlyProbe = { ...probe, streams: [probe.streams[0]!] };
  const required = buildMediaQaReport("required-audio.mp4", videoOnlyProbe, "", "", { audioMode: "required" });
  assert.equal(required.audioMode, "required");
  assert.equal(required.passed, false);
  assert.ok(required.findings.some(f => f.code === "missing-audio-stream" && f.severity === "error"));

  const optional = buildMediaQaReport("optional-audio.mp4", videoOnlyProbe, "", "", { audioMode: "optional" });
  assert.equal(optional.passed, true);
  assert.ok(optional.findings.some(f => f.code === "missing-audio-stream" && f.severity === "info"));

  const silent = buildMediaQaReport("silent-audio.mp4", videoOnlyProbe, "[silencedetect] silence_start: 1.0\\n[silencedetect] silence_end: 4.0", "", { audioMode: "silent" });
  assert.equal(silent.passed, true);
  assert.deepEqual(silent.measurements.silenceIntervals, []);
  assert.ok(silent.findings.some(f => f.code === "missing-audio-stream" && f.severity === "info"));
});

test("silent audio mode warns if an audio stream is present unexpectedly", () => {
  const report = buildMediaQaReport("unexpected-audio.mp4", probe, "", "", { audioMode: "silent" });
  assert.equal(report.passed, true);
  assert.ok(report.findings.some(f => f.code === "unexpected-audio-stream" && f.severity === "warning"));
});
