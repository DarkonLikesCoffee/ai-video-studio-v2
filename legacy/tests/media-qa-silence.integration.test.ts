import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { inspectMedia } from "../scripts/media-qa";
import { assertMediaToolsAvailable, ffmpegPath, ffprobePath, skipMediaIntegration } from "./media-qa-integration-helpers";


const createSilenceFixture = (
  directory: string,
  filename: string,
  durationSeconds: number,
  silenceStartSeconds: number,
  silenceEndSeconds: number,
): string => {
  const file = join(directory, filename);
  const generated = spawnSync(ffmpegPath, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "lavfi", "-i", `testsrc=size=128x72:rate=30:duration=${durationSeconds}`,
    "-f", "lavfi", "-i", `sine=frequency=440:sample_rate=48000:duration=${durationSeconds}`,
    "-af", `volume=enable='between(t,${silenceStartSeconds},${silenceEndSeconds})':volume=0`,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "mpeg4", "-q:v", "5", "-c:a", "aac", "-b:a", "64k",
    file,
  ], { encoding: "utf8", timeout: 30_000 });

  assert.equal(
    generated.status,
    0,
    `Failed to generate silence MP4 fixture: ${generated.stderr ?? generated.error?.message ?? "unknown error"}`,
  );
  return file;
};

test("inspectMedia reports moderate silence as a warning in a real MP4", {
  skip: skipMediaIntegration,
  timeout: 45_000,
}, async () => {
  assertMediaToolsAvailable();
  const directory = await mkdtemp(join(tmpdir(), "media-qa-silence-warning-"));

  try {
    const file = createSilenceFixture(directory, "moderate-silence.mp4", 4.8, 1, 2.2);
    const report = await inspectMedia(file, { ffmpegPath, ffprobePath });
    const [interval] = report.measurements.silenceIntervals;

    assert.ok(interval, "the real MP4 should contain a detected silence interval");
    assert.ok(interval.durationSeconds > 1 && interval.durationSeconds < 2);
    assert.deepEqual(report.findings.map(finding => finding.code), ["silence"]);
    assert.equal(report.findings[0]?.severity, "warning");
    assert.equal(report.passed, true, "silence under the maximum threshold should remain a warning");
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
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("inspectMedia reports excessive silence as informational in a real MP4", {
  skip: skipMediaIntegration,
  timeout: 45_000,
}, async () => {
  assertMediaToolsAvailable();
  const directory = await mkdtemp(join(tmpdir(), "media-qa-silence-error-"));

  try {
    const file = createSilenceFixture(directory, "excessive-silence.mp4", 4.8, 1, 3.5);
    const report = await inspectMedia(file, { ffmpegPath, ffprobePath });
    const [interval] = report.measurements.silenceIntervals;

    assert.ok(interval, "the real MP4 should contain a detected silence interval");
    assert.ok(interval.durationSeconds > 2 && interval.durationSeconds < 3);
    assert.deepEqual(report.findings.map(finding => finding.code), ["silence"]);
    assert.equal(report.findings[0]?.severity, "warning");
    assert.equal(report.passed, true, "excessive silence must not fail QA");
    assert.ok(
      report.measurements.audioVideoStartOffsetSeconds !== undefined &&
        Math.abs(report.measurements.audioVideoStartOffsetSeconds) < 0.05,
      "silence must not be misreported as an A/V start offset",
    );
    assert.ok(
      report.measurements.audioVideoDurationDriftSeconds !== undefined &&
        report.measurements.audioVideoDurationDriftSeconds < 0.5,
      "the fixture should stay within the independent duration-drift threshold",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
