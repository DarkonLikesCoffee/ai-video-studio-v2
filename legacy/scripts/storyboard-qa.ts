import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export type StoryboardRiskCode =
  | "LONG_SHOT"
  | "STATIC_HOLD"
  | "REPEATED_VISUAL_METHOD"
  | "REPEATED_FRAMING"
  | "REPEATED_CAMERA_MOVEMENT"
  | "VAGUE_VISUAL_DESCRIPTION"
  | "VAGUE_ACTION"
  | "INCOMPLETE_VISUAL_PROGRESSION"
  | "REPEATED_VISUAL_DESCRIPTION"
  | "TEXT_HEAVY_SHOT"
  | "LOW_SHOT_SCALE_VARIETY"
  | "REPEATED_SHOT_SCALE";

export type StoryboardRiskFinding = {
  code: StoryboardRiskCode;
  severity: "warning";
  shotIds: string[];
  message: string;
};

type ShotLike = Record<string, unknown>;
type PlanLike = Record<string, unknown> & { shots?: unknown };

const normalize = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";

const getShots = (plan: unknown): ShotLike[] => {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return [];
  const shots = (plan as PlanLike).shots;
  return Array.isArray(shots) ? shots.filter((shot): shot is ShotLike => !!shot && typeof shot === "object" && !Array.isArray(shot)) : [];
};

const getShotId = (shot: ShotLike, index: number): string =>
  typeof shot.id === "string" && shot.id.trim() ? shot.id : `shot-${index + 1}`;

const tokens = (value: unknown): Set<string> =>
  new Set(normalize(value).match(/[a-z0-9]{3,}/g) ?? []);

const similarity = (left: unknown, right: unknown): number => {
  const a = tokens(left);
  const b = tokens(right);
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / new Set([...a, ...b]).size;
};

const isVague = (value: unknown): boolean => {
  const text = normalize(value);
  return !text || /\b(show|display|visualize|illustrate|represent) (the|this|concept|idea|topic|point)\b|\b(abstract visual|generic visuals|something relevant|various visuals|dynamic scene)\b/.test(text);
};

const hasProgressionMarker = (value: unknown): boolean => {
  const text = normalize(value);
  return /\b(start|begin|opening)\s*:/i.test(text)
    && /\b(development|develop|middle|progress)\s*:/i.test(text)
    && /\b(end|finish|final|resolve)\s*:/i.test(text);
};


const shotScale = (value: unknown): string | null => {
  const text = normalize(value);
  const patterns: Array<[string, RegExp]> = [
    ["extreme-close-up", /\b(extreme close[- ]?up|extreme macro)\b/],
    ["macro", /\b(macro|detail shot|detail close[- ]?up)\b/],
    ["close-up", /\b(close[- ]?up|tight shot)\b/],
    ["medium", /\b(medium shot|mid shot|waist shot|medium close)\b/],
    ["wide", /\b(wide shot|long shot|full shot|establishing shot|aerial wide)\b/],
  ];
  for (const [scale, pattern] of patterns) if (pattern.test(text)) return scale;
  return null;
};

const repeatedAdjacent = (
  shots: ShotLike[],
  field: "visualMethod" | "framing" | "cameraMovement",
  minimumRun: number,
  code: StoryboardRiskCode,
  label: string,
): StoryboardRiskFinding[] => {
  const findings: StoryboardRiskFinding[] = [];
  let runStart = 0;
  while (runStart < shots.length) {
    const value = normalize(shots[runStart]?.[field]);
    if (!value) {
      runStart += 1;
      continue;
    }
    let runEnd = runStart + 1;
    while (runEnd < shots.length && normalize(shots[runEnd]?.[field]) === value) runEnd += 1;
    if (runEnd - runStart >= minimumRun) {
      findings.push({
        code,
        severity: "warning",
        shotIds: shots.slice(runStart, runEnd).map(getShotId),
        message: `Adjacent shots repeat the same ${label} (${runEnd - runStart} shots). Review whether the repetition is intentional.`,
      });
    }
    runStart = runEnd;
  }
  return findings;
};

/**
 * Deterministic storyboard heuristics. These are review prompts, not a semantic
 * quality score and never prove that a shot or sequence is creatively weak.
 */
export const analyzeStoryboardRisks = (plan: unknown): StoryboardRiskFinding[] => {
  const shots = getShots(plan);
  const findings: StoryboardRiskFinding[] = [];

  shots.forEach((shot, index) => {
    const duration = Number(shot.durationSeconds);
    const id = getShotId(shot, index);
    if (isVague(shot.visual)) {
      findings.push({ code: "VAGUE_VISUAL_DESCRIPTION", severity: "warning", shotIds: [id], message: "Visual description may be generic or placeholder-like. Specify a concrete subject, environment and visible event." });
    }
    if (isVague(shot.action)) {
      findings.push({ code: "VAGUE_ACTION", severity: "warning", shotIds: [id], message: "Action may be vague. Describe what the subject/object does and how it changes the frame." });
    }
    if (!hasProgressionMarker(shot.visualProgression)) {
      findings.push({ code: "INCOMPLETE_VISUAL_PROGRESSION", severity: "warning", shotIds: [id], message: "Progression is missing explicit Start, Development and End markers; describe how the shot visibly evolves." });
    }
    const copy = typeof shot.onScreenText === "string" ? shot.onScreenText.trim() : "";
    if (copy.length >= 55 || copy.split(/\s+/).length >= 10) {
      findings.push({ code: "TEXT_HEAVY_SHOT", severity: "warning", shotIds: [id], message: "On-screen copy is lengthy. Review whether the visual carries the idea and whether the text can be read comfortably." });
    }
    if (Number.isFinite(duration) && duration >= 8) {
      findings.push({
        code: "LONG_SHOT",
        severity: "warning",
        shotIds: [id],
        message: `Shot lasts ${duration}s (8s or longer). Review visual development and pacing; long shots can be intentional.`,
      });
    }

    const camera = normalize(shot.cameraMovement);
    if (Number.isFinite(duration) && duration >= 5 && /\b(static|stationary|locked[- ]off|no movement|still camera|fixed camera)\b/.test(camera)) {
      findings.push({
        code: "STATIC_HOLD",
        severity: "warning",
        shotIds: [id],
        message: `Shot describes a static camera for ${duration}s. Review whether the hold is motivated and whether the visual itself develops.`,
      });
    }
  });

  const knownScales = shots.map((shot) => shotScale(shot.framing)).filter((scale): scale is string => scale !== null);
  if (shots.length >= 5 && knownScales.length >= Math.ceil(shots.length * 0.6) && new Set(knownScales).size <= 2) {
    findings.push({
      code: "LOW_SHOT_SCALE_VARIETY",
      severity: "warning",
      shotIds: shots.map((shot, index) => getShotId(shot, index)),
      message: `Only ${new Set(knownScales).size} recognizable shot scales appear across ${shots.length} shots. Review whether the sequence benefits from stronger scale contrast; unknown framings are excluded.`,
    });
  }
  findings.push(...repeatedAdjacent(shots.map((shot) => ({ ...shot, __shotScale: shotScale(shot.framing) ?? "" })), "__shotScale" as "visualMethod", 3, "REPEATED_SHOT_SCALE", "shot scale"));

  findings.push(...repeatedAdjacent(shots, "visualMethod", 3, "REPEATED_VISUAL_METHOD", "visual method"));
  findings.push(...repeatedAdjacent(shots, "framing", 2, "REPEATED_FRAMING", "framing"));
  findings.push(...repeatedAdjacent(shots, "cameraMovement", 3, "REPEATED_CAMERA_MOVEMENT", "camera movement"));

  for (let index = 1; index < shots.length; index += 1) {
    const previous = shots[index - 1]!;
    const current = shots[index]!;
    const visualSimilarity = similarity(previous.visual, current.visual);
    if (visualSimilarity >= 0.82 && tokens(previous.visual).size >= 5 && tokens(current.visual).size >= 5) {
      findings.push({
        code: "REPEATED_VISUAL_DESCRIPTION",
        severity: "warning",
        shotIds: [getShotId(previous, index - 1), getShotId(current, index)],
        message: `Adjacent visual descriptions are highly similar (token similarity ${visualSimilarity.toFixed(2)}). Review whether the next shot adds a new visual event or composition.`,
      });
    }
  }

  return findings;
};

const runCli = async (): Promise<void> => {
  const inputPath = process.argv[2];
  if (!inputPath) {
    process.stderr.write("Usage: npm run storyboard:qa -- <production-plan.json>\n");
    process.exitCode = 2;
    return;
  }

  try {
    const plan: unknown = JSON.parse(await readFile(inputPath, "utf8"));
    const findings = analyzeStoryboardRisks(plan);
    if (findings.length === 0) {
      process.stdout.write(`No deterministic storyboard-risk patterns detected: ${inputPath}\n`);
      process.stdout.write("This does not replace creative or visual review.\n");
      return;
    }
    process.stdout.write(`Storyboard risk review: ${inputPath}\n`);
    for (const finding of findings) {
      process.stdout.write(`- [${finding.code}] ${finding.shotIds.join(", ")}: ${finding.message}\n`);
    }
    process.stdout.write(`\n${findings.length} warning(s). Warnings do not fail production-plan validation.\n`);
    process.stdout.write("These deterministic signals do not judge story meaning or prove poor quality.\n");
  } catch (error) {
    process.stderr.write(`Could not analyze storyboard: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
