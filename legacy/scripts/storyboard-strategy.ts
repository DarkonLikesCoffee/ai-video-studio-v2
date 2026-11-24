import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { analyzeStoryboardRisks, type StoryboardRiskFinding } from "./storyboard-qa";

type Shot = Record<string, unknown>;
type Plan = Record<string, unknown> & { shots?: unknown };

const getShots = (plan: unknown): Shot[] => plan && typeof plan === "object" && !Array.isArray(plan) && Array.isArray((plan as Plan).shots)
  ? ((plan as Plan).shots as unknown[]).filter((shot): shot is Shot => !!shot && typeof shot === "object" && !Array.isArray(shot))
  : [];
const shotId = (shot: Shot, index: number) => typeof shot.id === "string" && shot.id.trim() ? shot.id : `shot-${index + 1}`;
const normalize = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : "unspecified";
const methodLabel = (method: string) => method.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const alternativesByCode: Partial<Record<StoryboardRiskFinding["code"], string[]>> = {
  TEXT_HEAVY_SHOT: ["Replace the text card with a visual demonstration; keep only one short label.", "Use a macro/detail shot that reveals the concept physically.", "Show a before/after transformation instead of explaining it in copy."],
  REPEATED_VISUAL_METHOD: ["Switch one beat to real or user-provided footage if it shows the action clearly.", "Use a physical object or 3D scene to demonstrate cause and effect.", "Use a short animated diagram only for the relationship that footage cannot communicate."],
  REPEATED_FRAMING: ["Change shot scale or subject placement to reveal new information.", "Use a motivated cut to a detail, reaction, environment, or consequence.", "Keep the match only if it creates a deliberate visual comparison."],
  REPEATED_SHOT_SCALE: ["Introduce a wide establishing view, then a close detail or reaction.", "Use scale change to reveal a new clue or increase emotional proximity.", "Keep the repeated scale only when continuity is the intended effect."],
  LOW_SHOT_SCALE_VARIETY: ["Build a purposeful wide → medium → detail progression where the story supports it.", "Add an environmental shot or close detail to break uniform scale.", "Avoid arbitrary variety: every scale change should reveal something."],
  REPEATED_CAMERA_MOVEMENT: ["Choose movement from the subject action: track, orbit, push, pull, or pan.", "Use a purposeful locked shot for contrast instead of default movement.", "Change camera behavior only when it supports the beat."],
  REPEATED_VISUAL_DESCRIPTION: ["Replace the adjacent shot with a new event, consequence, location, or subject.", "Change what is revealed—not merely the adjectives or camera move.", "Use a contrast or match-cut only if the relationship is clear."],
  STATIC_HOLD: ["Add meaningful subject/environment change, not decorative particles.", "Cut to a new visual beat if the frame has no reason to hold.", "Keep stillness only as an intentional pause or emphasis."],
  LONG_SHOT: ["Split into distinct visual beats if the shot does not evolve.", "Shorten the shot or give it clear staged progression.", "Retain the duration when the action genuinely develops."],
  VAGUE_VISUAL_DESCRIPTION: ["Specify a concrete subject, setting, composition, and visible event.", "Choose footage, an object demonstration, a visual demonstration, or a diagram based on what must be shown."],
  VAGUE_ACTION: ["Describe an observable action with a visible change or result.", "Replace abstract explanation with a physical demonstration or reveal."],
  INCOMPLETE_VISUAL_PROGRESSION: ["Define the opening state, what changes, and the final state.", "Use a reveal, transformation, movement, or consequence to create progression."],
};

export type VisualStrategyReport = {
  shotCount: number;
  methodCounts: Record<string, number>;
  findings: StoryboardRiskFinding[];
  recommendations: Array<{ shotId: string; issueCodes: string[]; alternatives: string[] }>;
};

export const createVisualStrategyReport = (plan: unknown): VisualStrategyReport => {
  const shots = getShots(plan);
  const findings = analyzeStoryboardRisks(plan);
  const methodCounts: Record<string, number> = {};
  shots.forEach((shot) => {
    const method = normalize(shot.visualMethod);
    methodCounts[method] = (methodCounts[method] ?? 0) + 1;
  });
  const recommendations = shots.map((shot, index) => {
    const id = shotId(shot, index);
    const relevant = findings.filter((finding) => finding.shotIds.includes(id));
    const alternatives = [...new Set(relevant.flatMap((finding) => alternativesByCode[finding.code] ?? []))];
    return { shotId: id, issueCodes: [...new Set(relevant.map((finding) => finding.code))], alternatives };
  }).filter((item) => item.issueCodes.length > 0);
  return { shotCount: shots.length, methodCounts, findings, recommendations };
};

export const renderVisualStrategyJson = (plan: unknown, report = createVisualStrategyReport(plan)): string => {
  const title = plan && typeof plan === "object" && typeof (plan as Record<string, unknown>).title === "string"
    ? (plan as Record<string, unknown>).title as string : "Untitled storyboard";
  return JSON.stringify({
    schemaVersion: 1,
    reportType: "storyboard-visual-strategy",
    planTitle: title,
    report,
    generatedBy: "ai-video-studio/storyboard:strategy",
  }, null, 2);
};

export const renderVisualStrategyMarkdown = (plan: unknown, report = createVisualStrategyReport(plan)): string => {
  const title = plan && typeof plan === "object" && typeof (plan as Record<string, unknown>).title === "string"
    ? (plan as Record<string, unknown>).title as string : "Untitled storyboard";
  const lines = ["# Visual Strategy Report", "", `**Plan:** ${title}`, `**Shots:** ${report.shotCount}`, "", "**Rule-based planning aid. It does not understand the video's meaning or approve creative quality.**", "", "## Visual method mix", ""];
  Object.entries(report.methodCounts).sort((a, b) => b[1] - a[1]).forEach(([method, count]) => lines.push(`- ${methodLabel(method)}: ${count} shot(s)`));
  lines.push("", "## Shot-level alternatives", "");
  if (!report.recommendations.length) lines.push("No deterministic storyboard risks produced shot-specific alternatives. This is not creative approval.");
  report.recommendations.forEach((item) => {
    lines.push(`### ${item.shotId}`, "", `**Signals:** ${item.issueCodes.join(", ")}`, "");
    item.alternatives.forEach((alternative, index) => lines.push(`${index + 1}. ${alternative}`));
    lines.push("");
  });
  lines.push("## Findings", "");
  report.findings.forEach((finding) => lines.push(`- [${finding.code}] ${finding.shotIds.join(", ")}: ${finding.message}`));
  lines.push("", "Use the alternatives to revise the plan, then run `npm run validate:plan`, `npm run storyboard:qa`, and `npm run storyboard:preview`. Alternatives are prompts for an explicit creative decision; the report does not rewrite the plan.");
  return lines.join("\n");
};

const run = async () => {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const filteredArgs = args.filter((arg) => arg !== "--json");
  const inputPath = filteredArgs[0];
  const outputPath = filteredArgs[1];
  if (!inputPath || filteredArgs.length > 2) {
    process.stderr.write("Usage: npm run storyboard:strategy -- <production-plan.json> [output.md|output.json] [--json]\n");
    process.exitCode = 2;
    return;
  }
  try {
    const plan = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
    const report = jsonMode ? renderVisualStrategyJson(plan) : renderVisualStrategyMarkdown(plan);
    if (outputPath) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(outputPath, report + "\n", "utf8");
      process.stdout.write(`Visual strategy report written: ${outputPath}\n`);
    } else process.stdout.write(report + "\n");
  } catch (error) {
    process.stderr.write(`Could not create visual strategy report: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run();
