import test from "node:test";
import assert from "node:assert/strict";
import { validatePlaybackSession, validateVisualReviewReport } from "../scripts/visual-review-validate";

const base = () => ({
  schemaVersion: 3,
  status: "approved",
  artifact: { videoSha256: "a".repeat(64), name: "demo", durationSeconds: 10 },
  inspection: {
    method: "tracked-full-playback",
    fullVideoWatched: true,
    timestampsReviewedSeconds: [0, 2.5, 5, 7.5, 10],
    reviewer: "reviewer",
    reviewedAt: "2026-11-23T12:00:10Z",
    playbackSession: {
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
    },
    audioReview: {
      status: "listened",
      reviewer: "reviewer",
      reviewedAt: "2026-11-23T12:00:20Z",
      rationale: "Listened to the full audio track.",
    },
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
    workflowRunId: "45197957961",
    runUrl: "https://github.com/owner/repo/actions/runs/45197957961",
    renderedAt: "2026-11-23T12:00:00Z",
    correctionIds: [],
  }],
  decision: { approved: true, rationale: "Reviewed the full render; no blocking issues." },
});

test("pending reports validate without implying approval", () => {
  const r = base();
  r.status = "pending-review";
  r.decision.approved = false;
  const value = validateVisualReviewReport(r);
  assert.deepEqual(value.errors, []);
  assert.equal(value.pending, true);
  assert.equal(value.approved, false);
});

test("approval requires full-video inspection", () => {
  const r = base();
  r.inspection.fullVideoWatched = false;
  assert.ok(validateVisualReviewReport(r).errors.some(error => error.includes("fullVideoWatched=true")));
});

test("approval rejects unresolved blockers and open major findings", () => {
  const r = base();
  r.findings = [
    { id: "F1", severity: "blocker", status: "open" },
    { id: "F2", severity: "major", status: "open" },
  ];
  const value = validateVisualReviewReport(r);
  assert.ok(value.errors.some(error => error.includes("blocker")));
  assert.ok(value.errors.some(error => error.includes("major")));
});

test("approval requires correction references and current-render verification evidence", () => {
  const r = base();
  r.findings = [{ id: "F1", severity: "minor", status: "resolved" }];
  r.corrections = [{
    id: "C1",
    findingId: "missing",
    description: "Fix",
    targetPaths: ["projects/demo/src/Scene.tsx"],
    status: "verified",
    appliedInCommit: "d".repeat(40),
    verified: true,
    verification: {
      videoSha256: "f".repeat(64),
      reviewer: "reviewer",
      reviewedAt: "2026-11-23T12:00:00Z",
      timestampsReviewedSeconds: [2],
    },
  }];
  r.renderIterations[0].correctionIds = ["C1"];
  const value = validateVisualReviewReport(r);
  assert.ok(value.errors.some(error => error.includes("existing findingId")));
  assert.ok(value.errors.some(error => error.includes("current artifact video hash")));
});

test("valid approval passes", () => {
  assert.deepEqual(validateVisualReviewReport(base()).errors, []);
});

test("valid correction verification is tied to the current MP4 hash", () => {
  const r = base();
  r.findings = [{ id: "F1", severity: "major", status: "resolved" }];
  r.corrections = [{
    id: "C1",
    findingId: "F1",
    description: "Rebuild the repeated shot with a distinct camera angle.",
    targetPaths: ["projects/demo/src/Scene.tsx", "projects/demo/production/production-plan.json"],
    status: "verified",
    appliedInCommit: "d".repeat(40),
    verified: true,
    verification: {
      videoSha256: "a".repeat(64),
      reviewer: "reviewer",
      reviewedAt: "2026-11-23T12:00:00Z",
      timestampsReviewedSeconds: [4.2, 6.1],
    },
  }];
  r.renderIterations[0].correctionIds = ["C1"];
  assert.deepEqual(validateVisualReviewReport(r).errors, []);
});

test("render iteration history must form a sequential hash chain", () => {
  const r = base();
  r.renderIterations.push({
    ...r.renderIterations[0],
    iteration: 2,
    videoSha256: "d".repeat(64),
    previousVideoSha256: "wrong".padEnd(64, "0"),
  });
  const errors = validateVisualReviewReport(r).errors;
  assert.ok(errors.some(error => error.includes("preceding video hash")));
  assert.ok(errors.some(error => error.includes("latest render iteration")));
});

test("schemaVersion 2 corrections require target files and an application commit", () => {
  const r = base();
  r.findings = [{ id: "F1", severity: "minor", status: "open" }];
  r.corrections = [{
    id: "C1",
    findingId: "F1",
    description: "Correct the shot.",
    targetPaths: ["../outside.tsx"],
    status: "applied",
    appliedInCommit: "bad-sha",
    verified: false,
  }];
  const errors = validateVisualReviewReport(r).errors;
  assert.ok(errors.some(error => error.includes("safe repository-relative targetPaths")));
  assert.ok(errors.some(error => error.includes("full appliedInCommit SHA")));
});

test("invalid hash and duplicate finding ids are rejected", () => {
  const r = base();
  r.artifact.videoSha256 = "bad";
  r.findings = [
    { id: "F", severity: "minor", status: "open" },
    { id: "F", severity: "minor", status: "open" },
  ];
  const errors = validateVisualReviewReport(r).errors;
  assert.ok(errors.some(error => error.includes("SHA-256")));
  assert.ok(errors.some(error => error.includes("Duplicate finding id")));
});


test("approval cannot be enabled by the fullVideoWatched checkbox alone", () => {
  const r = base();
  (r.inspection as { playbackSession: unknown }).playbackSession = null;
  const errors = validateVisualReviewReport(r).errors;
  assert.ok(errors.some(error => error.includes("tracked full-playback session")));
});

test("playback evidence must match the exact current MP4 hash and duration", () => {
  const r = base();
  r.inspection.playbackSession.mediaSha256 = "f".repeat(64);
  assert.ok(validateVisualReviewReport(r).errors.some(error => error.includes("current artifact video SHA-256")));
  r.inspection.playbackSession.mediaSha256 = "a".repeat(64);
  r.inspection.playbackSession.durationSeconds = 9;
  assert.ok(validateVisualReviewReport(r).errors.some(error => error.includes("durationSeconds must match")));
});

test("playback approval rejects sessions without the ended event, with seeks, hidden tab or non-normal speed", () => {
  const mutations = [
    (s: any) => { s.endedEventObserved = false; },
    (s: any) => { s.seekAttempts = 1; },
    (s: any) => { s.pageVisibleThroughout = false; },
    (s: any) => { s.reviewWindowFocusedThroughout = false; },
    (s: any) => { s.playbackRate = 1.25; },
  ];
  for (const mutate of mutations) {
    const r = base();
    mutate(r.inspection.playbackSession);
    assert.ok(validateVisualReviewReport(r).errors.length > 0);
  }
});

test("playback approval requires continuous near-complete coverage and checkpoints", () => {
  const r = base();
  r.inspection.playbackSession.playedRangesSeconds = [[0, 4], [5, 10]];
  assert.ok(validateVisualReviewReport(r).errors.some(error => error.includes("gap larger than")));
  r.inspection.playbackSession.playedRangesSeconds = [[0, 9]];
  assert.ok(validateVisualReviewReport(r).errors.some(error => error.includes("does not reach the end")));
  r.inspection.playbackSession.playedRangesSeconds = [[0, 10]];
  r.inspection.playbackSession.checkpointsSeconds = [0, 5, 10];
  assert.ok(validateVisualReviewReport(r).errors.some(error => error.includes("25% playback checkpoint")));
});

test("playback session validation accepts a complete session tied to the current artifact", () => {
  const r = base();
  assert.deepEqual(validatePlaybackSession(r.inspection.playbackSession, r.artifact), []);
});


test("approval metadata must refer to the imported playback session", () => {
  const r = base();
  r.inspection.reviewedAt = "2026-11-23T12:00:11Z";
  assert.ok(validateVisualReviewReport(r).errors.some(error => error.includes("reviewedAt must match")));
  r.inspection.reviewedAt = "2026-11-23T12:00:10Z";
  r.inspection.timestampsReviewedSeconds = [0, 5, 10];
  assert.ok(validateVisualReviewReport(r).errors.some(error => error.includes("must match the playback session checkpoints")));
});

test("schema version 3 requires a real render duration", () => {
  const r = base();
  delete r.artifact.durationSeconds;
  assert.ok(validateVisualReviewReport(r).errors.some(error => error.includes("artifact.durationSeconds")));
});

test("approval requires an explicit, honest audio review status", () => {
  const r = base();
  const inspection = r.inspection as unknown as Record<string, unknown>;
  delete inspection.audioReview;
  assert.ok(validateVisualReviewReport(r).errors.some(error => error.includes("explicit audio review status")));

  inspection.audioReview = { status: "not-listened" };
  assert.ok(validateVisualReviewReport(r).errors.some(error => error.includes("needs a reason")));

  inspection.audioReview = { status: "not-listened", reason: "Audio playback was unavailable in this review environment." };
  assert.deepEqual(validateVisualReviewReport(r).errors, []);
});

test("a listened audio review must match the visual reviewer and include its own timestamp and rationale", () => {
  const r = base();
  const audioReview = r.inspection.audioReview as unknown as Record<string, unknown>;
  audioReview.reviewer = "different-reviewer";
  assert.ok(validateVisualReviewReport(r).errors.some(error => error.includes("must match the visual inspection reviewer")));
  audioReview.reviewer = "reviewer";
  audioReview.reviewedAt = "not-a-date";
  assert.ok(validateVisualReviewReport(r).errors.some(error => error.includes("valid reviewedAt")));
  audioReview.reviewedAt = "2026-11-23T12:00:20Z";
  audioReview.rationale = " ";
  assert.ok(validateVisualReviewReport(r).errors.some(error => error.includes("short rationale")));
});
