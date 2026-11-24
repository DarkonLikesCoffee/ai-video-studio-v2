import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validateVisualReviewReport } from "./visual-review-validate";

type ContactSheetReport = { durationSeconds?: number; sampleTimestampsSeconds?: number[] };
type RenderContext = {
  candidateSha: string;
  sourceCommit: string;
  requestId: string;
  workflowRunId: string;
  runUrl: string;
  renderedAt: string;
};
type VisualReviewInput = {
  outputName: string;
  videoPath: string;
  contactSheetPath: string;
  contactSheetReportPath: string;
  videoSha256: string;
  contactSheetReport: ContactSheetReport;
  renderContext: RenderContext;
};
type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isCommitSha = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{40}$/i.test(value);
const isVideoSha = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);

const createRenderIteration = (
  videoSha256: string,
  renderContext: RenderContext,
  iteration: number,
  previousVideoSha256: string | null,
  correctionIds: string[] = [],
) => ({
  iteration,
  videoSha256,
  previousVideoSha256,
  candidateSha: renderContext.candidateSha,
  sourceCommit: renderContext.sourceCommit,
  requestId: renderContext.requestId,
  workflowRunId: renderContext.workflowRunId,
  runUrl: renderContext.runUrl,
  renderedAt: renderContext.renderedAt,
  correctionIds,
});

export const buildVisualReviewReport = ({
  outputName,
  videoPath,
  contactSheetPath,
  contactSheetReportPath,
  videoSha256,
  contactSheetReport,
  renderContext,
}: VisualReviewInput) => {
  if (!isVideoSha(videoSha256)) throw new Error("videoSha256 must be a valid SHA-256 hash.");
  if (typeof contactSheetReport?.durationSeconds !== "number" ||
      !Number.isFinite(contactSheetReport.durationSeconds) || contactSheetReport.durationSeconds <= 0) {
    throw new Error("The contact-sheet report must include a positive durationSeconds value.");
  }
  if (!isCommitSha(renderContext.candidateSha)) throw new Error("Render candidate SHA must be a full 40-character commit SHA.");
  if (!isCommitSha(renderContext.sourceCommit)) throw new Error("Render source commit must be a full 40-character commit SHA.");
  if (!renderContext.requestId.trim() || !renderContext.workflowRunId.trim() || !Number.isFinite(Date.parse(renderContext.renderedAt))) {
    throw new Error("Render context needs a request ID, workflow run ID and valid renderedAt timestamp.");
  }
  return {
    schemaVersion: 3,
    reportType: "visual-review",
    status: "pending-review",
    generatedAt: renderContext.renderedAt,
    artifact: {
      name: outputName,
      videoPath,
      videoSha256,
      durationSeconds: contactSheetReport?.durationSeconds ?? null,
      contactSheetPath,
      contactSheetReportPath,
      candidateSha: renderContext.candidateSha,
      sourceCommit: renderContext.sourceCommit,
      requestId: renderContext.requestId,
      workflowRunId: renderContext.workflowRunId,
      runUrl: renderContext.runUrl,
    },
    renderIterations: [createRenderIteration(videoSha256, renderContext, 1, null)],
    inspection: {
      method: "not-yet-inspected",
      fullVideoWatched: false,
      timestampsReviewedSeconds: [],
      reviewer: null,
      reviewedAt: null,
      playbackSession: null,
      audioReview: {
        status: "not-reviewed",
        reviewer: null,
        reviewedAt: null,
        rationale: null,
        reason: null,
      },
    },
    findings: [],
    corrections: [],
    decision: { approved: false, rationale: "Visual inspection has not been completed." },
    contactSheet: {
      durationSeconds: contactSheetReport?.durationSeconds ?? null,
      sampleTimestampsSeconds: contactSheetReport?.sampleTimestampsSeconds ?? [],
    },
  };
};

export const sha256Buffer = (buffer: Uint8Array) =>
  createHash("sha256").update(buffer).digest("hex");

const createLegacyIteration = (previous: JsonRecord, videoSha256: string) => {
  const artifact = isRecord(previous.artifact) ? previous.artifact : {};
  const renderedAt = typeof previous.generatedAt === "string" && !Number.isNaN(Date.parse(previous.generatedAt))
    ? previous.generatedAt
    : new Date(0).toISOString();
  return {
    iteration: 1,
    videoSha256,
    previousVideoSha256: null,
    candidateSha: null,
    sourceCommit: null,
    requestId: typeof artifact.requestId === "string" ? artifact.requestId : "legacy-render",
    workflowRunId: typeof artifact.workflowRunId === "string" ? artifact.workflowRunId : "legacy-run",
    runUrl: typeof artifact.runUrl === "string" ? artifact.runUrl : "",
    renderedAt,
    correctionIds: [],
    legacy: true,
  };
};

export const appendVisualReviewIteration = (
  previousReport: unknown,
  currentReport: ReturnType<typeof buildVisualReviewReport>,
  isCommitAncestor: (ancestor: string, candidate: string) => boolean = (ancestor, candidate) => ancestor === candidate,
) => {
  const validation = validateVisualReviewReport(previousReport);
  if (validation.errors.length > 0) {
    throw new Error(`Previous visual review report is invalid: ${validation.errors.join("; ")}`);
  }
  if (!isRecord(previousReport)) throw new Error("Previous visual review report must be an object.");
  if (previousReport.status !== "rejected" || !isRecord(previousReport.decision) || previousReport.decision.approved !== false) {
    throw new Error("A correction render requires a rejected visual review report.");
  }
  const previousArtifact = isRecord(previousReport.artifact) ? previousReport.artifact : {};
  const currentArtifact = currentReport.artifact;
  if (previousArtifact.name !== currentArtifact.name) {
    throw new Error("The previous visual review report must belong to the same outputName.");
  }
  if (!isVideoSha(previousArtifact.videoSha256)) throw new Error("Previous report has no valid artifact video hash.");
  if (previousArtifact.videoSha256 === currentArtifact.videoSha256) {
    throw new Error("The new render has the same video hash as the rejected render; create a genuinely new render before recording an iteration.");
  }

  const findings = Array.isArray(previousReport.findings)
    ? previousReport.findings.filter(isRecord)
    : [];
  const corrections = Array.isArray(previousReport.corrections)
    ? previousReport.corrections.filter(isRecord)
    : [];
  const openFindings = findings.filter(finding => finding.status === "open");
  if (openFindings.length === 0) {
    throw new Error("The rejected report has no open findings to correct; resolve or accept findings before another iteration.");
  }

  const currentIteration = currentReport.renderIterations[0];
  if (!currentIteration) throw new Error("The new render has no iteration provenance.");
  const candidateSha = currentIteration.candidateSha;
  const correctionIds: string[] = [];
  for (const finding of openFindings) {
    const applied = corrections.filter(correction =>
      correction.findingId === finding.id &&
      (correction.status === "applied" || correction.status === "verified") &&
      isCommitSha(correction.appliedInCommit) &&
      isCommitAncestor(correction.appliedInCommit, candidateSha),
    );
    if (applied.length === 0) {
      throw new Error(`Open finding ${String(finding.id)} has no applied correction in the frozen render candidate ${candidateSha}.`);
    }
    for (const correction of applied) {
      if (typeof correction.id !== "string" || !correction.id.trim()) {
        throw new Error(`Correction for finding ${String(finding.id)} needs a stable id before it can be tracked across renders.`);
      }
      if (!correctionIds.includes(correction.id)) correctionIds.push(correction.id);
    }
  }

  const existingIterations = Array.isArray(previousReport.renderIterations) && previousReport.renderIterations.length > 0
    ? previousReport.renderIterations.filter(isRecord)
    : [createLegacyIteration(previousReport, previousArtifact.videoSha256)];
  const nextIteration = createRenderIteration(
    currentArtifact.videoSha256,
    {
      candidateSha: currentIteration.candidateSha,
      sourceCommit: currentIteration.sourceCommit,
      requestId: currentIteration.requestId,
      workflowRunId: currentIteration.workflowRunId,
      runUrl: currentIteration.runUrl,
      renderedAt: currentIteration.renderedAt,
    },
    existingIterations.length + 1,
    previousArtifact.videoSha256,
    correctionIds,
  );

  const nextCorrections = corrections.map(correction => {
    const history = Array.isArray(correction.verificationHistory)
      ? [...correction.verificationHistory]
      : [];
    if (isRecord(correction.verification)) history.push(correction.verification);
    const { verification: _oldVerification, ...rest } = correction;
    const previouslyApplied = correction.status === "applied" || correction.status === "verified";
    return {
      ...rest,
      status: previouslyApplied ? "applied" : correction.status,
      verified: false,
      ...(history.length > 0 ? { verificationHistory: history } : {}),
    };
  });

  return {
    ...currentReport,
    artifact: currentArtifact,
    renderIterations: [...existingIterations, nextIteration],
    findings: findings.map(finding => ({
      ...finding,
      status: finding.status === "accepted" ? "accepted" : "open",
    })),
    corrections: nextCorrections,
  };
};

const isGitAncestor = (ancestor: string, candidate: string): boolean => {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, candidate], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const main = async () => {
  const outputName = process.env.OUTPUT_NAME;
  if (!outputName) throw new Error("OUTPUT_NAME is required.");
  const videoPath = resolve(process.env.VIDEO_PATH ?? `render-output/${outputName}.mp4`);
  const sheetReportPath = resolve(process.env.CONTACT_SHEET_REPORT_PATH ?? `render-output/review/${outputName}.contact-sheet.json`);
  const reportPath = resolve(process.env.VISUAL_REVIEW_REPORT_PATH ?? `render-output/review/${outputName}.visual-review.json`);
  const requestPath = resolve(process.env.RENDER_REQUEST_PATH ?? "render-request.json");
  const video = await readFile(videoPath);
  const sheetReport = JSON.parse(await readFile(sheetReportPath, "utf8"));
  const request = JSON.parse(await readFile(requestPath, "utf8"));
  const sourceCommit = process.env.GITHUB_SHA ?? "";
  const runId = process.env.GITHUB_RUN_ID ?? "";
  const repository = process.env.GITHUB_REPOSITORY ?? "";
  const server = process.env.GITHUB_SERVER_URL ?? "https://github.com";
  if (typeof request.requestId !== "string" || typeof request.candidateSha !== "string") {
    throw new Error("Render request must include requestId and candidateSha.");
  }
  const renderContext: RenderContext = {
    candidateSha: request.candidateSha,
    sourceCommit,
    requestId: request.requestId,
    workflowRunId: runId,
    runUrl: repository && runId ? `${server}/${repository}/actions/runs/${runId}` : "",
    renderedAt: new Date().toISOString(),
  };
  const currentReport = buildVisualReviewReport({
    outputName,
    videoPath: `${outputName}.mp4`,
    contactSheetPath: `review/${outputName}.contact-sheet.jpg`,
    contactSheetReportPath: `review/${outputName}.contact-sheet.json`,
    videoSha256: sha256Buffer(video),
    contactSheetReport: sheetReport,
    renderContext,
  });
  const historyPath = process.env.VISUAL_REVIEW_HISTORY_PATH;
  const report = historyPath
    ? appendVisualReviewIteration(
      JSON.parse(await readFile(resolve(historyPath), "utf8")),
      currentReport,
      isGitAncestor,
    )
    : currentReport;
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  const latestIteration = report.renderIterations.at(-1);
  if (!latestIteration) throw new Error("The generated visual review report has no render iteration.");
  const iteration = latestIteration.iteration;
  const summary = `Visual review: PENDING — render iteration ${iteration}; inspect the actual MP4, then complete ${outputName}.visual-review.json. Contact sheet is sampling evidence only; it does not approve motion or audio.`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
