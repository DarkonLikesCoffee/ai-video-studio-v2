import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateFinalDeliveryBundle, type FinalDeliveryOptions } from "../scripts/validate-final-delivery";

const hash = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
const writeJson = async (path: string, value: unknown) => writeFile(path, JSON.stringify(value, null, 2) + "\n");

const makeFixture = async () => {
  const root = await mkdtemp(join(tmpdir(), "ai-video-final-delivery-"));
  const artifactDir = join(root, "artifact");
  const repositoryRoot = join(root, "repo");
  await mkdir(join(artifactDir, "review"), { recursive: true });
  await mkdir(join(repositoryRoot, "projects", "demo", "production"), { recursive: true });

  const outputName = "demo";
  const videoPath = join(artifactDir, "demo.mp4");
  const videoBytes = Buffer.from("synthetic-mp4-payload-for-gate-test");
  await writeFile(videoPath, videoBytes);
  const contactSheet = Buffer.from("synthetic-jpeg-contact-sheet");
  const contactSheetPath = join(artifactDir, "review", "demo.contact-sheet.jpg");
  await writeFile(contactSheetPath, contactSheet);
  const contactSheetReport = { durationSeconds: 10, frameCount: 300, sampleTimestampsSeconds: [0, 5, 9.9] };
  const contactSheetReportPath = join(artifactDir, "review", "demo.contact-sheet.json");
  await writeJson(contactSheetReportPath, contactSheetReport);
  const qa = {
    schemaVersion: 1,
    audioMode: "required",
    passed: true,
    format: { durationSeconds: 10, sizeBytes: videoBytes.length },
    video: { codec: "h264", width: 1920, height: 1080, fps: 30 },
    audio: { codec: "aac", sampleRate: 48000, channels: 2 },
    findings: [{ severity: "warning", code: "silence", message: "Short intentional pause." }],
  };
  const qaPath = join(artifactDir, "demo.qa.json");
  await writeJson(qaPath, qa);
  const assetEvidence = {
    schemaVersion: 1,
    reportType: "production-asset-evidence-not-applicable",
    status: "not-applicable",
    reason: "This procedural composition uses no external project assets.",
  };
  const assetEvidencePath = join(artifactDir, "demo.asset-evidence.json");
  await writeJson(assetEvidencePath, assetEvidence);

  const paths = [
    { path: "demo.mp4", bytes: videoBytes },
    { path: "demo.qa.json", bytes: Buffer.from(JSON.stringify(qa, null, 2) + "\n") },
    { path: "review/demo.contact-sheet.jpg", bytes: contactSheet },
    { path: "review/demo.contact-sheet.json", bytes: Buffer.from(JSON.stringify(contactSheetReport, null, 2) + "\n") },
    { path: "demo.asset-evidence.json", bytes: Buffer.from(JSON.stringify(assetEvidence, null, 2) + "\n") },
  ];
  const sourceCommit = "a".repeat(40);
  const candidateSha = "b".repeat(40);
  const requestId = "demo-request-001";
  const workflowRunId = "123456789";
  const provenance = {
    schemaVersion: 1,
    reportType: "render-provenance",
    source: {
      repository: "DarkonLikesCoffee/ai-video-studio",
      workflow: "Render video",
      commit: sourceCommit,
      workflowRun: { id: workflowRunId },
    },
    request: { outputName, requestId, compositionId: "ProjectVideo" },
    artifact: {
      name: outputName,
      manifestPath: "demo.provenance.json",
      files: paths.map(file => ({
        path: file.path,
        sizeBytes: file.bytes.length,
        sha256: hash(file.bytes),
      })),
    },
    mediaQa: { passed: true, sizeBytes: videoBytes.length, durationSeconds: 10 },
    assetEvidence: { status: "not-applicable" },
    contactSheet: { durationSeconds: 10 },
  };
  const provenancePath = join(artifactDir, "demo.provenance.json");
  await writeJson(provenancePath, provenance);

  const report = {
    schemaVersion: 3,
    reportType: "visual-review",
    status: "approved",
    artifact: {
      name: outputName,
      videoPath: "demo.mp4",
      videoSha256: hash(videoBytes),
      durationSeconds: 10,
      contactSheetPath: "review/demo.contact-sheet.jpg",
      contactSheetReportPath: "review/demo.contact-sheet.json",
      candidateSha,
      sourceCommit,
      requestId,
      workflowRunId,
      runUrl: "https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/" + workflowRunId,
    },
    renderIterations: [{
      iteration: 1,
      videoSha256: hash(videoBytes),
      previousVideoSha256: null,
      candidateSha,
      sourceCommit,
      requestId,
      workflowRunId,
      runUrl: "https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/" + workflowRunId,
      renderedAt: "2026-11-23T12:00:00Z",
      correctionIds: [],
    }],
    inspection: {
      method: "tracked-full-playback",
      fullVideoWatched: true,
      timestampsReviewedSeconds: [0, 2.5, 5, 7.5, 10],
      reviewer: "reviewer",
      reviewedAt: "2026-11-23T12:00:10Z",
      playbackSession: {
        schemaVersion: 1,
        kind: "visual-review-playback-session",
        sessionId: "session-demo",
        mediaName: "demo.mp4",
        mediaSizeBytes: videoBytes.length,
        mediaSha256: hash(videoBytes),
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
    decision: { approved: true, rationale: "The final video meets the creative brief and acceptance criteria." },
  };
  const reviewReportPath = "projects/demo/production/visual-review.json";
  await writeJson(join(repositoryRoot, reviewReportPath), report);
  const renderReviewReport = {
    ...report,
    status: "pending-review",
    decision: { approved: false, rationale: "Awaiting external creative review." },
  };
  await writeJson(join(artifactDir, "review", "demo.visual-review.json"), renderReviewReport);

  const options: FinalDeliveryOptions = {
    artifactDir,
    outputName,
    reviewReportPath,
    expectedRunId: workflowRunId,
    expectedRepository: "DarkonLikesCoffee/ai-video-studio",
    repositoryRoot,
  };
  return { root, artifactDir, repositoryRoot, options, qaPath, report, videoPath, reviewReportPath };
};

test("final delivery packages only a hash-matched, approved render and records its limitations", async t => {
  const f = await makeFixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const result = await validateFinalDeliveryBundle(f.options);
  assert.equal(result.status, "approved");
  assert.equal(result.video.sha256, f.report.artifact.videoSha256);
  assert.equal(result.review.audioStatus, "listened");
  assert.ok(result.files.some(file => file.path === "review/demo.visual-review.json"));
  assert.ok(result.limitations.some(item => item.includes("not a signed identity attestation")));
  const deliveryPath = join(f.artifactDir, "demo.delivery.json");
  const delivery = JSON.parse(await readFile(deliveryPath, "utf8"));
  assert.equal(delivery.reportType, "final-video-delivery");
  const copiedReview = JSON.parse(await readFile(join(f.artifactDir, "review", "demo.visual-review.json"), "utf8"));
  assert.equal(copiedReview.status, "approved");
});

test("final delivery rejects a pending review report", async t => {
  const f = await makeFixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  f.report.status = "pending-review";
  f.report.decision.approved = false;
  await writeJson(join(f.repositoryRoot, f.reviewReportPath), f.report);
  await assert.rejects(() => validateFinalDeliveryBundle(f.options), /Visual-review approval is invalid|approved schema-version-3/);
});

test("final delivery rejects an artifact from a different render run", async t => {
  const f = await makeFixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  await assert.rejects(
    () => validateFinalDeliveryBundle({ ...f.options, expectedRunId: "987654321" }),
    /selected render run ID/,
  );
});

test("final delivery rejects a video whose bytes changed after provenance and review", async t => {
  const f = await makeFixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  await writeFile(f.videoPath, "different-mp4-payload-for-gate-test");
  await assert.rejects(() => validateFinalDeliveryBundle(f.options), /downloaded MP4 hash/);
});

test("final delivery rejects failed media QA even when the report is present", async t => {
  const f = await makeFixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const qa = JSON.parse(await readFile(f.qaPath, "utf8"));
  qa.passed = false;
  await writeJson(f.qaPath, qa);
  await assert.rejects(() => validateFinalDeliveryBundle(f.options), /Media QA must pass/);
});

test("final delivery rejects non-ready asset evidence", async t => {
  const f = await makeFixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const path = join(f.artifactDir, "demo.asset-evidence.json");
  const report = JSON.parse(await readFile(path, "utf8"));
  report.status = "needs-review";
  await writeJson(path, report);
  await assert.rejects(() => validateFinalDeliveryBundle(f.options), /Asset evidence status must be ready or not-applicable/);
});

test("final delivery rejects modified files that do not match provenance hashes", async t => {
  const f = await makeFixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  await writeFile(join(f.artifactDir, "review", "demo.contact-sheet.jpg"), "tampered-contact-sheet");
  await assert.rejects(() => validateFinalDeliveryBundle(f.options), /does not match the downloaded file/);
});

test("final delivery rejects unsafe report paths before reading review content", async t => {
  const f = await makeFixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  await assert.rejects(
    () => validateFinalDeliveryBundle({ ...f.options, reviewReportPath: "../visual-review.json" }),
    /safe repository-relative path/,
  );
});

test("final delivery rejects symlinked artifact paths before writing over another file", async t => {
  const f = await makeFixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const reviewArtifact = join(f.artifactDir, "review", "demo.visual-review.json");
  await unlink(reviewArtifact);
  await symlink("../demo.mp4", reviewArtifact);
  await assert.rejects(() => validateFinalDeliveryBundle(f.options), /cannot be symbolic links/);
  assert.equal(await readFile(f.videoPath, "utf8"), "synthetic-mp4-payload-for-gate-test");
});

test("final delivery rejects an artifact not produced by the Render video workflow", async t => {
  const f = await makeFixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  const path = join(f.artifactDir, "demo.provenance.json");
  const provenance = JSON.parse(await readFile(path, "utf8"));
  provenance.source.workflow = "CI";
  await writeJson(path, provenance);
  await assert.rejects(() => validateFinalDeliveryBundle(f.options), /Render video workflow/);
});
