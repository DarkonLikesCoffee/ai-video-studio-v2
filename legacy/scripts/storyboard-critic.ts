import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { analyzeStoryboardRisks, type StoryboardRiskFinding } from "./storyboard-qa";

export type StoryboardCritiqueItem = {
  priority: "high" | "medium";
  shotIds: string[];
  issue: string;
  revision: string;
  rationale: string;
};

const revisionByCode: Record<string, { priority: "high" | "medium"; revision: string; rationale: string }> = {
  VAGUE_VISUAL_DESCRIPTION: { priority: "high", revision: "Rewrite the visual as a specific subject, environment, composition, and visible event. Replace placeholders with details that can be directly staged or sourced.", rationale: "A production team cannot reliably create a concrete shot from a generic description." },
  VAGUE_ACTION: { priority: "high", revision: "Define one observable action with a clear beginning, change, and result in the frame; avoid verbs that only describe presenting an idea.", rationale: "A concrete event gives the shot visual motion and a reason to exist." },
  INCOMPLETE_VISUAL_PROGRESSION: { priority: "high", revision: "Describe Start, Development, and End states. Each state should change something visible (subject position, reveal, light, object state, camera relation, or environment).", rationale: "A shot needs visible development rather than motion applied to an unchanged image." },
  REPEATED_VISUAL_DESCRIPTION: { priority: "high", revision: "Give this shot a distinct visual event or composition from its adjacent shot. Consider changing subject, scale, environment, action, or reveal—not merely rewriting adjectives.", rationale: "Adjacent shots with nearly the same description may feel redundant." },
  TEXT_HEAVY_SHOT: { priority: "medium", revision: "Reduce on-screen copy to one short phrase or key idea. Move supporting detail into narration and let the visual communicate the concept.", rationale: "Long copy can compete with the imagery and be difficult to read in motion." },
  LONG_SHOT: { priority: "medium", revision: "Check whether the shot has enough visual progression to justify its duration. If not, shorten it or split it into distinct visual beats with motivated cuts.", rationale: "Long duration without development risks slowing the sequence." },
  STATIC_HOLD: { priority: "medium", revision: "Either motivate the stillness as a deliberate beat or add restrained subject/environmental development (light, particles, movement, focus shift) that supports the story.", rationale: "A long static hold may feel inert if the frame has no meaningful evolution." },
  LOW_SHOT_SCALE_VARIETY: { priority: "medium", revision: "Review the sequence for opportunities to contrast wide, medium, close-up, or detail shots. Change scale only when it reveals information or changes emotional distance.", rationale: "Limited scale contrast can make a sequence visually monotonous, though consistency may be intentional." },
  REPEATED_SHOT_SCALE: { priority: "medium", revision: "Consider changing the scale on one or more adjacent shots (wide ↔ medium ↔ close/detail) to create contrast while preserving continuity.", rationale: "A run of identical shot scales can reduce visual rhythm." },
  REPEATED_FRAMING: { priority: "medium", revision: "Change composition or subject placement in at least one adjacent shot, or make the repetition an intentional match-cut with a clear visual payoff.", rationale: "Repeated composition can make the edit feel like the same shot continuing." },
  REPEATED_VISUAL_METHOD: { priority: "medium", revision: "Switch visual method where it improves storytelling (for example, footage to macro detail, 3D to a real-world consequence, or graphics to a physical demonstration). Keep the visual style coherent.", rationale: "Repeated method can reduce visual variety if every beat is presented the same way." },
  REPEATED_CAMERA_MOVEMENT: { priority: "medium", revision: "Vary camera behavior or use a purposeful hold. Choose movement based on the action—tracking, orbit, push, pull, pan, or locked framing—rather than repeating a default move.", rationale: "Repeated camera motion can become decorative instead of motivated." },
};

export const critiqueStoryboard = (plan: unknown): StoryboardCritiqueItem[] => {
  const findings: StoryboardRiskFinding[] = analyzeStoryboardRisks(plan);
  const result: StoryboardCritiqueItem[] = [];
  const seen = new Set<string>();
  for (const finding of findings) {
    const guidance = revisionByCode[finding.code];
    if (!guidance) continue;
    const key = finding.code + ":" + finding.shotIds.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ priority: guidance.priority, shotIds: finding.shotIds, issue: finding.message, revision: guidance.revision, rationale: guidance.rationale });
  }
  return result.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "high" ? -1 : 1));
};

export const renderStoryboardCritiqueMarkdown = (plan: unknown, items = critiqueStoryboard(plan)): string => {
  const title = plan && typeof plan === "object" && typeof (plan as Record<string, unknown>).title === "string"
    ? (plan as Record<string, unknown>).title as string
    : "Untitled storyboard";
  const lines = ["# Storyboard Critique", "", `**Plan:** ${title}`, "", "**Review-only report. The source plan is not changed. Suggestions are heuristic and require creative review.**", ""];
  if (items.length === 0) return lines.concat("No deterministic critique items were produced. This is not a creative approval.").join("\n");
  lines.push(`## Suggested revisions (${items.length})`, "");
  items.forEach((item, index) => {
    lines.push(`### ${index + 1}. [${item.priority.toUpperCase()}] — ${item.shotIds.join(", ")} `, "", `**Issue:** ${item.issue}`, "", `**Suggested revision:** ${item.revision}`, "", `**Why:** ${item.rationale}`, "");
  });
  lines.push("## Next step", "", "Apply selected revisions manually to a copy of the plan, then run `npm run validate:plan` and `npm run storyboard:qa`. Do not treat this report as automatic approval.");
  return lines.join("\n");
};

const runCli = async (): Promise<void> => {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath) {
    process.stderr.write("Usage: npm run storyboard:critic -- <production-plan.json> [output.md]\n");
    process.exitCode = 2;
    return;
  }
  try {
    const plan = JSON.parse(await readFile(inputPath, "utf8")) as unknown;
    const report = renderStoryboardCritiqueMarkdown(plan);
    if (outputPath) {
      await writeFile(outputPath, report + "\n", "utf8");
      process.stdout.write(`Storyboard critique written: ${outputPath}\n`);
    } else {
      process.stdout.write(report + "\n");
    }
  } catch (error) {
    process.stderr.write(`Could not critique storyboard: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
