import test from "node:test";
import assert from "node:assert/strict";
import { applyPlaybackSessionToReport } from "../scripts/import-visual-review-session";

const report = () => ({
  schemaVersion: 3,
  reportType: "visual-review",
  status: "pending-review",
  artifact: { name: "demo", videoSha256: "a".repeat(64), durationSeconds: 10 },
  inspection: {
    method: "not-yet-inspected",
    fullVideoWatched: false,
    timestampsReviewedSeconds: [],
    reviewer: null,
    reviewedAt: null,
    playbackSession: null,
  },
  findings: [],
  corrections: [],
  renderIterations: [{
    iteration: 1,
    videoSha256: "a".repeat(64),
    previousVideoSha256: null,
    candidateSha: "b".repeat(40),
    sourceCommit: "c".repeat(40),
    requestId: "review-001",
    workflowRunId: "run-001",
    renderedAt: "2026-11-23T12:00:00Z",
    correctionIds: [],
  }],
  decision: { approved: false, rationale: "Visual inspection has not been completed." },
});

const session = () => ({
  schemaVersion: 1,
  kind: "visual-review-playback-session",
  sessionId: "session-001",
  mediaName: "demo.mp4",
  mediaSizeBytes: 123456,
  mediaSha256: "a".repeat(64),
  durationSeconds: 10,
  startedAt: "2026-11-23T12:00:00Z",
  completedAt: "2026-11-23T12:00:10Z",
  elapsedPlaybackSeconds: 10,
  playedRangesSeconds: [[0, 10]],
  checkpointsSeconds: [0, 2.5, 5, 7.5, 10],
  playbackRate: 1,
  endedEventObserved: true,
  pageVisibleThroughout: true,
  reviewWindowFocusedThroughout: true,
  seekAttempts: 0,
  complete: true,
  invalidReason: null,
});

test("imports complete playback evidence while keeping the report pending", () => {
  const updated = applyPlaybackSessionToReport(report(), session(), "reviewer");
  assert.equal(updated.status, "pending-review");
  assert.equal(updated.decision.approved, false);
  assert.equal(updated.inspection.method, "tracked-full-playback");
  assert.equal(updated.inspection.fullVideoWatched, true);
  assert.equal(updated.inspection.reviewer, "reviewer");
  assert.deepEqual(updated.inspection.timestampsReviewedSeconds, [0, 2.5, 5, 7.5, 10]);
  assert.equal(updated.inspection.playbackSession.mediaSha256, "a".repeat(64));
});

test("rejects a session recorded against a different MP4", () => {
  const wrong = session();
  wrong.mediaSha256 = "f".repeat(64);
  assert.throws(
    () => applyPlaybackSessionToReport(report(), wrong, "reviewer"),
    /current artifact video SHA-256/,
  );
});

test("rejects incomplete or invalid playback sessions", () => {
  const incomplete = session();
  incomplete.endedEventObserved = false;
  assert.throws(
    () => applyPlaybackSessionToReport(report(), incomplete, "reviewer"),
    /ended event/,
  );
});

test("requires a reviewer and a pending report", () => {
  assert.throws(() => applyPlaybackSessionToReport(report(), session(), "  "), /reviewer name/);
  const rejected = report();
  rejected.status = "rejected";
  assert.throws(() => applyPlaybackSessionToReport(rejected, session(), "reviewer"), /pending-review/);
});

test("playback import does not silently approve creative quality", () => {
  const updated = applyPlaybackSessionToReport(report(), session(), "reviewer");
  assert.equal(updated.status, "pending-review");
  assert.equal(updated.decision.approved, false);
});
