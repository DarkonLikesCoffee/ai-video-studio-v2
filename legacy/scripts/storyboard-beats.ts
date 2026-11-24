import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const NARRATIVE_BEATS = ["hook", "setup", "context", "development", "escalation", "reveal", "payoff", "cta", "transition", "pause"] as const;
export type NarrativeBeat = typeof NARRATIVE_BEATS[number];
type Shot = Record<string, unknown>;
type BeatEntry = { beat: NarrativeBeat; shotIds: string[]; shotCount: number; durationSeconds: number };
export type StoryboardBeatReport = {
  schemaVersion: 1;
  reportType: "storyboard-narrative-beats";
  planTitle: string;
  shotCount: number;
  taggedShotCount: number;
  untaggedShotIds: string[];
  beats: BeatEntry[];
  warnings: string[];
  limitations: string[];
};

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export const createStoryboardBeatReport = (input: unknown): StoryboardBeatReport => {
  const plan = record(input);
  const shots = Array.isArray(plan.shots) ? plan.shots.filter((shot): shot is Shot => shot !== null && typeof shot === "object" && !Array.isArray(shot) ) : [];
  const title = typeof plan.title === "string" && plan.title.trim() ? plan.title.trim() : "Untitled storyboard";
  const tagged = shots.filter((shot) => typeof shot.narrativeBeat === "string" && (NARRATIVE_BEATS as readonly string[]).includes(shot.narrativeBeat));
  const untaggedShotIds = shots.filter((shot) => !tagged.includes(shot)).map((shot, index) => typeof shot.id === "string" && shot.id.trim() ? shot.id : `shot-${index + 1}`);
  const beats = NARRATIVE_BEATS.filter((beat) => tagged.some((shot) => shot.narrativeBeat === beat)).map((beat) => {
    const beatShots = tagged.filter((shot) => shot.narrativeBeat === beat);
    return { beat, shotIds: beatShots.map((shot, index) => typeof shot.id === "string" && shot.id.trim() ? shot.id : `shot-${index + 1}`), shotCount: beatShots.length, durationSeconds: beatShots.reduce((total, shot) => total + (typeof shot.durationSeconds === "number" && Number.isFinite(shot.durationSeconds) ? shot.durationSeconds : 0), 0) };
  });
  const warnings: string[] = [];
  const sufficientlyTagged = shots.length >= 3 && tagged.length >= Math.ceil(shots.length * 0.6);
  if (shots.length > 0 && untaggedShotIds.length > 0) warnings.push(`${untaggedShotIds.length} of ${shots.length} shots are not labeled with narrativeBeat; coverage is incomplete.`);
  if (sufficientlyTagged) {
    const ordered = [...tagged].sort((a, b) => (Number(a.startSeconds) || 0) - (Number(b.startSeconds) || 0));
    const firstBeat = ordered[0]?.narrativeBeat;
    if (firstBeat !== "hook" && firstBeat !== "context" && firstBeat !== "setup") warnings.push(`Opening beat is "${String(firstBeat)}"; review whether the opening establishes a hook, context or setup.`);
    if (!tagged.some((shot) => shot.narrativeBeat === "development" || shot.narrativeBeat === "escalation" || shot.narrativeBeat === "reveal")) warnings.push("No development, escalation or reveal beat is labeled; the middle may need a visible progression.");
    if (!tagged.some((shot) => shot.narrativeBeat === "payoff" || shot.narrativeBeat === "cta")) warnings.push("No payoff or CTA beat is labeled; review how the video resolves its opening promise.");
  }
  return {
    schemaVersion: 1,
    reportType: "storyboard-narrative-beats",
    planTitle: title,
    shotCount: shots.length,
    taggedShotCount: tagged.length,
    untaggedShotIds,
    beats,
    warnings,
    limitations: ["This report uses only explicit narrativeBeat labels; it does not infer story meaning from visual or action text.", "Narrative structures vary by format. Warnings are review prompts, not validation errors or creative approval."],
  };
};

export const renderStoryboardBeatReportMarkdown = (report: StoryboardBeatReport): string => {
  const lines = ["# Storyboard Narrative Beat Review", "", `**Plan:** ${report.planTitle}`, `**Tagged shots:** ${report.taggedShotCount} / ${report.shotCount}`, "", "## Beat distribution", ""];
  if (!report.beats.length) lines.push("No explicit narrative-beat labels were found.");
  else report.beats.forEach((beat) => lines.push(`- **${beat.beat}** — ${beat.shotCount} shot(s), ${beat.durationSeconds.toFixed(2)}s: ${beat.shotIds.join(", ")}`));
  lines.push("", "## Review prompts", "");
  if (!report.warnings.length) lines.push("No narrative-beat review prompts were generated. This is not creative approval.");
  else report.warnings.forEach((warning) => lines.push(`- ${warning}`));
  if (report.untaggedShotIds.length) lines.push("", `**Unlabeled shots:** ${report.untaggedShotIds.join(", ")}`);
  lines.push("", "## Limitations", "", ...report.limitations.map((limitation) => `- ${limitation}`));
  return lines.join("\n");
};

const run = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const input = args.find((arg) => !arg.startsWith("--"));
  const output = args.filter((arg) => !arg.startsWith("--"))[1];
  const json = args.includes("--json");
  if (!input) {
    process.stderr.write("Usage: npm run storyboard:beats -- <production-plan.json> [report.md|report.json] [--json]\n");
    process.exitCode = 2;
    return;
  }
  try {
    const plan = JSON.parse(await readFile(input, "utf8")) as unknown;
    const report = createStoryboardBeatReport(plan);
    const content = json ? JSON.stringify(report, null, 2) : renderStoryboardBeatReportMarkdown(report);
    if (output) {
      await writeFile(output, content + "\n", "utf8");
      process.stdout.write(`Storyboard beat report written: ${output}\n`);
    } else process.stdout.write(content + "\n");
  } catch (error) {
    process.stderr.write(`Could not create storyboard beat report: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run();
