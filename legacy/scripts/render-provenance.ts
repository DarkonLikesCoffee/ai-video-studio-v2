import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

type JsonRecord = Record<string, unknown>;
type RenderRequest = {
  provider: string;
  compositionId: string;
  outputName: string;
  requestId: string;
  projectPath?: string;
  narrationPath?: string;
};
type ArtifactFileSpec = { filePath: string; artifactPath: string; required?: boolean };
type ArtifactFileEvidence = { path: string; sizeBytes: number; sha256: string };
type RenderMetadata = { repository?: string; commit?: string; ref?: string; branch?: string; workflow?: string; actor?: string; runId?: string; runAttempt?: string; runUrl?: string };
type RenderMetadataInput = { [Key in keyof RenderMetadata]?: RenderMetadata[Key] | undefined };

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const asRecord = (value: unknown): JsonRecord => isRecord(value) ? value : {};
const stringValue = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value : undefined;
const numberValue = (value: unknown): number | undefined => typeof value === "number" && Number.isFinite(value) ? value : undefined;

export const buildRenderMetadata = (values: RenderMetadataInput): RenderMetadata => ({
  ...(values.repository ? { repository: values.repository } : {}),
  ...(values.commit ? { commit: values.commit } : {}),
  ...(values.ref ? { ref: values.ref } : {}),
  ...(values.branch ? { branch: values.branch } : {}),
  ...(values.workflow ? { workflow: values.workflow } : {}),
  ...(values.actor ? { actor: values.actor } : {}),
  ...(values.runId ? { runId: values.runId } : {}),
  ...(values.runAttempt ? { runAttempt: values.runAttempt } : {}),
  ...(values.runUrl ? { runUrl: values.runUrl } : {}),
});

export const normalizeArtifactPath = (filePath: string, workspace = process.cwd()): string =>
  relative(resolve(workspace), resolve(workspace, filePath)).replace(/\\/g, "/");

export const sha256File = (filePath: string): Promise<string> =>
  new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", chunk => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });

export const collectArtifactFiles = async (specs: ArtifactFileSpec[]): Promise<ArtifactFileEvidence[]> => {
  const files: ArtifactFileEvidence[] = [];
  for (const spec of specs) {
    let details;
    try {
      details = await stat(spec.filePath);
    } catch (error) {
      if (!spec.required) continue;
      throw new Error(`Required render artifact file is missing: ${spec.artifactPath} (${error instanceof Error ? error.message : String(error)})`);
    }
    if (!details.isFile()) {
      if (!spec.required) continue;
      throw new Error(`Required render artifact path is not a file: ${spec.artifactPath}`);
    }
    files.push({ path: spec.artifactPath, sizeBytes: details.size, sha256: await sha256File(spec.filePath) });
  }
  return files;
};

const summarizeProject = (project: unknown, projectPath?: string) => {
  const value = asRecord(project);
  const id = stringValue(value.id) ?? stringValue(value.projectId);
  return {
    ...(id ? { id } : projectPath ? { id: basename(dirname(projectPath)) } : {}),
    ...(stringValue(value.title) ? { title: stringValue(value.title) } : {}),
    ...(projectPath ? { path: projectPath } : {}),
  };
};

export const summarizeMediaQa = (report: unknown, reportPath: string) => {
  const value = asRecord(report);
  const format = asRecord(value.format);
  const measurements = asRecord(value.measurements);
  return {
    reportPath,
    ...(typeof value.passed === "boolean" ? { passed: value.passed } : {}),
    ...(numberValue(format.durationSeconds) === undefined ? {} : { durationSeconds: format.durationSeconds }),
    ...(numberValue(format.sizeBytes) === undefined ? {} : { sizeBytes: format.sizeBytes }),
    ...(stringValue(format.formatName) ? { formatName: format.formatName } : {}),
    ...(isRecord(value.video) ? { video: value.video } : {}),
    ...(isRecord(value.audio) ? { audio: value.audio } : {}),
    findings: Array.isArray(value.findings) ? value.findings.filter(isRecord).map(finding => ({
      severity: finding.severity,
      code: finding.code,
      message: finding.message,
      ...(numberValue(finding.startSeconds) === undefined ? {} : { startSeconds: finding.startSeconds }),
      ...(numberValue(finding.durationSeconds) === undefined ? {} : { durationSeconds: finding.durationSeconds }),
    })) : [],
    measurements: {
      silenceIntervals: Array.isArray(measurements.silenceIntervals) ? measurements.silenceIntervals : [],
      frozenIntervals: Array.isArray(measurements.frozenIntervals) ? measurements.frozenIntervals : [],
      blackIntervals: Array.isArray(measurements.blackIntervals) ? measurements.blackIntervals : [],
      ...(stringValue(measurements.loudnessSummary) ? { loudnessSummary: measurements.loudnessSummary } : {}),
      ...(numberValue(measurements.truePeakDbfs) === undefined ? {} : { truePeakDbfs: measurements.truePeakDbfs }),
      ...(numberValue(measurements.audioVideoDurationDriftSeconds) === undefined ? {} : { audioVideoDurationDriftSeconds: measurements.audioVideoDurationDriftSeconds }),
      ...(numberValue(measurements.audioVideoStartOffsetSeconds) === undefined ? {} : { audioVideoStartOffsetSeconds: measurements.audioVideoStartOffsetSeconds }),
    },
  };
};

export const summarizeContactSheet = (report: unknown, imagePath: string, reportPath: string) => {
  const value = asRecord(report);
  return {
    imagePath,
    reportPath,
    ...(numberValue(value.durationSeconds) === undefined ? {} : { durationSeconds: value.durationSeconds }),
    ...(numberValue(value.frameCount) === undefined ? {} : { frameCount: value.frameCount }),
    ...(numberValue(value.rows) === undefined ? {} : { rows: value.rows }),
    ...(Array.isArray(value.sampleTimestampsSeconds) ? { sampleTimestampsSeconds: value.sampleTimestampsSeconds } : {}),
    ...(isRecord(value.options) ? { options: value.options } : {}),
  };
};

export const summarizeAssetEvidence = (report: unknown, reportPath: string) => {
  const value = asRecord(report);
  const summary = asRecord(value.summary);
  const issues = Array.isArray(value.issues) ? value.issues.filter(isRecord) : [];
  const countKeys = [
    "shotCount", "assetCount", "criterionCount", "linkedCriteria", "partialCriteria", "unlinkedCriteria",
    "missingFiles", "assetsNotLocal", "emptyFiles", "unsafePaths", "missingProvenance", "missingRights",
    "unresolvedPlannedAssetRefs", "unknownManifestShotIds",
  ];
  return {
    reportPath,
    ...(stringValue(value.reportType) ? { reportType: value.reportType } : {}),
    ...(stringValue(summary.status) ? { status: summary.status } : stringValue(value.status) ? { status: value.status } : {}),
    ...Object.fromEntries(countKeys.filter(key => numberValue(summary[key]) !== undefined).map(key => [key, summary[key]])),
    issueCount: issues.length,
    warningCount: issues.filter(issue => issue.severity === "warning").length,
    errorCount: issues.filter(issue => issue.severity === "error").length,
  };
};

export const buildRenderProvenance = (input: {
  request: RenderRequest;
  metadata: RenderMetadata;
  sourceProjectPath?: string;
  renderProjectPath?: string;
  sourceProject?: unknown;
  renderProject?: unknown;
  files: ArtifactFileEvidence[];
  mediaQa: unknown;
  mediaQaPath: string;
  contactSheet: unknown;
  contactSheetImagePath: string;
  contactSheetReportPath: string;
  assetEvidence: unknown;
  assetEvidencePath: string;
  generatedAt?: string;
}) => {
  const m = input.metadata;
  return {
    schemaVersion: 1,
    reportType: "render-provenance",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    source: {
      ...(m.repository ? { repository: m.repository } : {}),
      ...(m.commit ? { commit: m.commit } : {}),
      ...(m.ref ? { ref: m.ref } : {}),
      ...(m.branch ? { branch: m.branch } : {}),
      ...(m.workflow ? { workflow: m.workflow } : {}),
      ...(m.actor ? { actor: m.actor } : {}),
      workflowRun: {
        ...(m.runId ? { id: m.runId } : {}),
        ...(m.runAttempt ? { attempt: m.runAttempt } : {}),
        ...(m.runUrl ? { url: m.runUrl } : {}),
      },
    },
    request: {
      provider: input.request.provider,
      compositionId: input.request.compositionId,
      outputName: input.request.outputName,
      requestId: input.request.requestId,
      ...(input.request.projectPath ? { projectPath: input.request.projectPath } : {}),
      ...(input.request.narrationPath ? { narrationPath: input.request.narrationPath } : {}),
    },
    project: {
      source: summarizeProject(input.sourceProject, input.sourceProjectPath),
      rendered: summarizeProject(input.renderProject, input.renderProjectPath),
    },
    artifact: { name: input.request.outputName, manifestPath: `${input.request.outputName}.provenance.json`, files: input.files },
    mediaQa: summarizeMediaQa(input.mediaQa, input.mediaQaPath),
    assetEvidence: summarizeAssetEvidence(input.assetEvidence, input.assetEvidencePath),
    contactSheet: summarizeContactSheet(input.contactSheet, input.contactSheetImagePath, input.contactSheetReportPath),
  };
};

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await readFile(filePath, "utf8"));
const readOptionalJson = async (filePath?: string): Promise<unknown> =>
  filePath ? readJson(filePath) : undefined;

const main = async () => {
  const requestPath = resolve(process.env.RENDER_REQUEST_PATH ?? "render-request.json");
  const request = await readJson(requestPath) as RenderRequest;
  const outputName = process.env.OUTPUT_NAME ?? request.outputName;
  const sourceProjectPath = process.env.SOURCE_PROJECT_PATH || request.projectPath;
  const renderProjectPath = process.env.RENDER_PROJECT_PATH || sourceProjectPath;
  const outputPath = resolve(process.env.RENDER_OUTPUT_PATH ?? `render-output/${outputName}.mp4`);
  const mediaQaPath = resolve(process.env.MEDIA_QA_REPORT_PATH ?? `render-output/${outputName}.qa.json`);
  const contactSheetImagePath = resolve(process.env.CONTACT_SHEET_IMAGE_PATH ?? `render-output/review/${outputName}.contact-sheet.jpg`);
  const contactSheetReportPath = resolve(process.env.CONTACT_SHEET_REPORT_PATH ?? `render-output/review/${outputName}.contact-sheet.json`);
  const assetEvidencePath = resolve(process.env.ASSET_EVIDENCE_REPORT_PATH ?? `render-output/${outputName}.asset-evidence.json`);
  const creditsPath = resolve(process.env.CREDITS_PATH ?? `render-output/${outputName}-credits.txt`);
  const manifestPath = resolve(process.env.PROVENANCE_MANIFEST_PATH ?? `render-output/${outputName}.provenance.json`);
  const workspacePath = resolve(process.env.GITHUB_WORKSPACE ?? process.cwd());
  const artifactPath = (path: string) => normalizeArtifactPath(path, workspacePath);

  const files = await collectArtifactFiles([
    { filePath: outputPath, artifactPath: `${outputName}.mp4`, required: true },
    { filePath: mediaQaPath, artifactPath: `${outputName}.qa.json`, required: true },
    { filePath: contactSheetImagePath, artifactPath: `review/${outputName}.contact-sheet.jpg`, required: true },
    { filePath: contactSheetReportPath, artifactPath: `review/${outputName}.contact-sheet.json`, required: true },
    { filePath: assetEvidencePath, artifactPath: `${outputName}.asset-evidence.json`, required: true },
    { filePath: creditsPath, artifactPath: `${outputName}-credits.txt`, required: false },
  ]);

  const sourceProject = await readOptionalJson(sourceProjectPath);
  const renderProject = await readOptionalJson(renderProjectPath);
  const mediaQa = await readJson(mediaQaPath);
  const contactSheet = await readJson(contactSheetReportPath);
  const assetEvidence = await readJson(assetEvidencePath);
  const server = process.env.GITHUB_SERVER_URL ?? "https://github.com";
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  const runUrl = repository && runId ? `${server}/${repository}/actions/runs/${runId}` : undefined;
  const manifest = buildRenderProvenance({
    request,
    metadata: buildRenderMetadata({
      repository,
      commit: process.env.GITHUB_SHA,
      ref: process.env.GITHUB_REF,
      branch: process.env.GITHUB_REF_NAME,
      workflow: process.env.GITHUB_WORKFLOW,
      actor: process.env.GITHUB_ACTOR,
      runId,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT,
      runUrl,
    }),
    ...(sourceProjectPath ? { sourceProjectPath: artifactPath(sourceProjectPath) } : {}),
    ...(renderProjectPath ? { renderProjectPath: artifactPath(renderProjectPath) } : {}),
    sourceProject,
    renderProject,
    files,
    mediaQa,
    mediaQaPath: `${outputName}.qa.json`,
    contactSheet,
    contactSheetImagePath: `review/${outputName}.contact-sheet.jpg`,
    contactSheetReportPath: `review/${outputName}.contact-sheet.json`,
    assetEvidence,
    assetEvidencePath: `${outputName}.asset-evidence.json`,
  });
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  process.stdout.write(`Render provenance manifest: ${manifestPath}\n`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    process.stderr.write(`Render provenance failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
