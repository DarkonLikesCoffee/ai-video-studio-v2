import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

type CreativeBrief = Record<string, unknown>;
const isRecord = (value: unknown): value is CreativeBrief => typeof value === "object" && value !== null && !Array.isArray(value);
const textField = (object: CreativeBrief, field: string, errors: string[], path = "") => {
  const value = object[field];
  if (typeof value !== "string" || !value.trim()) errors.push(`${path}${field} must be a non-empty string.`);
};
const stringArray = (object: CreativeBrief, field: string, errors: string[], path = "", min = 0, max = Number.POSITIVE_INFINITY) => {
  const value = object[field];
  if (!Array.isArray(value) || value.length < min || value.length > max || value.some((item) => typeof item !== "string" || !item.trim())) {
    errors.push(`${path}${field} must be an array of ${min}–${max === Number.POSITIVE_INFINITY ? "unlimited" : max} non-empty strings.`);
  }
};

export const validateCreativeBrief = (value: unknown): string[] => {
  const errors: string[] = [];
  if (!isRecord(value)) return ["Creative brief must be a JSON object."];
  if (value.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (typeof value.id !== "string" || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(value.id)) errors.push("id must be a lowercase slug (2–64 characters).");
  for (const field of ["title", "sourcePrompt", "objective", "audience", "desiredResponse", "creativeThesis", "storytellingStrategy", "motionLanguage", "soundIdentity", "productionMethodStrategy"]) textField(value, field, errors);
  stringArray(value, "emotionalArc", errors, "", 2, 8);
  stringArray(value, "constraints", errors);
  stringArray(value, "assumptions", errors);
  stringArray(value, "acceptanceCriteria", errors, "", 3, 10);
  const delivery = value.delivery;
  if (!isRecord(delivery)) errors.push("delivery must be an object.");
  else {
    const duration = delivery.durationSeconds;
    if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0 || duration > 300) errors.push("delivery.durationSeconds must be greater than 0 and no more than 300.");
    for (const field of ["width", "height"] as const) {
      const number = delivery[field];
      const minimum = field === "width" ? 320 : 320;
      const maximum = field === "width" ? 7680 : 4320;
      if (!Number.isInteger(number) || Number(number) < minimum || Number(number) > maximum) errors.push(`delivery.${field} must be an integer from ${minimum} to ${maximum}.`);
    }
    if (![24, 25, 30, 50, 60].includes(Number(delivery.fps))) errors.push("delivery.fps must be 24, 25, 30, 50 or 60.");
    if (delivery.format !== "mp4") errors.push("delivery.format must be mp4.");
    textField(delivery, "platform", errors, "delivery.");
    textField(delivery, "language", errors, "delivery.");
    if (typeof duration === "number" && Number.isFinite(duration) && [24,25,30,50,60].includes(Number(delivery.fps)) && !Number.isInteger(duration * Number(delivery.fps))) errors.push("delivery.durationSeconds × fps must resolve to a whole number of frames.");
  }
  const visual = value.visualLanguage;
  if (!isRecord(visual)) errors.push("visualLanguage must be an object.");
  else {
    stringArray(visual, "palette", errors, "visualLanguage.", 1, 8);
    for (const field of ["typography", "composition", "lighting", "texture"]) textField(visual, field, errors, "visualLanguage.");
  }
  return errors;
};

export const renderCreativeBriefSummary = (brief: CreativeBrief): string => {
  const delivery = isRecord(brief.delivery) ? brief.delivery : {};
  const visual = isRecord(brief.visualLanguage) ? brief.visualLanguage : {};
  const lines = [
    `# Creative Brief — ${String(brief.title ?? "Untitled")}`,
    "",
    `**ID:** ${String(brief.id ?? "n/a")}`,
    `**Objective:** ${String(brief.objective ?? "n/a")}`,
    `**Audience:** ${String(brief.audience ?? "n/a")}`,
    `**Desired response:** ${String(brief.desiredResponse ?? "n/a")}`,
    `**Delivery:** ${String(delivery.durationSeconds ?? "n/a")}s · ${String(delivery.width ?? "n/a")}×${String(delivery.height ?? "n/a")} · ${String(delivery.fps ?? "n/a")}fps · ${String(delivery.platform ?? "n/a")} · ${String(delivery.language ?? "n/a")}`,
    "",
    "## Creative thesis", String(brief.creativeThesis ?? "n/a"), "",
    "## Emotional arc", ...(Array.isArray(brief.emotionalArc) ? brief.emotionalArc.map((beat, i) => `${i + 1}. ${String(beat)}`) : ["n/a"]),
    "",
    "## Storytelling strategy", String(brief.storytellingStrategy ?? "n/a"),
    "",
    "## Visual language", "",
    `- Palette: ${Array.isArray(visual.palette) ? visual.palette.join(", ") : "n/a"}`,
    `- Typography: ${String(visual.typography ?? "n/a")}`,
    `- Composition: ${String(visual.composition ?? "n/a")}`,
    `- Lighting: ${String(visual.lighting ?? "n/a")}`,
    `- Texture: ${String(visual.texture ?? "n/a")}`,
    "",
    "## Motion", String(brief.motionLanguage ?? "n/a"),
    "",
    "## Sound identity", String(brief.soundIdentity ?? "n/a"),
    "",
    "## Production method strategy", String(brief.productionMethodStrategy ?? "n/a"),
    "",
    "## Constraints", ...(Array.isArray(brief.constraints) && brief.constraints.length ? brief.constraints.map((item) => `- ${String(item)}`) : ["- None specified"]),
    "",
    "## Assumptions", ...(Array.isArray(brief.assumptions) && brief.assumptions.length ? brief.assumptions.map((item) => `- ${String(item)}`) : ["- None"]),
    "",
    "## Acceptance criteria", ...(Array.isArray(brief.acceptanceCriteria) ? brief.acceptanceCriteria.map((item) => `- [ ] ${String(item)}`) : ["- n/a"]),
    "",
    "> This document is creative direction, not a storyboard or a verified production plan."
  ];
  return lines.join("\n");
};

const main = async (): Promise<void> => {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input) {
    process.stderr.write("Usage: npm run director:brief -- <creative-brief.json> [summary.md]\n");
    process.exitCode = 2;
    return;
  }
  try {
    const brief = JSON.parse(await readFile(input, "utf8")) as unknown;
    const errors = validateCreativeBrief(brief);
    if (errors.length) {
      process.stderr.write(errors.map((error) => `- ${error}`).join("\n") + "\n");
      process.exitCode = 1;
      return;
    }
    if (output) await (await import("node:fs/promises")).writeFile(output, renderCreativeBriefSummary(brief as CreativeBrief) + "\n", "utf8");
    else process.stdout.write(renderCreativeBriefSummary(brief as CreativeBrief) + "\n");
  } catch (error) {
    process.stderr.write(`Could not read creative brief: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
};
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
