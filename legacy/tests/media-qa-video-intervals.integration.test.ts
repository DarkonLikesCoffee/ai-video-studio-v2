import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { inspectMedia } from "../scripts/media-qa";
import { assertMediaToolsAvailable, ffmpegPath, ffprobePath, skipMediaIntegration } from "./media-qa-integration-helpers";


const createSegmentedFixture = (
  directory: string,
  filename: string,
  middleColor: "blue" | "black",
  sideDurationSeconds: number,
  middleDurationSeconds: number,
): string => {
  const file = join(directory, filename);
  const totalDurationSeconds = sideDurationSeconds * 2 + middleDurationSeconds;
  const generated = spawnSync(ffmpegPath, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "lavfi", "-i", `testsrc=size=128x72:rate=30:duration=${sideDurationSeconds}`,
    "-f", "lavfi", "-i", `color=c=${middleColor}:s=128x72:r=30:d=${middleDurationSeconds}`,
    "-f", "lavfi", "-i", `testsrc=size=128x72:rate=30:duration=${sideDurationSeconds}`,
    "-f", "lavfi", "-i", `sine=frequency=440:sample_rate=48000:duration=${totalDurationSeconds}`,
    "-filter_complex", "[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]",
    "-map", "[v]", "-map", "3:a:0",
    "-c:v", "mpeg4", "-q:v", "5", "-c:a", "aac", "-b:a", "64k",
    file,
  ], { encoding: "utf8", timeout: 30_000 });

  assert.equal(
    generated.status,
    0,
    `Failed to generate ${middleColor} interval MP4 fixture: ${generated.stderr ?? generated.error?.message ?? "unknown error"}`,
  );
  return file;
};

const assertCleanSynchronization = (report: Awaited<ReturnType<typeof inspectMedia>>) => {
  assert.ok(
    report.measurements.audioVideoStartOffsetSeconds !== undefined &&
      Math.abs(report.measurements.audioVideoStartOffsetSeconds) < 0.05,
    "the fixture's audio and video should begin together",
  );
  assert.ok(
    report.measurements.audioVideoDurationDriftSeconds !== undefined &&
      report.measurements.audioVideoDurationDriftSeconds < 0.5,
    "the fixture should stay within the independent duration-drift threshold",
  );
  assert.deepEqual(report.measurements.silenceIntervals, [], "continuous fixture audio should not contain detected silence");
};

test("inspectMedia reports a short real-video freeze as a warning", {
  skip: skipMediaIntegration,
  timeout: 45_000,
}, async () => {
  assertMediaToolsAvailable();
  const directory = await mkdtemp(join(tmpdir(), "media-qa-freeze-warning-"));

  try {
    const file = createSegmentedFixture(directory, "freeze-warning.mp4", "blue", 1.5, 2.0);
    const report = await inspectMedia(file, { ffmpegPath, ffprobePath });
    const [interval] = report.measurements.frozenIntervals;

    assert.ok(interval, "the real MP4 should contain a detected frozen interval");
    assert.ok(interval.durationSeconds > 1.5 && interval.durationSeconds < 2.5);
    assert.deepEqual(report.findings.map(finding => finding.code), ["frozen-video"]);
    assert.equal(report.findings[0]?.severity, "warning");
    assert.equal(report.passed, true, "a freeze below the maximum threshold should remain a warning");
    assert.deepEqual(report.measurements.blackIntervals, [], "the blue hold should not be misreported as black video");
    assertCleanSynchronization(report);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("inspectMedia reports excessive real-video freeze informationally", {
  skip: skipMediaIntegration,
  timeout: 45_000,
}, async () => {
  assertMediaToolsAvailable();
  const directory = await mkdtemp(join(tmpdir(), "media-qa-freeze-error-"));

  try {
    const file = createSegmentedFixture(directory, "freeze-error.mp4", "blue", 1.0, 3.0);
    const report = await inspectMedia(file, { ffmpegPath, ffprobePath });
    const [interval] = report.measurements.frozenIntervals;

    assert.ok(interval, "the real MP4 should contain a detected frozen interval");
    assert.ok(interval.durationSeconds > 2.5 && interval.durationSeconds < 3.5);
    assert.deepEqual(report.findings.map(finding => finding.code), ["frozen-video"]);
    assert.equal(report.findings[0]?.severity, "warning");
    assert.equal(report.passed, true, "a freeze above the maximum threshold must not fail QA");
    assert.deepEqual(report.measurements.blackIntervals, [], "the blue hold should not be misreported as black video");
    assertCleanSynchronization(report);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("inspectMedia reports a short real black-video interval as a warning", {
  skip: skipMediaIntegration,
  timeout: 45_000,
}, async () => {
  assertMediaToolsAvailable();
  const directory = await mkdtemp(join(tmpdir(), "media-qa-black-warning-"));

  try {
    const file = createSegmentedFixture(directory, "black-warning.mp4", "black", 2.0, 0.8);
    const report = await inspectMedia(file, { ffmpegPath, ffprobePath });
    const [interval] = report.measurements.blackIntervals;

    assert.ok(interval, "the real MP4 should contain a detected black interval");
    assert.ok(interval.durationSeconds > 0.7 && interval.durationSeconds < 0.95);
    assert.deepEqual(report.findings.map(finding => finding.code), ["black-video"]);
    assert.equal(report.findings[0]?.severity, "warning");
    assert.equal(report.passed, true, "black video below the maximum threshold should remain a warning");
    assert.deepEqual(report.measurements.frozenIntervals, [], "the short black interval should not be reported as a freeze");
    assertCleanSynchronization(report);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("inspectMedia fails an excessive real black-video interval", {
  skip: skipMediaIntegration,
  timeout: 45_000,
}, async () => {
  assertMediaToolsAvailable();
  const directory = await mkdtemp(join(tmpdir(), "media-qa-black-error-"));

  try {
    const file = createSegmentedFixture(directory, "black-error.mp4", "black", 2.0, 1.4);
    const report = await inspectMedia(file, { ffmpegPath, ffprobePath });
    const [interval] = report.measurements.blackIntervals;

    assert.ok(interval, "the real MP4 should contain a detected black interval");
    assert.ok(interval.durationSeconds > 1.2 && interval.durationSeconds < 1.6);
    assert.deepEqual(report.findings.map(finding => finding.code), ["black-video"]);
    assert.equal(report.findings[0]?.severity, "error");
    assert.equal(report.passed, false, "black video above the maximum threshold should fail QA");
    assert.deepEqual(report.measurements.frozenIntervals, [], "the short black interval should not be reported as a freeze");
    assertCleanSynchronization(report);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
