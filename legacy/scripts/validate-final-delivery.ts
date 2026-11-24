import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validateVisualReviewReport } from "./visual-review-validate";

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isSha256 = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
const isCommitSha = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{40}$/i.test(value);
const asText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const within = (root: string, target: string) => {
  const path = relative(root, target);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
};
const hashBuffer = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
const safeArtifactName = (value: string) =>
  /^[a-z0-9][a-z0-9._-]{0,79}$/i.test(value) && !value.includes("..");

export type FinalDeliveryOptions = {
  artifactDir: string;
  outputName: string;
  reviewReportPath: string;
  expectedRunId: string;
  expectedRepository?: string;
  repositoryRoot?: string;
};

export type FinalDeliveryReport = {
  schemaVersion: 1;
  reportType: "final-video-delivery";
  status: "approved";
  generatedAt: string;
  repository: string;
  outputName: string;
  render: {
    workflowRunId: string;
    sourceCommit: string;
    candidateSha: string;
    requestId: string;
    compositionId: string;
  };
  video: {
    path: string;
    sha256: string;
    sizeBytes: number;
    durationSeconds: number;
    width: number;
    height: number;
    fps: number;
    videoCodec: string;
    audioCodec: string | null;
  };
  review: {
    reportPath: string;
    reportSha256: string;
    reviewer: string;
    reviewedAt: string;
    rationale: string;
    audioStatus: "listened" | "not-listened" | "not-applicable";
    audioReviewer?: string;
    audioReviewedAt?: string;
    audioNote: string;
    findingCount: number;
    openMinorFindings: number;
  };
  mediaQa: { passed: true; findingCount: number; warningCount: number; infoCount: number };
  assetEvidence: { status: string; reason?: string };
  files: Array<{ path: string; sizeBytes: number; sha256: string }>;
  limitations: string[];
};

const resolveFileInside = async (root: string, path: string): Promise<string> => {
  if (!path || path.includes("\\") || path.startsWith("/") ||
      path.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("Unsafe artifact path: " + path);
  }
  const candidate = resolve(root, path);
  if (!within(root, candidate)) throw new Error("Artifact path escapes its directory: " + path);
  const linkDetails = await lstat(candidate);
  if (linkDetails.isSymbolicLink()) throw new Error("Artifact files cannot be symbolic links: " + path);
  if (!linkDetails.isFile()) throw new Error("Artifact path is not a regular file: " + path);
  const actual = await realpath(candidate);
  if (!within(root, actual)) throw new Error("Artifact symlink escapes its directory: " + path);
  const details = await stat(actual);
  if (!details.isFile() || details.size <= 0) {
    throw new Error("Artifact file is missing, empty or not a regular file: " + path);
  }
  return actual;
};

const readJson = async (filePath: string): Promise<JsonRecord> => {
  const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
  if (!isRecord(parsed)) throw new Error("Expected a JSON object in " + filePath + ".");
  return parsed;
};

export const validateFinalDeliveryBundle = async (options: FinalDeliveryOptions): Promise<FinalDeliveryReport> => {
  const outputName = options.outputName;
  const expectedRunId = options.expectedRunId;
  const reviewReportPath = options.reviewReportPath;
  const expectedRepository = options.expectedRepository ?? "DarkonLikesCoffee/ai-video-studio";
  if (!safeArtifactName(outputName)) {
    throw new Error("outputName must be a safe filename slug (letters, numbers, dot, underscore and hyphen; no path segments).");
  }
  if (!/^\d+$/.test(expectedRunId)) throw new Error("expectedRunId must be a numeric GitHub Actions run ID.");

  const root = await realpath(resolve(options.artifactDir));
  const repositoryRoot = await realpath(resolve(options.repositoryRoot ?? process.cwd()));
  if (!reviewReportPath || reviewReportPath.includes("\\") || reviewReportPath.startsWith("/") ||
      reviewReportPath.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("reviewReportPath must be a safe repository-relative path.");
  }
  const reviewSource = resolve(repositoryRoot, reviewReportPath);
  if (!within(repositoryRoot, reviewSource)) throw new Error("reviewReportPath escapes the checked-out repository.");
  const reviewRealPath = await realpath(reviewSource);
  if (!within(repositoryRoot, reviewRealPath)) throw new Error("reviewReportPath resolves outside the checked-out repository.");

  const paths = {
    video: outputName + ".mp4",
    qa: outputName + ".qa.json",
    contactSheet: "review/" + outputName + ".contact-sheet.jpg",
    contactSheetReport: "review/" + outputName + ".contact-sheet.json",
    visualReview: "review/" + outputName + ".visual-review.json",
    assetEvidence: outputName + ".asset-evidence.json",
    provenance: outputName + ".provenance.json",
    delivery: outputName + ".delivery.json",
  };
  const videoPath = await resolveFileInside(root, paths.video);
  const qaPath = await resolveFileInside(root, paths.qa);
  await resolveFileInside(root, paths.contactSheet);
  const contactSheetReportPath = await resolveFileInside(root, paths.contactSheetReport);
  await resolveFileInside(root, paths.visualReview);
  const assetEvidencePath = await resolveFileInside(root, paths.assetEvidence);
  const provenancePath = await resolveFileInside(root, paths.provenance);

  const videoBytes = await readFile(videoPath);
  const qa = await readJson(qaPath);
  const contactSheetReport = await readJson(contactSheetReportPath);
  const assetEvidence = await readJson(assetEvidencePath);
  const provenance = await readJson(provenancePath);
  const reviewText = await readFile(reviewRealPath, "utf8");
  const videoStat = await stat(videoPath);
  const reviewValue: unknown = JSON.parse(reviewText);
  if (!isRecord(reviewValue)) throw new Error("The committed visual-review report must be a JSON object.");
  const validation = validateVisualReviewReport(reviewValue);
  if (validation.errors.length) {
    throw new Error("Visual-review approval is invalid:\n" + validation.errors.map(error => "- " + error).join("\n"));
  }
  if (reviewValue.schemaVersion !== 3 || reviewValue.status !== "approved" || !validation.approved) {
    throw new Error("Final delivery requires an approved schema-version-3 visual-review report.");
  }

  const reviewArtifact = isRecord(reviewValue.artifact) ? reviewValue.artifact : {};
  const reviewInspection = isRecord(reviewValue.inspection) ? reviewValue.inspection : {};
  const reviewDecision = isRecord(reviewValue.decision) ? reviewValue.decision : {};
  const reviewAudio = isRecord(reviewInspection.audioReview) ? reviewInspection.audioReview : {};
  const provenanceSource = isRecord(provenance.source) ? provenance.source : {};
  const workflowRun = isRecord(provenanceSource.workflowRun) ? provenanceSource.workflowRun : {};
  const provenanceRequest = isRecord(provenance.request) ? provenance.request : {};
  const provenanceArtifact = isRecord(provenance.artifact) ? provenance.artifact : {};
  const provenanceFiles = Array.isArray(provenanceArtifact.files) ? provenanceArtifact.files.filter(isRecord) : [];
  const provenanceQa = isRecord(provenance.mediaQa) ? provenance.mediaQa : {};
  const provenanceAssets = isRecord(provenance.assetEvidence) ? provenance.assetEvidence : {};
  const provenanceContactSheet = isRecord(provenance.contactSheet) ? provenance.contactSheet : {};
  const format = isRecord(qa.format) ? qa.format : {};
  const videoInfo = isRecord(qa.video) ? qa.video : {};
  const audioInfo = isRecord(qa.audio) ? qa.audio : {};
  const artifactHash = hashBuffer(videoBytes);

  if (provenance.schemaVersion !== 1 || provenance.reportType !== "render-provenance") {
    throw new Error("Render provenance manifest has an unsupported schema or report type.");
  }
  if (provenanceSource.repository !== expectedRepository) {
    throw new Error("Render provenance repository must be " + expectedRepository + ".");
  }
  if (provenanceSource.workflow !== "Render video") {
    throw new Error("Final delivery only accepts artifacts produced by the Render video workflow.");
  }
  if (String(workflowRun.id ?? "") !== expectedRunId || String(reviewArtifact.workflowRunId ?? "") !== expectedRunId) {
    throw new Error("The visual review and provenance must both reference the selected render run ID.");
  }
  const sourceCommit = asText(provenanceSource.commit);
  if (!isCommitSha(sourceCommit) || reviewArtifact.sourceCommit !== sourceCommit) {
    throw new Error("The visual-review source commit must match the render provenance commit.");
  }
  const candidateSha = reviewArtifact.candidateSha;
  if (!isCommitSha(candidateSha)) throw new Error("The reviewed render must identify its frozen candidate commit.");
  const requestId = asText(provenanceRequest.requestId);
  if (!requestId || reviewArtifact.requestId !== requestId) {
    throw new Error("The visual-review request ID must match render provenance.");
  }
  if (provenanceRequest.outputName !== outputName || provenanceArtifact.name !== outputName || reviewArtifact.name !== outputName) {
    throw new Error("The output name must match the render request, provenance and visual-review report.");
  }
  const compositionId = asText(provenanceRequest.compositionId);
  if (!compositionId) throw new Error("Render provenance must identify the selected composition.");

  if (qa.schemaVersion !== 1 || qa.passed !== true || provenanceQa.passed !== true) {
    throw new Error("Media QA must pass in both the standalone report and provenance manifest.");
  }
  if (typeof format.sizeBytes !== "number" || format.sizeBytes !== videoStat.size || provenanceQa.sizeBytes !== videoStat.size) {
    throw new Error("Media QA and provenance file size must match the downloaded MP4.");
  }
  if (typeof format.durationSeconds !== "number" || !Number.isFinite(format.durationSeconds) || format.durationSeconds <= 0 ||
      typeof reviewArtifact.durationSeconds !== "number" || Math.abs(format.durationSeconds - reviewArtifact.durationSeconds) > 0.25) {
    throw new Error("Media QA duration must match the reviewed MP4 duration within 0.25 seconds.");
  }
  if (typeof videoInfo.width !== "number" || videoInfo.width <= 0 ||
      typeof videoInfo.height !== "number" || videoInfo.height <= 0 ||
      typeof videoInfo.fps !== "number" || videoInfo.fps <= 0 || !asText(videoInfo.codec)) {
    throw new Error("Media QA must document valid video dimensions, frame rate and codec.");
  }
  if (provenanceQa.durationSeconds !== format.durationSeconds) {
    throw new Error("The provenance media-QA duration does not match the standalone media-QA report.");
  }
  if (typeof contactSheetReport.durationSeconds !== "number" || contactSheetReport.durationSeconds <= 0 ||
      Math.abs(contactSheetReport.durationSeconds - format.durationSeconds) > 0.25 ||
      !Array.isArray(contactSheetReport.sampleTimestampsSeconds) || contactSheetReport.sampleTimestampsSeconds.length === 0) {
    throw new Error("The contact-sheet report must contain samples and match the final MP4 duration.");
  }
  if (provenanceContactSheet.durationSeconds !== contactSheetReport.durationSeconds) {
    throw new Error("The provenance contact-sheet duration does not match its report.");
  }
  if (provenanceArtifact.manifestPath !== paths.provenance) {
    throw new Error("The provenance manifest path does not match the selected output name.");
  }

  const assetSummary = isRecord(assetEvidence.summary) ? assetEvidence.summary : undefined;
  const assetStatus = assetSummary?.status ?? assetEvidence.status;
  if (assetStatus !== "ready" && assetStatus !== "not-applicable") {
    throw new Error("Asset evidence status must be ready or not-applicable; received " + String(assetStatus) + ".");
  }
  if (provenanceAssets.status !== assetStatus) {
    throw new Error("The asset-evidence status in provenance does not match the included report.");
  }
  if (assetStatus === "not-applicable" && !asText(assetEvidence.reason)) {
    throw new Error("A not-applicable asset-evidence report must explain why it does not apply.");
  }

  const audioStatus = reviewAudio.status;
  const audioReviewer = asText(reviewAudio.reviewer);
  const audioReviewedAt = asText(reviewAudio.reviewedAt);
  const assetReason = asText(assetEvidence.reason);
  if (audioStatus !== "listened" && audioStatus !== "not-listened" && audioStatus !== "not-applicable") {
    throw new Error("The approved visual-review report must record an explicit audio review status.");
  }
  if (audioStatus === "not-applicable" && Object.keys(audioInfo).length > 0) {
    throw new Error("Audio review cannot be marked not-applicable when the MP4 contains an audio stream.");
  }
  if (audioStatus !== "not-applicable" && Object.keys(audioInfo).length === 0) {
    throw new Error("An MP4 without an audio stream must mark audio review as not-applicable.");
  }

  const iterations = Array.isArray(reviewValue.renderIterations) ? reviewValue.renderIterations : [];
  const lastIteration = iterations.at(-1);
  if (!isRecord(lastIteration) || lastIteration.workflowRunId !== expectedRunId ||
      lastIteration.sourceCommit !== sourceCommit || lastIteration.requestId !== requestId ||
      lastIteration.videoSha256 !== artifactHash || reviewArtifact.videoSha256 !== artifactHash) {
    throw new Error("The final approved review iteration must match the selected run, request, source commit and downloaded MP4 hash.");
  }

  const recordByPath = new Map<string, JsonRecord>();
  for (const record of provenanceFiles) {
    const path = asText(record.path);
    if (!path || recordByPath.has(path)) throw new Error("Render provenance contains a missing or duplicate artifact file path.");
    recordByPath.set(path, record);
    const filePath = await resolveFileInside(root, path);
    const fileStat = await stat(filePath);
    const bytes = await readFile(filePath);
    if (record.sizeBytes !== fileStat.size || !isSha256(record.sha256) || record.sha256 !== hashBuffer(bytes)) {
      throw new Error("Artifact file evidence does not match the downloaded file: " + path);
    }
  }
  const requiredFiles = [paths.video, paths.qa, paths.contactSheet, paths.contactSheetReport, paths.assetEvidence];
  for (const path of requiredFiles) {
    if (!recordByPath.has(path)) throw new Error("Render provenance is missing required file evidence for " + path + ".");
  }
  const manifestVideo = recordByPath.get(paths.video);
  if (manifestVideo?.sha256 !== artifactHash || manifestVideo.sizeBytes !== videoStat.size) {
    throw new Error("The provenance MP4 evidence does not match the downloaded MP4.");
  }
  if (basename(reviewReportPath) !== "visual-review.json") {
    throw new Error("The committed approval file must be named visual-review.json.");
  }

  const reviewTarget = resolve(root, paths.visualReview);
  await mkdir(resolve(root, "review"), { recursive: true });
  await copyFile(reviewRealPath, reviewTarget);
  const reviewTargetBytes = await readFile(reviewTarget);
  const reviewReportHash = hashBuffer(reviewTargetBytes);
  const reviewFindings = Array.isArray(reviewValue.findings) ? reviewValue.findings.filter(isRecord) : [];
  const finalFiles = [paths.video, paths.qa, paths.contactSheet, paths.contactSheetReport, paths.visualReview, paths.assetEvidence, paths.provenance];
  const creditsPath = outputName + "-credits.txt";
  if (recordByPath.has(creditsPath)) finalFiles.push(creditsPath);
  const files: Array<{ path: string; sizeBytes: number; sha256: string }> = [];
  for (const path of finalFiles) {
    const fullPath = await resolveFileInside(root, path);
    const fileStat = await stat(fullPath);
    const bytes = await readFile(fullPath);
    files.push({ path, sizeBytes: fileStat.size, sha256: hashBuffer(bytes) });
  }

  const finalReport: FinalDeliveryReport = {
    schemaVersion: 1,
    reportType: "final-video-delivery",
    status: "approved",
    generatedAt: new Date().toISOString(),
    repository: expectedRepository,
    outputName,
    render: { workflowRunId: expectedRunId, sourceCommit, candidateSha, requestId, compositionId },
    video: {
      path: paths.video,
      sha256: artifactHash,
      sizeBytes: videoStat.size,
      durationSeconds: format.durationSeconds,
      width: videoInfo.width as number,
      height: videoInfo.height as number,
      fps: videoInfo.fps as number,
      videoCodec: String(videoInfo.codec),
      audioCodec: asText(audioInfo.codec) ?? null,
    },
    review: {
      reportPath: paths.visualReview,
      reportSha256: reviewReportHash,
      reviewer: String(reviewInspection.reviewer),
      reviewedAt: String(reviewInspection.reviewedAt),
      rationale: String(reviewDecision.rationale),
      audioStatus,
      ...(audioReviewer ? { audioReviewer } : {}),
      ...(audioReviewedAt ? { audioReviewedAt } : {}),
      audioNote: String(reviewAudio.rationale ?? reviewAudio.reason ?? ""),
      findingCount: reviewFindings.length,
      openMinorFindings: reviewFindings.filter(finding => finding.severity === "minor" && finding.status === "open").length,
    },
    mediaQa: {
      passed: true,
      findingCount: Array.isArray(qa.findings) ? qa.findings.length : 0,
      warningCount: Array.isArray(qa.findings) ? qa.findings.filter(isRecord).filter(finding => finding.severity === "warning").length : 0,
      infoCount: Array.isArray(qa.findings) ? qa.findings.filter(isRecord).filter(finding => finding.severity === "info").length : 0,
    },
    assetEvidence: {
      status: String(assetStatus),
      ...(assetReason ? { reason: assetReason } : {}),
    },
    files,
    limitations: [
      "The playback-session JSON is editable telemetry, not a signed identity attestation.",
      audioStatus === "listened"
        ? "Audio listening is recorded as reviewer-provided evidence; the gate cannot independently prove that listening occurred."
        : audioStatus === "not-listened"
          ? "Audio was not listened to: " + String(reviewAudio.reason) + ". Media QA measurements are not a substitute for listening."
          : "The video contains no audio stream; audio listening is not applicable.",
      "Creative acceptance is the reviewer's recorded judgment; automated checks verify consistency and required evidence, not artistic quality.",
    ],
  };
  await writeFile(resolve(root, paths.delivery), JSON.stringify(finalReport, null, 2) + "\n", "utf8");
  return finalReport;
};

const main = async () => {
  const args = process.argv.slice(2);
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key?.startsWith("--")) throw new Error("Unexpected argument: " + String(key));
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(key + " requires a value.");
    if (values.has(key)) throw new Error(key + " may only be supplied once.");
    values.set(key, value);
    index += 1;
  }
  const artifactDir = values.get("--artifact-dir");
  const outputName = values.get("--output-name");
  const reviewReportPath = values.get("--review-report");
  const expectedRunId = values.get("--expected-run-id");
  if (!artifactDir || !outputName || !reviewReportPath || !expectedRunId) {
    throw new Error("Usage: npx tsx scripts/validate-final-delivery.ts --artifact-dir render-output --output-name <slug> --review-report projects/<slug>/production/visual-review.json --expected-run-id <github-run-id>");
  }
  const report = await validateFinalDeliveryBundle({
    artifactDir,
    outputName,
    reviewReportPath,
    expectedRunId,
    expectedRepository: process.env.GITHUB_REPOSITORY ?? "DarkonLikesCoffee/ai-video-studio",
  });
  process.stdout.write("Final delivery approved: " + report.outputName + "\n");
  process.stdout.write("MP4 SHA-256: " + report.video.sha256 + "\n");
  process.stdout.write("Review: " + report.review.reviewer + " — " + report.review.audioStatus + "\n");
  process.stdout.write("Delivery manifest: " + resolve(artifactDir, outputName + ".delivery.json") + "\n");
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    process.stderr.write("Final delivery rejected: " + (error instanceof Error ? error.message : String(error)) + "\n");
    process.exitCode = 1;
  });
}
