import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { inspectMedia } from "../scripts/media-qa";
import { assertMediaToolsAvailable, ffmpegPath, ffprobePath, skipMediaIntegration } from "./media-qa-integration-helpers";


test("inspectMedia detects delayed audio in a real MP4 without confusing it with duration drift", {
  skip: skipMediaIntegration,
  timeout: 45_000,
}, async () => {
  assertMediaToolsAvailable();
  const directory = await mkdtemp(join(tmpdir(), "media-qa-offset-"));
  const file = join(directory, "delayed-audio.mp4");

  try {
    const generated = spawnSync(ffmpegPath, [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", "testsrc=size=128x72:rate=30:duration=3.6",
      "-itsoffset", "0.65",
      "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=3.6",
      "-map", "0:v:0", "-map", "1:a:0",
      "-c:v", "mpeg4", "-q:v", "5", "-c:a", "aac", "-b:a", "64k",
      file,
    ], { encoding: "utf8", timeout: 30_000 });

    assert.equal(
      generated.status,
      0,
      `Failed to generate delayed-audio MP4 fixture: ${generated.stderr ?? generated.error?.message ?? "unknown error"}`,
    );

    const report = await inspectMedia(file, { ffmpegPath, ffprobePath });
    const offset = report.measurements.audioVideoStartOffsetSeconds;

    assert.ok(offset !== undefined, "ffprobe stream start times should produce an A/V offset");
    assert.ok(offset > 0.5 && offset < 1, `Expected a deliberate late-audio offset, got ${offset}s`);
    assert.equal(report.passed, false, "late audio above the default threshold should fail media QA");
    assert.deepEqual(report.findings.map(finding => finding.code), ["audio-video-start-offset"]);
    assert.ok(
      (report.measurements.audioVideoDurationDriftSeconds ?? 0) < 0.5,
      "the generated streams should have durations within the separate duration-drift threshold",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
