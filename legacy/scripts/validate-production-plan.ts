import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { validateRenderStrategy } from "./director-compositions";

type Plan = {
  schemaVersion?: unknown;
  id?: unknown;
  title?: unknown;
  delivery?: {
    durationSeconds?: unknown;
    width?: unknown;
    height?: unknown;
    fps?: unknown;
    format?: unknown;
  };
  creativeDirection?: {
    objective?: unknown;
    audience?: unknown;
    concept?: unknown;
    visualSystem?: unknown;
    motionLanguage?: unknown;
    soundDirection?: unknown;
  };
  shots?: Array<{
    id?: unknown;
    startSeconds?: unknown;
    durationSeconds?: unknown;
    purpose?: unknown;
    visual?: unknown;
    visualMethod?: unknown;
    action?: unknown;
    visualProgression?: unknown;
    framing?: unknown;
    cameraMovement?: unknown;
    transition?: unknown;
    audio?: unknown;
    narrativeBeat?: unknown;
    implementationNotes?: unknown;
    engineApproach?: unknown;
    assets?: unknown;
  }>;
  renderStrategy?: unknown;
  assetVisualReviewRequired?: unknown;
  acceptanceCriteria?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const validateAcceptanceCoverage = (value: unknown): string[] => {
  if (!isRecord(value) || value.acceptanceCoverage === undefined) return [];
  const errors: string[] = [];
  if (!Array.isArray(value.acceptanceCriteria) || !Array.isArray(value.shots)) return errors;
  if (!Array.isArray(value.acceptanceCoverage)) return ["acceptanceCoverage must be an array when provided."];
  if (value.acceptanceCoverage.length < 3 || value.acceptanceCoverage.length > 10) errors.push("acceptanceCoverage must contain 3–10 entries when provided.");
  const criteria = value.acceptanceCriteria.filter((item): item is string => typeof item === "string");
  if (criteria.some((criterion) => criterion.length > 300)) errors.push("acceptanceCriteria entries must be at most 300 characters.");
  if (new Set(criteria).size !== criteria.length) errors.push("acceptanceCriteria must not contain duplicates.");
  const knownShots = new Set(value.shots.flatMap((shot) => isRecord(shot) && typeof shot.id === "string" ? [shot.id] : []));
  const covered = new Set<string>();
  value.acceptanceCoverage.forEach((entry, index) => {
    const prefix = `acceptanceCoverage[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`${prefix} must be an object.`);
      return;
    }
    const criterion = entry.criterion;
    if (typeof criterion !== "string" || !criteria.includes(criterion)) {
      errors.push(`${prefix}.criterion must exactly match an acceptanceCriteria entry.`);
    } else if (covered.has(criterion)) {
      errors.push(`${prefix}.criterion is duplicated.`);
    } else {
      covered.add(criterion);
    }
    const shotIds = entry.shotIds;
    if (typeof criterion === "string" && criterion.length > 300) errors.push(`${prefix}.criterion must be at most 300 characters.`);
    if (!Array.isArray(shotIds) || shotIds.length === 0 || shotIds.length > 80 || shotIds.some((id) => typeof id !== "string" || !id.trim())) {
      errors.push(`${prefix}.shotIds must contain 1–80 non-empty shot IDs.`);
    } else {
      const local = new Set<string>();
      shotIds.forEach((id) => {
        if (local.has(id)) errors.push(`${prefix}.shotIds contains duplicate ID "${id}".`);
        local.add(id);
        if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(id)) errors.push(`${prefix}.shotIds contains invalid shot ID "${id}".`);
        if (!knownShots.has(id)) errors.push(`${prefix}.shotIds references unknown shot "${id}".`);
      });
    }
    if (typeof entry.rationale !== "string" || !entry.rationale.trim() || entry.rationale.length > 500) {
      errors.push(`${prefix}.rationale must be a non-empty string of at most 500 characters.`);
    }
  });
  criteria.forEach((criterion) => {
    if (!covered.has(criterion)) errors.push(`acceptanceCoverage is missing criterion: ${criterion}`);
  });
  return errors;
};

export const validateProductionPlan = (value: unknown): string[] => {
  const errors: string[] = [];
  if (!isRecord(value)) return ["Plan must be a JSON object."];
  const plan = value as Plan;

  if (plan.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (typeof plan.id !== "string" || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(plan.id)) {
    errors.push("id must be a lowercase slug (2–64 characters).");
  }
  if (typeof plan.title !== "string" || !plan.title.trim()) errors.push("title is required.");

  const delivery = plan.delivery;
  const totalDurationSeconds =
    delivery && typeof delivery.durationSeconds === "number" && Number.isFinite(delivery.durationSeconds)
      ? delivery.durationSeconds
      : null;
  if (!delivery || typeof delivery !== "object") {
    errors.push("delivery is required.");
  } else {
    const { durationSeconds, width, height, fps, format } = delivery;
    if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 300) {
      errors.push("delivery.durationSeconds must be greater than 0 and no more than 300.");
    }
    if (!Number.isInteger(width) || Number(width) < 320 || Number(width) > 7680) errors.push("delivery.width must be an integer from 320 to 7680.");
    if (!Number.isInteger(height) || Number(height) < 320 || Number(height) > 4320) errors.push("delivery.height must be an integer from 320 to 4320.");
    if (![24, 25, 30, 50, 60].includes(Number(fps))) errors.push("delivery.fps must be 24, 25, 30, 50 or 60.");
    if (format !== "mp4") errors.push("delivery.format must be mp4.");
    if (typeof durationSeconds === "number" && Number.isFinite(durationSeconds) &&
        [24, 25, 30, 50, 60].includes(Number(fps)) &&
        !Number.isInteger(durationSeconds * Number(fps))) {
      errors.push("durationSeconds × fps must resolve to a whole number of frames.");
    }
  }

  const direction = plan.creativeDirection;
  if (!direction || typeof direction !== "object") {
    errors.push("creativeDirection is required.");
  } else {
    for (const field of ["objective", "audience", "concept", "motionLanguage", "soundDirection"] as const) {
      const fieldValue = direction[field];
      if (typeof fieldValue !== "string" || !fieldValue.trim()) {
        errors.push(`creativeDirection.${field} is required.`);
      }
    }
    if (!isRecord(direction.visualSystem)) errors.push("creativeDirection.visualSystem is required.");
  }

  if (!Array.isArray(plan.shots) || plan.shots.length === 0 || plan.shots.length > 80) {
    errors.push("shots must contain between 1 and 80 entries.");
  } else if (totalDurationSeconds !== null) {
    const shots = plan.shots;
    const ids = new Set<string>();
    let previousStart = -1;
    shots.forEach((shot, index) => {
      if (!isRecord(shot)) {
        errors.push(`shots[${index}] must be an object.`);
        return;
      }
      if (typeof shot.id !== "string" || !shot.id.trim() || ids.has(shot.id)) {
        errors.push(`shots[${index}].id must be a unique non-empty string.`);
      } else {
        ids.add(shot.id);
      }
      const start = Number(shot.startSeconds);
      const duration = Number(shot.durationSeconds);
      if (!Number.isFinite(start) || start < 0) errors.push(`shots[${index}].startSeconds must be non-negative.`);
      if (!Number.isFinite(duration) || duration <= 0) errors.push(`shots[${index}].durationSeconds must be greater than zero.`);
      if (Number.isFinite(start) && start < previousStart) errors.push("shots must be ordered by startSeconds.");
      if (Number.isFinite(start)) previousStart = start;
      if (Number.isFinite(start) && Number.isFinite(duration) && start + duration > totalDurationSeconds + 1e-6) {
        errors.push(`shots[${index}] extends beyond the delivery duration.`);
      }
      if (shot.narrativeBeat !== undefined && (typeof shot.narrativeBeat !== "string" || !["hook", "setup", "context", "development", "escalation", "reveal", "payoff", "cta", "transition", "pause"].includes(shot.narrativeBeat))) errors.push(`shots[${index}].narrativeBeat must be one of the supported narrative beat labels.`);
      for (const field of ["purpose", "visual", "visualMethod", "action", "visualProgression", "framing", "cameraMovement", "transition", "audio"] as const) {
        const fieldValue = shot[field];
        if (typeof fieldValue !== "string" || !fieldValue.trim()) {
          errors.push(`shots[${index}].${field} is required.`);
        }
      }
      if (shot.engineApproach !== undefined && !["project-video", "custom-remotion", "external-footage"].includes(String(shot.engineApproach))) errors.push(`shots[${index}].engineApproach is unsupported.`);
      if (shot.implementationNotes !== undefined && (typeof shot.implementationNotes !== "string" || shot.implementationNotes.length > 500)) errors.push(`shots[${index}].implementationNotes must be a string of at most 500 characters.`);
      if (shot.assets !== undefined && (!Array.isArray(shot.assets) || shot.assets.some((asset) => typeof asset !== "string" || asset.length > 120))) errors.push(`shots[${index}].assets must be an array of strings (each at most 120 characters).`);
    });
    const first = shots[0];
    const last = shots[shots.length - 1];
    if (first && Number(first.startSeconds) !== 0) errors.push("The first shot must start at 0 seconds.");
    if (last && Number.isFinite(Number(last.startSeconds)) && Number.isFinite(Number(last.durationSeconds)) &&
        Math.abs(Number(last.startSeconds) + Number(last.durationSeconds) - totalDurationSeconds) > 1e-6) {
      errors.push("The final shot must end at delivery.durationSeconds.");
    }
  }

  if (!Array.isArray(plan.acceptanceCriteria) || plan.acceptanceCriteria.length < 3 || plan.acceptanceCriteria.length > 10 ||
      plan.acceptanceCriteria.some((item) => typeof item !== "string" || !item.trim() || item.length > 300)) {
    errors.push("acceptanceCriteria must contain 3–10 non-empty strings.");
  }

  if (plan.assetVisualReviewRequired !== undefined && typeof plan.assetVisualReviewRequired !== "boolean") errors.push("assetVisualReviewRequired must be a boolean when provided.");

  errors.push(...validateRenderStrategy(plan.renderStrategy));
  errors.push(...validateAcceptanceCoverage(plan));
  return errors;
};

// Keep imports side-effect free so tests and other tools can reuse the validator.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    process.stderr.write("Usage: npm run validate:plan -- <production-plan.json>\n");
    process.exitCode = 2;
  } else {
    try {
      const raw = await readFile(inputPath, "utf8");
      const plan: unknown = JSON.parse(raw);
      const errors = validateProductionPlan(plan);
      if (errors.length > 0) {
        process.stderr.write(errors.map((error) => `- ${error}`).join("\n") + "\n");
        process.exitCode = 1;
      } else {
        process.stdout.write(`Production plan valid: ${inputPath}\n`);
      }
    } catch (error) {
      process.stderr.write(`Could not validate production plan: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  }
}
