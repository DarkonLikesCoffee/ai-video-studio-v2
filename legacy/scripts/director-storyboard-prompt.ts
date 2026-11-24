import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { validateCreativeBrief } from "./director-brief";
import { renderCompositionRegistryForPrompt } from "./director-compositions";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};

export const buildStoryboardDirectorPrompt = (brief: RecordValue): string => {
  const delivery = record(brief.delivery);
  const duration = Number(delivery.durationSeconds);
  const minShots = Math.max(3, Math.ceil(duration / 5));
  const maxShots = Math.max(minShots, Math.floor(duration / 2));
  const briefJson = JSON.stringify(brief, null, 2);
  const compositionRegistry = renderCompositionRegistryForPrompt();
  return [
    "# AI Video Studio — Storyboard Director Handoff",
    "",
    "You are the film director and editor. Convert the supplied Creative Brief into a production-minded, visually specific storyboard. Do not restate the brief; make creative decisions.",
    "",
    "## Non-negotiable creative rules",
    "- Tell a visual story with a clear opening promise, progression, and payoff. Every shot must change the viewer's understanding, emotion, subject, environment, or visual state.",
    "- Do not default to text cards, diagrams, abstract backgrounds, or generic camera movement. Use them only when the subject and story justify them.",
    "- Choose the best visual method shot-by-shot: live-action/stock footage, generated footage, still photography, 2D animation, motion graphics, typography, 3D, simulation, or a hybrid. Be specific and explain the choice through the shot's visual description.",
    "- Separately choose ONE whole-video renderer/composition in renderStrategy. Per-shot visualMethod is not the same thing as the Remotion composition.",
    "- ProjectVideo is a fixed-layout compatibility renderer, not the default. Select it only when its recurring structured 2D layout genuinely fits this entire video.",
    "- Prefer a registered custom composition only when its documented purpose and limitations fit the brief. A specialized example is not automatically reusable for unrelated content.",
    "- If no registered composition is a good fit, propose a new PascalCase compositionId with availability 'to-be-built'. Do not pretend it already exists or that the project is render-ready; implement and register it before rendering.",
    "- Always give a concrete rationale, required capabilities and an honest fallback. Do not choose based on convenience or because ProjectVideo is the easiest route.",
    "- Make each shot filmable/renderable: describe subject, environment, foreground/background, lighting, composition, action, and what visibly changes over time. Avoid vague adjectives without concrete visual direction.",
    "- Vary shot scale, angle, composition and movement with intent. Avoid repeating the same framing or technique in adjacent shots unless repetition is a deliberate motif.",
    "- Protect the brief's factual constraints and acceptance criteria. Never invent product facts, sources, footage availability, or asset licenses. Mark unknowns as needs.",
    "- Set `assetVisualReviewRequired: true` for every new production plan. Assets need local preview files and explicit visual-review approval before strict asset evidence passes. Audio assets are exempt from visual review. Do not fabricate review metadata or approve assets you have not actually inspected.",
    "- In each manifest entry set `reusePolicy`: `required` when the final composition must reference the actual production file, `optional` when use is discretionary, or `reference-only` for design studies that guide the artwork but are not runtime assets. For ProjectVideo, a required visual asset must appear in the `scene.json` scene whose ID matches each assigned `shotId` (or every scene for `all`); placing it in a different scene does not satisfy the assignment. Audio tracks are global and are checked globally. For custom Remotion, make required asset use statically auditable in the selected component's reachable import graph: use explicit Remotion `staticFile()` paths, local media imports or statically resolvable media `src`/`poster` fields; do not rely on dynamically concatenated paths or mere title/copy mentions. The audit ignores unrelated string literals. For custom Remotion productions, add top-level `shotComponents` in the asset manifest with schemaVersion 1 and one entry per plan shot, each listing repository-relative reachable source module paths (for example a `shotComponents` object with `schemaVersion: 1` and a `shots` array containing `{ shotId, modules }` entries). Required visual assets must be referenced within the module(s) mapped to each assigned shot. All shot IDs must be mapped exactly once; unknown shots, missing mappings and unreachable modules block the strict audit. Required audio remains global and is not mapped per shot. This proves source/module association only, not visible pixels, semantic suitability or timing. Never mark a separate recreation as use of the original file.",
    "- Sound is editorial: give each shot a purposeful sound cue/ambience/music change or intentional silence; avoid generic whooshes.",
    "- Respect runtime exactly. Use contiguous shot timing with no gaps/overlaps, start at 0, and end at delivery.durationSeconds. Every boundary must be frame-aligned for the supplied fps.",
    "",
    "## Verified composition registry",
    compositionRegistry,
    "",
    "Select only a composition marked selectable. DemoVideo and ThreeDShowcase are reference/test-only. The registry is the source of truth for currently available production compositions.",
    "",
    "## Timing and scope",
    `- Delivery duration: ${duration}s at ${String(delivery.fps)} fps.`,
    `- Target approximately ${minShots}–${maxShots} shots. This is guidance, not a hard limit; justify departures.`,
    "- Build a coherent sequence, not a checklist that mechanically assigns one emotional-arc item to each shot.",
    "- Before writing shots, silently compare at least three different creative approaches (e.g. live-action-led, graphic-led, 3D/procedural, hybrid) and choose the one with the strongest brief-specific visual idea; do not list options in the output.",
    "- Write a visual grammar: one or two recurring visual motifs, how they evolve, and explicit rules for when to break/reinvent them. Put this in creativeDirection.concept and motionLanguage.",
    "- For every shot, define a visual event—not just an image: what enters, moves, transforms, is revealed, collides, changes scale, or resolves. Static shots are allowed only when intentional and explained by purpose.",
    "- Design the sequence as a storyboard of filmable moments with varied visual methods, framing, depth, and pace. Avoid consecutive shots that are effectively the same layout with different copy or background.",
    "- Ensure the first shot creates curiosity or tension, the middle develops/reframes/escalates, and the final shot resolves the promise. Adapt this structure to the format.",
    "",
    "## Output contract",
    "Return ONLY valid JSON, no Markdown fences, using this exact top-level shape:",
    `{
  "schemaVersion": 1,
  "id": "lowercase-slug",
  "title": "Storyboard title",
  "delivery": { "durationSeconds": ${duration}, "width": ${delivery.width}, "height": ${delivery.height}, "fps": ${delivery.fps}, "format": "mp4" },
  "creativeDirection": {
    "objective": "string",
    "audience": "string",
    "concept": "string",
    "visualSystem": { "palette": ["string"], "typography": "string", "composition": "string", "lighting": "string", "texture": "string" },
    "motionLanguage": "string",
    "soundDirection": "string"
  },
  "renderStrategy": {
    "renderer": "project-video | custom-remotion",
    "compositionId": "exact registered ID, or a new PascalCase ID if availability is to-be-built",
    "availability": "registered | to-be-built",
    "rationale": "why this whole-video renderer/composition fits the story and visual direction",
    "requiredCapabilities": ["concrete rendering capabilities required"],
    "fallback": "honest alternative if the composition or a required capability cannot be delivered"
  },
  "shots": [{
    "id": "shot-01",
    "startSeconds": 0,
    "durationSeconds": 3,
    "narrativeBeat": "hook|setup|context|development|escalation|reveal|payoff|cta|transition|pause",
    "purpose": "why this shot exists",
    "visual": "specific scene and subject description",
    "visualMethod": "chosen production method",
    "action": "visible subject action",
    "visualProgression": "what changes from start to end",
    "framing": "shot size, angle and composition",
    "cameraMovement": "motivated movement or static",
    "onScreenText": "optional short copy",
    "transition": "edit into next shot",
    "audio": "sound/ambience/music/intentional silence",
    "assets": [],
    "engineApproach": "practical implementation notes"
  }],
  "acceptanceCoverage": [{
    "criterion": "Exact criterion text copied from the Creative Brief",
    "shotIds": ["shot-01"],
    "rationale": "Specific visible evidence in the referenced shot(s)"
  }]
}`,
    "",
    "## Required self-review before returning JSON",
    "- Recalculate shot timing and total runtime; confirm frame alignment.",
    "- Remove shots that merely repeat information or exist only to fill time.",
    "- Check the sequence for meaningful visual progression, strong visual specificity and shot variety.",
    "- Audit every shot as a distinct visual event. Reject shots whose only change is replacing text, color or background unless that repetition is a deliberate storytelling device.",
    "- Check that the visual grammar has recurring motifs that develop—not a rigid template repeated shot after shot.",
    "- Check the chosen creative approach is clearly brief-specific and not the easiest registered renderer/template.",
    "- Check that no unsupported facts or assets are assumed available.",
    "- Confirm renderStrategy is a single whole-video composition decision, distinct from per-shot visualMethod; registered IDs must come from the supplied registry and to-be-built IDs must not be described as available.",
    "- Include exactly one acceptanceCoverage entry per Creative Brief acceptance criterion. Copy the criterion text verbatim, reference one or more existing shot IDs, and provide a specific visual rationale. Do not omit or invent criteria.",
    "- Make production notes honest: distinguish asset needs from assets already available.",
    "",
    "## Creative Brief (source of truth)",
    "",
    "```json",
    briefJson,
    "```",
    ""
  ].join("\n");
};

const main = async (): Promise<void> => {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input) {
    process.stderr.write("Usage: npm run director:storyboard-prompt -- <creative-brief.json> [handoff.md]\n");
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
    const prompt = buildStoryboardDirectorPrompt(brief as RecordValue);
    if (output) await writeFile(output, prompt + "\n", "utf8");
    else process.stdout.write(prompt + "\n");
  } catch (error) {
    process.stderr.write(`Could not build storyboard handoff: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
};
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
