import { lstat, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

export const PRODUCTION_STAGES = [
  "brief",
  "direction",
  "storyboard",
  "assets",
  "build",
  "render-ready",
  "frozen",
  "rendered",
  "qa",
  "accepted",
  "delivered",
] as const;

export type ProductionStage = typeof PRODUCTION_STAGES[number];

export type ProductionState = {
  schemaVersion: 1;
  projectId: string;
  stage: ProductionStage;
  updatedAt: string;
  evidence: Partial<Record<ProductionStage, string[]>>;
};

export type StateValidationOptions = {
  expectedProjectId?: string;
  requireEvidence?: boolean;
};

export type EvidenceFileValidationOptions = StateValidationOptions & {
  repositoryRoot: string;
  projectRoot: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isWithin = (root: string, target: string): boolean => {
  const path = relative(root, target);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
};

/**
 * Resolve an evidence reference to a regular file contained in the project.
 * Absolute paths, traversal, empty segments, symlinks and directories are rejected.
 */
export const resolveProductionEvidenceFile = async (
  projectRootInput: string,
  reference: string,
): Promise<string> => {
  const projectRoot = await realpath(resolve(projectRootInput));
  if (!reference.trim() || reference.includes("\\") || reference.startsWith("/") ||
      reference.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Evidence reference is not a safe project-relative path: "${reference}".`);
  }
  const candidate = resolve(projectRoot, reference);
  if (!isWithin(projectRoot, candidate)) {
    throw new Error(`Evidence reference escapes the project root: "${reference}".`);
  }
  const details = await lstat(candidate);
  if (details.isSymbolicLink()) {
    throw new Error(`Evidence references cannot be symbolic links: "${reference}".`);
  }
  if (!details.isFile()) {
    throw new Error(`Evidence reference is not a regular file: "${reference}".`);
  }
  const actual = await realpath(candidate);
  if (!isWithin(projectRoot, actual)) {
    throw new Error(`Evidence reference resolves outside the project root: "${reference}".`);
  }
  const actualDetails = await stat(actual);
  if (!actualDetails.isFile() || actualDetails.size <= 0) {
    throw new Error(`Evidence file is missing, empty or not a regular file: "${reference}".`);
  }
  return actual;
};

export const validateProductionEvidenceFiles = async (
  value: unknown,
  options: EvidenceFileValidationOptions,
): Promise<string[]> => {
  const errors = validateProductionState(value, options);
  if (!isRecord(value) || !isRecord(value.evidence)) return errors;
  let projectRoot: string;
  try {
    projectRoot = await realpath(resolve(options.projectRoot));
    const repositoryRoot = await realpath(resolve(options.repositoryRoot));
    if (!isWithin(repositoryRoot, projectRoot)) {
      return [...errors, "projectRoot must be contained within repositoryRoot."];
    }
  } catch (error) {
    return [...errors, `Could not resolve project/repository root: ${error instanceof Error ? error.message : String(error)}`];
  }
  for (const [stage, references] of Object.entries(value.evidence)) {
    if (!PRODUCTION_STAGES.includes(stage as ProductionStage) || !Array.isArray(references)) continue;
    for (const reference of references) {
      if (typeof reference !== "string" || !reference.trim()) continue;
      try {
        await resolveProductionEvidenceFile(projectRoot, reference);
      } catch (error) {
        errors.push(`evidence.${stage} reference "${reference}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return errors;
};

export const validateProductionState = (
  value: unknown,
  options: StateValidationOptions = {},
): string[] => {
  const errors: string[] = [];
  if (!isRecord(value)) return ["Production state must be a JSON object."];
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (typeof value.projectId !== "string" || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(value.projectId)) {
    errors.push("projectId must be a lowercase slug (2–64 characters).");
  }
  if (options.expectedProjectId && value.projectId !== options.expectedProjectId) {
    errors.push(`projectId "${String(value.projectId)}" does not match expected project "${options.expectedProjectId}".`);
  }
  if (typeof value.stage !== "string" || !PRODUCTION_STAGES.includes(value.stage as ProductionStage)) {
    errors.push(`stage must be one of: ${PRODUCTION_STAGES.join(", ")}.`);
  }
  if (typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) {
    errors.push("updatedAt must be a valid ISO-compatible timestamp.");
  }
  if (!isRecord(value.evidence)) {
    errors.push("evidence must be an object keyed by production stage.");
  } else {
    for (const [stage, refs] of Object.entries(value.evidence)) {
      if (!PRODUCTION_STAGES.includes(stage as ProductionStage)) {
        errors.push(`evidence contains unknown stage "${stage}".`);
        continue;
      }
      if (!Array.isArray(refs) || refs.length === 0 || refs.some((ref) => typeof ref !== "string" || !ref.trim() || ref.length > 240)) {
        errors.push(`evidence.${stage} must contain one or more non-empty artifact references (maximum 240 characters each).`);
      }
    }
    const currentStage = value.stage;
    if (options.requireEvidence && typeof currentStage === "string" &&
        PRODUCTION_STAGES.includes(currentStage as ProductionStage) &&
        !Array.isArray(value.evidence[currentStage])) {
      errors.push(`evidence for current stage "${currentStage}" is required when --require-evidence is used.`);
    }
    const stageIndex = PRODUCTION_STAGES.indexOf(value.stage as ProductionStage);
    for (let index = 0; index <= stageIndex && index >= 0; index += 1) {
      const completed = PRODUCTION_STAGES[index]!;
      if (options.requireEvidence && !Array.isArray(value.evidence[completed])) {
        errors.push(`evidence for completed stage "${completed}" is missing.`);
      }
    }
  }
  return errors;
};

const run = async (): Promise<void> => {
  const path = process.argv[2];
  const expectedProjectId = process.argv[3];
  const requireEvidence = process.argv.includes("--require-evidence");
  const verifyEvidenceFiles = process.argv.includes("--verify-evidence-files");
  const projectRootFlag = process.argv.indexOf("--project-root");
  const repositoryRoot = process.cwd();
  const projectRoot = projectRootFlag >= 0 ? process.argv[projectRootFlag + 1] : undefined;
  if (!path) {
    process.stderr.write("Usage: tsx scripts/production-state.ts <production-state.json> [expected-project-id] [--require-evidence] [--verify-evidence-files --project-root <project-dir>]\n");
    process.exitCode = 2;
    return;
  }
  try {
    const value: unknown = JSON.parse(await readFile(resolve(path), "utf8"));
    const errors = verifyEvidenceFiles
      ? projectRoot
        ? await validateProductionEvidenceFiles(value, { ...(expectedProjectId === undefined ? {} : { expectedProjectId }), requireEvidence, repositoryRoot, projectRoot })
        : ["--verify-evidence-files requires --project-root <project-dir>."]
      : validateProductionState(value, {
          ...(expectedProjectId === undefined ? {} : { expectedProjectId }),
          requireEvidence,
        });
    if (errors.length) {
      process.stderr.write(errors.map((error) => `- ${error}`).join("\n") + "\n");
      process.exitCode = 1;
      return;
    }
    const state = value as ProductionState;
    process.stdout.write(`Production state valid: ${state.projectId} / ${state.stage}\n`);
  } catch (error) {
    process.stderr.write(`Could not validate production state: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await run();
}
