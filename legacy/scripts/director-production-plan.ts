import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { validateCreativeBrief } from "./director-brief";
import { validateProductionPlan } from "./validate-production-plan";
import { validateRenderStrategy } from "./director-compositions";

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue => typeof value === "object" && value !== null && !Array.isArray(value);
const record = (value: unknown): RecordValue => isRecord(value) ? value : {};
const requiredText = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
};
const requiredNumber = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
  return value;
};
const supportedEngineApproaches = ["project-video", "custom-remotion", "external-footage"];

export type AcceptanceCoverage = { criterion: string; shotIds: string[]; rationale: string };
export type DirectorProductionPlan = RecordValue & {
  acceptanceCriteria: string[];
  acceptanceCoverage: AcceptanceCoverage[];
  shots: RecordValue[];
  renderStrategy: RecordValue;
};

export const buildProductionPlanFromStoryboard = (briefInput: unknown, storyboardInput: unknown): DirectorProductionPlan => {
  const briefErrors = validateCreativeBrief(briefInput);
  if (briefErrors.length) throw new Error(`Creative brief invalid:\n${briefErrors.map((error) => `- ${error}`).join("\n")}`);
  if (!isRecord(storyboardInput)) throw new Error("Storyboard must be a JSON object.");
  const brief = briefInput as RecordValue;
  const delivery = record(brief.delivery);
  const storyboard = storyboardInput;
  const storyboardDelivery = record(storyboard.delivery);
  for (const field of ["durationSeconds", "width", "height", "fps", "format"] as const) {
    if (storyboardDelivery[field] !== delivery[field]) {
      throw new Error(`Storyboard delivery.${field} must match the Creative Brief (${String(delivery[field])}).`);
    }
  }
  const direction = record(storyboard.creativeDirection);
  const visualSource = record(direction.visualSystem);
  const visualSystem: RecordValue = {
    palette: visualSource.palette,
    typography: visualSource.typography,
    composition: visualSource.composition,
    lighting: visualSource.lighting,
    ...(typeof visualSource.textureAndMaterials === "string"
      ? { textureAndMaterials: visualSource.textureAndMaterials }
      : typeof visualSource.texture === "string" ? { textureAndMaterials: visualSource.texture } : {}),
  };
  for (const field of ["palette", "typography", "composition", "lighting"] as const) {
    const value = visualSystem[field];
    if (field === "palette") {
      if (!Array.isArray(value) || value.length < 2 || value.some((item) => typeof item !== "string" || !item.trim())) {
        throw new Error("Storyboard creativeDirection.visualSystem.palette must contain at least two non-empty strings.");
      }
    } else requiredText(value, `Storyboard creativeDirection.visualSystem.${field}`);
  }
  if (visualSystem.textureAndMaterials !== undefined && (typeof visualSystem.textureAndMaterials !== "string" || visualSystem.textureAndMaterials.length > 500)) {
    throw new Error("Storyboard creativeDirection.visualSystem.textureAndMaterials must be a string of at most 500 characters.");
  }
  const shotsInput = storyboard.shots;
  if (!Array.isArray(shotsInput) || shotsInput.length === 0) throw new Error("Storyboard must contain at least one shot.");
  const shots = shotsInput.map((rawShot, index) => {
    if (!isRecord(rawShot)) throw new Error(`Storyboard shots[${index}] must be an object.`);
    const shot = rawShot;
    const id = requiredText(shot.id, `shots[${index}].id`);
    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(id)) throw new Error(`shots[${index}].id must be a lowercase slug.`);
    const assets = shot.assets === undefined ? [] : shot.assets;
    if (!Array.isArray(assets) || assets.some((asset) => typeof asset !== "string" || !asset.trim())) {
      throw new Error(`shots[${index}].assets must be an array of non-empty strings when provided.`);
    }
    const mapped: RecordValue = {
      id,
      startSeconds: requiredNumber(shot.startSeconds, `shots[${index}].startSeconds`),
      durationSeconds: requiredNumber(shot.durationSeconds, `shots[${index}].durationSeconds`),
      purpose: requiredText(shot.purpose, `shots[${index}].purpose`),
      visual: requiredText(shot.visual, `shots[${index}].visual`),
      visualMethod: requiredText(shot.visualMethod, `shots[${index}].visualMethod`),
      action: requiredText(shot.action, `shots[${index}].action`),
      visualProgression: requiredText(shot.visualProgression, `shots[${index}].visualProgression`),
      framing: requiredText(shot.framing, `shots[${index}].framing`),
      cameraMovement: requiredText(shot.cameraMovement, `shots[${index}].cameraMovement`),
      transition: requiredText(shot.transition, `shots[${index}].transition`),
      audio: requiredText(shot.audio, `shots[${index}].audio`),
      assets,
    };
    if (shot.narrativeBeat !== undefined) mapped.narrativeBeat = requiredText(shot.narrativeBeat, `shots[${index}].narrativeBeat`);
    if (shot.onScreenText !== undefined) {
      if (typeof shot.onScreenText !== "string") throw new Error(`shots[${index}].onScreenText must be a string when provided.`);
      if (shot.onScreenText.trim()) mapped.onScreenText = shot.onScreenText.trim();
    }
    if (shot.engineApproach !== undefined) {
      if (typeof shot.engineApproach !== "string" || !shot.engineApproach.trim()) {
        throw new Error(`shots[${index}].engineApproach must be a non-empty string when provided.`);
      }
      if (supportedEngineApproaches.includes(shot.engineApproach)) mapped.engineApproach = shot.engineApproach;
      else mapped.implementationNotes = shot.engineApproach.trim();
    }
    return mapped;
  });
  const acceptanceCriteria = brief.acceptanceCriteria as string[];
  const acceptanceCoverageInput = storyboard.acceptanceCoverage;
  if (!Array.isArray(acceptanceCoverageInput)) throw new Error("Storyboard acceptanceCoverage must map every brief criterion to one or more shot IDs.");
  const acceptanceCoverage: AcceptanceCoverage[] = acceptanceCoverageInput.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`acceptanceCoverage[${index}] must be an object.`);
    if (!Array.isArray(entry.shotIds) || entry.shotIds.some((id) => typeof id !== "string")) throw new Error(`acceptanceCoverage[${index}].shotIds must be an array of strings.`);
    return {
      criterion: requiredText(entry.criterion, `acceptanceCoverage[${index}].criterion`),
      shotIds: entry.shotIds as string[],
      rationale: requiredText(entry.rationale, `acceptanceCoverage[${index}].rationale`),
    };
  });
  const plan: DirectorProductionPlan = {
    schemaVersion: 1,
    id: requiredText(storyboard.id, "Storyboard id"),
    title: requiredText(storyboard.title, "Storyboard title"),
    delivery: { ...delivery },
    creativeDirection: {
      objective: requiredText(brief.objective, "Creative Brief objective"),
      audience: requiredText(brief.audience, "Creative Brief audience"),
      concept: requiredText(direction.concept, "Storyboard creativeDirection.concept"),
      visualSystem,
      emotionalArc: brief.emotionalArc,
      motionLanguage: requiredText(brief.motionLanguage, "Creative Brief motionLanguage"),
      soundDirection: requiredText(direction.soundDirection ?? brief.soundIdentity, "Storyboard soundDirection"),
      assumptions: brief.assumptions,
      rightsAndFactualConstraints: brief.constraints,
    },
    shots,
    renderStrategy: record(storyboard.renderStrategy),
    acceptanceCriteria,
    acceptanceCoverage,
  };
  const strategyErrors = validateRenderStrategy(plan.renderStrategy);
  if (strategyErrors.length) throw new Error(strategyErrors.join("\n"));
  const errors = validateProductionPlan(plan);
  const timingErrors: string[] = [];
  const fps = Number(delivery.fps);
  const tolerance = 1e-6;
  let cursor = 0;
  shots.forEach((shot, index) => {
    const start = Number(shot.startSeconds);
    const duration = Number(shot.durationSeconds);
    if (Math.abs(start * fps - Math.round(start * fps)) > tolerance) timingErrors.push(`shots[${index}].startSeconds is not frame-aligned at ${fps}fps.`);
    if (Math.abs(duration * fps - Math.round(duration * fps)) > tolerance) timingErrors.push(`shots[${index}].durationSeconds is not frame-aligned at ${fps}fps.`);
    if (Math.abs(start - cursor) > tolerance) timingErrors.push(`Timeline gap/overlap before shot "${String(shot.id)}": expected ${cursor}s, got ${start}s.`);
    cursor = start + duration;
  });
  if (Math.abs(cursor - Number(delivery.durationSeconds)) > tolerance) timingErrors.push(`Storyboard ends at ${cursor}s; expected ${String(delivery.durationSeconds)}s.`);
  if (errors.length || timingErrors.length) throw new Error([...errors, ...timingErrors].join("\n"));
  return plan;
};

const main = async (): Promise<void> => {
  const [briefPath, storyboardPath, outputPath] = process.argv.slice(2);
  if (!briefPath || !storyboardPath || !outputPath) {
    process.stderr.write("Usage: npm run director:production-plan -- <creative-brief.json> <storyboard.json> <production-plan.json>\n");
    process.exitCode = 2;
    return;
  }
  try {
    const brief = JSON.parse(await readFile(briefPath, "utf8")) as unknown;
    const storyboard = JSON.parse(await readFile(storyboardPath, "utf8")) as unknown;
    const plan = buildProductionPlanFromStoryboard(brief, storyboard);
    await writeFile(outputPath, JSON.stringify(plan, null, 2) + "\n", "utf8");
    process.stdout.write(`Production plan written: ${outputPath} (${plan.shots.length} shots, ${plan.acceptanceCoverage.length} acceptance criteria traced)\n`);
  } catch (error) {
    process.stderr.write(`Could not build production plan: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
