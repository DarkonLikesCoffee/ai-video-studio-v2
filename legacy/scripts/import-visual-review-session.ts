import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validatePlaybackSession, validateVisualReviewReport } from "./visual-review-validate";

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const applyPlaybackSessionToReport = (
  reportInput: unknown,
  sessionInput: unknown,
  reviewerInput: string,
) => {
  if (!isRecord(reportInput)) throw new Error("Visual review report must be a JSON object.");
  if (reportInput.status !== "pending-review") {
    throw new Error("Playback evidence can only be imported into a pending-review report.");
  }
  if (typeof reviewerInput !== "string" || !reviewerInput.trim()) {
    throw new Error("A non-empty reviewer name is required.");
  }

  const before = validateVisualReviewReport(reportInput);
  if (before.errors.length > 0) {
    throw new Error(`Visual review report is invalid: ${before.errors.join("; ")}`);
  }
  const artifact = isRecord(reportInput.artifact) ? reportInput.artifact : {};
  const sessionErrors = validatePlaybackSession(sessionInput, artifact);
  if (sessionErrors.length > 0) {
    throw new Error(`Playback session is invalid: ${sessionErrors.join("; ")}`);
  }
  if (!isRecord(reportInput.inspection) || !isRecord(sessionInput)) {
    throw new Error("Report inspection and playback session must be JSON objects.");
  }

  const session = structuredClone(sessionInput);
  const next = {
    ...reportInput,
    inspection: {
      ...reportInput.inspection,
      method: "tracked-full-playback",
      fullVideoWatched: true,
      timestampsReviewedSeconds: session.checkpointsSeconds,
      reviewer: reviewerInput.trim(),
      reviewedAt: session.completedAt,
      playbackSession: session,
    },
  };

  const after = validateVisualReviewReport(next);
  if (after.errors.length > 0) {
    throw new Error(`Imported review evidence did not validate: ${after.errors.join("; ")}`);
  }
  return next;
};

const readFlag = (args: string[], flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const main = async () => {
  const args = process.argv.slice(2);
  const reportPath = readFlag(args, "--report");
  const sessionPath = readFlag(args, "--session");
  const reviewer = readFlag(args, "--reviewer");
  if (!reportPath || !sessionPath || !reviewer) {
    throw new Error(
      "Usage: npm run qa:visual-review-session -- --report <report.json> --session <visual-review-session.json> --reviewer <name>",
    );
  }
  const absoluteReportPath = resolve(reportPath);
  const [report, session] = await Promise.all([
    readFile(absoluteReportPath, "utf8").then(value => JSON.parse(value)),
    readFile(resolve(sessionPath), "utf8").then(value => JSON.parse(value)),
  ]);
  const updated = applyPlaybackSessionToReport(report, session, reviewer);
  await writeFile(absoluteReportPath, JSON.stringify(updated, null, 2) + "\n", "utf8");
  console.log("Full-playback evidence imported and validated against the report's current MP4 hash.");
  console.log("The report remains pending-review; playback does not make the creative approval decision.");
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
