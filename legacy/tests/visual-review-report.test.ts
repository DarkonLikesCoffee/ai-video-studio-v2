import test from "node:test";
import assert from "node:assert/strict";
import {
  appendVisualReviewIteration,
  buildVisualReviewReport,
  sha256Buffer,
} from "../scripts/visual-review-report";

const context = (candidate: string, source: string, requestId: string, renderedAt = "2026-11-23T12:00:00.000Z") => ({
  candidateSha: candidate.repeat(40).slice(0, 40),
  sourceCommit: source.repeat(40).slice(0, 40),
  requestId,
  workflowRunId: "45197957961",
  runUrl: "https://github.com/owner/repo/actions/runs/45197957961",
  renderedAt,
});

const report = (videoSha: string, candidate = "c", source = "d", requestId = "req-1") =>
  buildVisualReviewReport({
    outputName: "demo",
    videoPath: "demo.mp4",
    contactSheetPath: "sheet.jpg",
    contactSheetReportPath: "sheet.json",
    videoSha256: videoSha.repeat(64).slice(0, 64),
    contactSheetReport: { durationSeconds: 8, sampleTimestampsSeconds: [0, 5] },
    renderContext: context(candidate, source, requestId),
  });

test("report starts pending and binds the actual render to candidate and workflow provenance", () => {
  const value = report("a");
  assert.equal(value.schemaVersion, 3);
  assert.equal(value.status, "pending-review");
  assert.equal(value.inspection.method, "not-yet-inspected");
  assert.equal(value.inspection.fullVideoWatched, false);
  assert.equal(value.decision.approved, false);
  assert.deepEqual(value.contactSheet.sampleTimestampsSeconds, [0, 5]);
  assert.equal(value.artifact.videoSha256, "a".repeat(64));
  assert.equal(value.artifact.durationSeconds, 8);
  assert.equal(value.inspection.playbackSession, null);
  assert.equal(value.renderIterations.length, 1);
  assert.equal(value.renderIterations[0].candidateSha, "c".repeat(40));
  assert.equal(value.renderIterations[0].sourceCommit, "d".repeat(40));
  assert.equal(value.renderIterations[0].previousVideoSha256, null);
});

test("review fields start empty and unapproved", () => {
  const value = report("b");
  assert.deepEqual(value.findings, []);
  assert.deepEqual(value.corrections, []);
  assert.equal(value.inspection.reviewer, null);
  assert.equal(value.decision.approved, false);
});

test("correction render appends a hash-linked iteration and carries findings forward", () => {
  const previous = report("a", "c", "d", "initial");
  previous.status = "rejected";
  previous.decision = { approved: false, rationale: "Major issue remains." };
  previous.findings = [{ id: "F1", severity: "major", status: "open" }];
  previous.corrections = [{
    id: "C1",
    findingId: "F1",
    description: "Replace the repeated shot with a new angle.",
    targetPaths: ["projects/demo/src/Scene.tsx"],
    status: "applied",
    appliedInCommit: "e".repeat(40),
    verified: false,
  }];

  const current = report("b", "f", "a", "second");
  const next = appendVisualReviewIteration(previous, current, () => true);

  assert.equal(next.status, "pending-review");
  assert.equal(next.renderIterations.length, 2);
  assert.equal(next.renderIterations[1].iteration, 2);
  assert.equal(next.renderIterations[1].previousVideoSha256, "a".repeat(64));
  assert.equal(next.renderIterations[1].videoSha256, "b".repeat(64));
  assert.deepEqual(next.renderIterations[1].correctionIds, ["C1"]);
  assert.equal(next.findings[0].status, "open");
  assert.equal(next.corrections[0].verified, false);
  assert.equal(next.artifact.videoSha256, "b".repeat(64));
});

test("correction render rejects fixes that are not in the frozen candidate", () => {
  const previous = report("a");
  previous.status = "rejected";
  previous.decision = { approved: false, rationale: "Fix needed." };
  previous.findings = [{ id: "F1", severity: "major", status: "open" }];
  previous.corrections = [{
    id: "C1", findingId: "F1", description: "Fix scene",
    targetPaths: ["projects/demo/src/Scene.tsx"],
    status: "applied", appliedInCommit: "e".repeat(40), verified: false,
  }];
  assert.throws(
    () => appendVisualReviewIteration(previous, report("b"), () => false),
    /no applied correction in the frozen render candidate/,
  );
});

test("correction render rejects a duplicate MP4 hash", () => {
  const previous = report("a");
  previous.status = "rejected";
  previous.decision = { approved: false, rationale: "Fix needed." };
  previous.findings = [{ id: "F1", severity: "major", status: "open" }];
  previous.corrections = [{
    id: "C1", findingId: "F1", description: "Fix scene",
    targetPaths: ["projects/demo/src/Scene.tsx"],
    status: "applied", appliedInCommit: "e".repeat(40), verified: false,
  }];
  assert.throws(
    () => appendVisualReviewIteration(previous, report("a"), () => true),
    /same video hash/,
  );
});

test("legacy review reports are retained as the first linked iteration", () => {
  const original = report("a");
  const previous = { ...original, schemaVersion: 1, renderIterations: undefined };
  previous.status = "rejected";
  previous.decision = { approved: false, rationale: "Fix needed." };
  previous.findings = [{ id: "F1", severity: "minor", status: "open" }];
  previous.corrections = [{
    id: "C1", findingId: "F1", description: "Fix",
    targetPaths: ["projects/demo/src/Scene.tsx"],
    status: "applied", appliedInCommit: "e".repeat(40), verified: false,
  }];
  const next = appendVisualReviewIteration(previous, report("b"), () => true);
  assert.equal(next.renderIterations[0].legacy, true);
  assert.equal(next.renderIterations[1].iteration, 2);
});

test("sha256 helper produces deterministic digest", () =>
  assert.equal(
    sha256Buffer(Buffer.from("test")),
    "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  ));


test("old correction verification is archived and must be repeated for the new render", () => {
  const previous = report("a");
  previous.status = "rejected";
  previous.decision = { approved: false, rationale: "Recheck after another change." };
  previous.findings = [{ id: "F1", severity: "major", status: "open" }];
  previous.corrections = [{
    id: "C1",
    findingId: "F1",
    description: "Rebuild the scene.",
    targetPaths: ["projects/demo/src/Scene.tsx"],
    status: "verified",
    appliedInCommit: "e".repeat(40),
    verified: true,
    verification: {
      videoSha256: "a".repeat(64),
      reviewer: "reviewer",
      reviewedAt: "2026-11-23T12:00:00Z",
      timestampsReviewedSeconds: [4.2],
    },
  }];
  const next = appendVisualReviewIteration(previous, report("b"), () => true);
  assert.equal(next.corrections[0].verified, false);
  assert.equal(next.corrections[0].status, "applied");
  assert.equal(next.corrections[0].verificationHistory.length, 1);
  assert.equal(next.corrections[0].verificationHistory[0].videoSha256, "a".repeat(64));
});
