import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { critiqueStoryboard } from "./storyboard-critic";
import { validateProductionPlan } from "./validate-production-plan";
import { analyzeStoryboardRisks } from "./storyboard-qa";

export type StoryboardRevisionEdit = {
  shotId: string;
  changeNote: string;
  fields: Record<string, unknown>;
};

export type StoryboardRevisionArtifact = {
  schemaVersion: 1;
  sourcePlanPath: string;
  sourcePlanSha256: string;
  sourcePlanText: string;
  sourcePlan: unknown;
  suggestions: Array<{ id: string; selected: boolean; item: ReturnType<typeof critiqueStoryboard>[number] }>;
  edits: StoryboardRevisionEdit[];
  validation: null | { valid: boolean; errors: string[]; warnings: string[] };
};

const sha256 = (content: string): string => createHash("sha256").update(content).digest("hex");

export const createStoryboardRevision = (sourcePath: string, sourceContent: string): StoryboardRevisionArtifact => {
  const sourcePlan = JSON.parse(sourceContent) as unknown;
  const critique = critiqueStoryboard(sourcePlan);
  return {
    schemaVersion: 1,
    sourcePlanPath: sourcePath,
    sourcePlanSha256: sha256(sourceContent),
    sourcePlanText: sourceContent,
    sourcePlan,
    suggestions: critique.map((item, index) => ({ id: `suggestion-${String(index + 1).padStart(3, "0")}`, selected: false, item })),
    edits: [],
    validation: null,
  };
};

export const setStoryboardRevisionSuggestionSelection = (
  artifact: StoryboardRevisionArtifact,
  suggestionId: string,
  selected = true,
): StoryboardRevisionArtifact => {
  const suggestion = artifact.suggestions.find((item) => item.id === suggestionId);
  if (!suggestion) throw new Error(`Unknown suggestion ID: ${suggestionId}`);
  return {
    ...artifact,
    suggestions: artifact.suggestions.map((item) => item.id === suggestionId ? { ...item, selected } : item),
  };
};

export const renderStoryboardRevisionReviewMarkdown = (artifact: StoryboardRevisionArtifact): string => {
  const title = artifact.sourcePlan && typeof artifact.sourcePlan === "object" && typeof (artifact.sourcePlan as Record<string, unknown>).title === "string"
    ? (artifact.sourcePlan as Record<string, unknown>).title as string
    : "Untitled storyboard";
  const selected = artifact.suggestions.filter((item) => item.selected);
  const lines = [
    "# Storyboard Revision Review",
    "",
    `**Plan:** ${title}`,
    `**Source:** ${artifact.sourcePlanPath}`,
    `**Source SHA-256:** ${artifact.sourcePlanSha256}`,
    `**Selected suggestions:** ${selected.length} / ${artifact.suggestions.length}`,
    `**Explicit edits:** ${artifact.edits.length}`,
    "",
    "Selections are review decisions only; they do not modify the plan or create edits.",
    "",
    "## Suggestions",
    "",
  ];
  if (artifact.suggestions.length === 0) lines.push("No suggestions were generated.");
  artifact.suggestions.forEach((suggestion) => {
    const item = suggestion.item;
    lines.push(`### ${suggestion.id} — ${suggestion.selected ? "SELECTED" : "not selected"} (${item.priority.toUpperCase()})`, "", `**Shots:** ${item.shotIds.join(", ")}`, "", `**Issue:** ${item.issue}`, "", `**Proposed direction:** ${item.revision}`, "", `**Rationale:** ${item.rationale}`, "");
  });
  lines.push("## Explicit edits", "");
  if (!artifact.edits.length) lines.push("No edits have been authored yet.");
  artifact.edits.forEach((edit) => lines.push(`- **${edit.shotId}:** ${edit.changeNote} (${Object.keys(edit.fields).join(", ")})`));
  lines.push("", "## Last validation", "");
  if (!artifact.validation) lines.push("Not validated yet.");
  else {
    lines.push(`**Status:** ${artifact.validation.valid ? "PASS" : "FAIL"}`, `**Errors:** ${artifact.validation.errors.length}`, `**Warnings:** ${artifact.validation.warnings.length}`);
    artifact.validation.errors.forEach((error) => lines.push(`- ERROR: ${error}`));
    artifact.validation.warnings.forEach((warning) => lines.push(`- WARNING: ${warning}`));
  }
  return lines.join("\n");
};

export const renderStoryboardRevisionPromptMarkdown = (artifact: StoryboardRevisionArtifact): string => {
  const selected = artifact.suggestions.filter((suggestion) => suggestion.selected);
  if (selected.length === 0) throw new Error("Select at least one suggestion before generating a revision prompt.");
  const plan = artifact.sourcePlan as Record<string, unknown>;
  if (!Array.isArray(plan.shots)) throw new Error("Source plan has no shots array");
  const shots = plan.shots as Array<Record<string, unknown>>;
  const selectedShotIds = [...new Set(selected.flatMap((suggestion) => suggestion.item.shotIds))];
  const relevantShots = shots.filter((shot) => selectedShotIds.includes(String(shot.id)));
  const lines = [
    "# AI Storyboard Revision Brief", "",
    "You are the creative director and storyboard editor. Revise only the listed shots, based on the selected critique. Preserve the source plan and its narrative intent; improve concrete visual storytelling, shot distinctiveness, action/progression and production feasibility.", "",
    "## Safety and editing constraints",
    "- Treat critique as heuristic input, not unquestionable truth. Apply only changes that improve the story and visual result.",
    "- Do not rewrite unrelated shots, title, runtime, facts, or overall style.",
    "- Do not invent assets, footage, licenses, or engine capabilities.",
    "- Prefer specific visible events and staging over adjectives, text cards, or generic motion.",
    "- Preserve each shot's required schema. Only return field edits for existing shot IDs.",
    "- Return valid JSON only, matching the output schema below. No prose or markdown fences.", "",
    "## Selected critique items", "",
  ];
  selected.forEach((suggestion) => {
    const item = suggestion.item;
    lines.push(`### ${suggestion.id} [${item.priority.toUpperCase()}]`, `Shots: ${item.shotIds.join(", ")}`, `Issue: ${item.issue}`, `Direction: ${item.revision}`, `Rationale: ${item.rationale}`, "");
  });
  lines.push("## Original shot data (context; do not change unselected shots)", "", JSON.stringify(relevantShots, null, 2), "");
  lines.push("## Output schema", "", JSON.stringify({ edits: [{ shotId: "existing-shot-id", changeNote: "Explain the concrete creative improvement", fields: { visual: "updated visual description", action: "observable action", visualProgression: "Start: ... Development: ... End: ..." } }] }, null, 2), "");
  lines.push("Return edits only for the listed shot IDs. Include only fields that actually need changing. Make each change specific enough to stage, source, animate and review. If a selected critique should not be applied, omit that edit and explain nothing (the user will review the result).");
  return lines.join("\n");
};

export const importStoryboardRevisionEdits = (artifact: StoryboardRevisionArtifact, payload: unknown): StoryboardRevisionArtifact => {
  const edits = payload && typeof payload === "object" && !Array.isArray(payload) && Array.isArray((payload as Record<string, unknown>).edits)
    ? (payload as { edits: unknown[] }).edits
    : Array.isArray(payload) ? payload : null;
  if (!edits) throw new Error("Revision response must be an edits array or an object containing edits.");
  const selectedShotIds = new Set(artifact.suggestions.filter((suggestion) => suggestion.selected).flatMap((suggestion) => suggestion.item.shotIds));
  const sourceShots = Array.isArray((artifact.sourcePlan as Record<string, unknown>)?.shots) ? (artifact.sourcePlan as { shots: Array<Record<string, unknown>> }).shots : [];
  const existingIds = new Set(sourceShots.map((shot) => String(shot.id)));
  const allowedFields = new Set(["visual", "action", "visualProgression", "framing", "cameraMovement", "transition", "onScreenText", "visualMethod", "engineApproach", "narrativeBeat"]);
  const imported: StoryboardRevisionEdit[] = [];
  const seen = new Set<string>();
  for (const raw of edits) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Each imported edit must be an object.");
    const edit = raw as Record<string, unknown>;
    if (typeof edit.shotId !== "string" || !edit.shotId.trim()) throw new Error("Each imported edit requires a shotId.");
    if (!existingIds.has(edit.shotId)) throw new Error(`Edit references unknown shot ID: ${edit.shotId}`);
    if (!selectedShotIds.has(edit.shotId)) throw new Error(`Edit targets shot ${edit.shotId}, which is not covered by a selected critique suggestion.`);
    if (seen.has(edit.shotId)) throw new Error(`Duplicate imported edit for shot: ${edit.shotId}`);
    if (typeof edit.changeNote !== "string" || !edit.changeNote.trim()) throw new Error(`Edit for ${edit.shotId} requires a changeNote.`);
    if (!edit.fields || typeof edit.fields !== "object" || Array.isArray(edit.fields) || Object.keys(edit.fields as object).length === 0) throw new Error(`Edit for ${edit.shotId} requires non-empty fields.`);
    const fields = edit.fields as Record<string, unknown>;
    for (const key of Object.keys(fields)) if (!allowedFields.has(key)) throw new Error(`Unsupported revision field: ${key}`);
    seen.add(edit.shotId);
    imported.push({ shotId: edit.shotId, changeNote: edit.changeNote.trim(), fields: structuredClone(fields) });
  }
  if (imported.length === 0) throw new Error("No revision edits were provided.");
  return { ...artifact, edits: [...artifact.edits, ...imported], validation: null };
};

export const applyStoryboardRevisionEdits = (artifact: StoryboardRevisionArtifact): unknown => {
  const plan = structuredClone(artifact.sourcePlan) as Record<string, unknown>;
  if (!Array.isArray(plan.shots)) throw new Error("Source plan has no shots array");
  const shots = plan.shots as Array<Record<string, unknown>>;
  for (const edit of artifact.edits) {
    const shot = shots.find((candidate) => candidate.id === edit.shotId);
    if (!shot) throw new Error(`Edit references unknown shot ID: ${edit.shotId}`);
    for (const [field, value] of Object.entries(edit.fields)) {
      shot[field] = value;
    }
  }
  return plan;
};

export const validateStoryboardRevision = (artifact: StoryboardRevisionArtifact) => {
  const revisedPlan = applyStoryboardRevisionEdits(artifact);
  const errors = validateProductionPlan(revisedPlan);
  const warnings = analyzeStoryboardRisks(revisedPlan).map((finding) => `${finding.code}: ${finding.message}`);
  return { valid: errors.length === 0, errors, warnings, revisedPlan };
};

const run = async (): Promise<void> => {
  const [command, input, output] = process.argv.slice(2);
  try {
    if (command === "init") {
      if (!input || !output) throw new Error("Usage: npm run storyboard:revision -- init <production-plan.json> <revision.json>");
      const source = await readFile(input, "utf8");
      const artifact = createStoryboardRevision(input, source);
      await writeFile(output, JSON.stringify(artifact, null, 2) + "\n", "utf8");
      process.stdout.write(`Revision artifact created: ${output} (source preserved; ${artifact.suggestions.length} suggestions)\n`);
      return;
    }
    if (command === "select") {
      if (!input || !output) throw new Error("Usage: npm run storyboard:revision -- select <revision.json> <suggestion-id> [--off]");
      const artifact = JSON.parse(await readFile(input, "utf8")) as StoryboardRevisionArtifact;
      const selected = !process.argv.includes("--off");
      const updated = setStoryboardRevisionSuggestionSelection(artifact, output, selected);
      await writeFile(input, JSON.stringify(updated, null, 2) + "\n", "utf8");
      process.stdout.write(`Suggestion ${output} ${selected ? "selected" : "deselected"} in ${input} (no plan edits applied)\n`);
      return;
    }
    if (command === "prompt") {
      if (!input) throw new Error("Usage: npm run storyboard:revision -- prompt <revision.json> [revision-prompt.md]");
      const artifact = JSON.parse(await readFile(input, "utf8")) as StoryboardRevisionArtifact;
      const prompt = renderStoryboardRevisionPromptMarkdown(artifact);
      if (output) {
        await writeFile(output, prompt + "\n", "utf8");
        process.stdout.write(`Revision prompt written: ${output}\n`);
      } else {
        process.stdout.write(prompt + "\n");
      }
      return;
    }
    if (command === "import-edits") {
      if (!input || !output) throw new Error("Usage: npm run storyboard:revision -- import-edits <revision.json> <model-response.json>");
      const artifact = JSON.parse(await readFile(input, "utf8")) as StoryboardRevisionArtifact;
      const payload = JSON.parse(await readFile(output, "utf8")) as unknown;
      const updated = importStoryboardRevisionEdits(artifact, payload);
      await writeFile(input, JSON.stringify(updated, null, 2) + "\n", "utf8");
      process.stdout.write(`Imported ${updated.edits.length - artifact.edits.length} edits into ${input} (plan not modified)\n`);
      return;
    }
    if (command === "review") {
      if (!input) throw new Error("Usage: npm run storyboard:revision -- review <revision.json> [review.md]");
      const artifact = JSON.parse(await readFile(input, "utf8")) as StoryboardRevisionArtifact;
      const report = renderStoryboardRevisionReviewMarkdown(artifact);
      if (output) {
        await writeFile(output, report + "\n", "utf8");
        process.stdout.write(`Revision review written: ${output}\n`);
      } else {
        process.stdout.write(report + "\n");
      }
      return;
    }
    if (command === "apply" || command === "validate") {
      if (!input || (command === "apply" && !output)) throw new Error(command === "apply"
        ? "Usage: npm run storyboard:revision -- apply <revision.json> <revised-plan.json>"
        : "Usage: npm run storyboard:revision -- validate <revision.json>");
      const artifact = JSON.parse(await readFile(input, "utf8")) as StoryboardRevisionArtifact;
      const source = await readFile(artifact.sourcePlanPath, "utf8");
      if (sha256(source) !== artifact.sourcePlanSha256 || sha256(artifact.sourcePlanText) !== artifact.sourcePlanSha256) throw new Error("Source plan changed or embedded source text was altered since artifact creation; create a new revision artifact to avoid silently overwriting newer work.");
      if (JSON.stringify(JSON.parse(artifact.sourcePlanText)) !== JSON.stringify(artifact.sourcePlan)) throw new Error("Embedded source plan object does not match the preserved source text.");
      const result = validateStoryboardRevision(artifact);
      artifact.validation = { valid: result.valid, errors: result.errors, warnings: result.warnings };
      await writeFile(input, JSON.stringify(artifact, null, 2) + "\n", "utf8");
      if (command === "apply") {
        if (!result.valid) {
          process.stderr.write("Revised plan has validation errors; output was not written. Fix the edits and retry.\n");
          process.exitCode = 1;
          return;
        }
        await writeFile(output!, JSON.stringify(result.revisedPlan, null, 2) + "\n", "utf8");
        process.stdout.write(`Revised plan written: ${output}\n`);
      } else {
        process.stdout.write(`Revision validation: ${result.valid ? "PASS" : "FAIL"}; ${result.errors.length} errors; ${result.warnings.length} warnings\n`);
      }
      if (!result.valid) process.exitCode = 1;
      return;
    }
    throw new Error("Usage: npm run storyboard:revision -- <init|select|review|prompt|import-edits|apply|validate> ...");
  } catch (error) {
    process.stderr.write(`Storyboard revision failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run();
