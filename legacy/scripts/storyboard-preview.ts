import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

type UnknownRecord = Record<string, unknown>;
type StoryboardShot = {
  id: string;
  startSeconds: number;
  durationSeconds: number;
  purpose: string;
  visual: string;
  visualMethod: string;
  action: string;
  visualProgression: string;
  framing: string;
  cameraMovement: string;
  onScreenText?: string;
  transition: string;
  audio: string;
  assets: string[];
  engineApproach?: string;
};
type StoryboardPreview = {
  kind: "storyboard-review";
  notA: "rendered-video";
  plan: { id: string; title: string };
  delivery: { durationSeconds: number; width: number; height: number; fps: number; format: string };
  creativeDirection: { objective: string; audience: string; concept: string; visualSystem: UnknownRecord; motionLanguage: string; soundDirection: string };
  totalShots: number;
  shots: StoryboardShot[];
  limitations: string[];
};

const record = (value: unknown): UnknownRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
const requiredText = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
};
const finiteNumber = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
  return value;
};
const optionalText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/**
 * Builds a review artifact from production-plan data only. It does not render
 * footage, generate assets, infer semantic quality or claim to be an animatic.
 */
export const buildStoryboardPreview = (input: unknown): StoryboardPreview => {
  const plan = record(input);
  const deliveryRaw = record(plan.delivery);
  const directionRaw = record(plan.creativeDirection);
  if (!Array.isArray(plan.shots) || plan.shots.length === 0) {
    throw new Error("Production plan must contain at least one shot.");
  }

  const shots: StoryboardShot[] = plan.shots.map((rawShot, index) => {
    const shot = record(rawShot);
    const prefix = `shots[${index}]`;
    const startSeconds = finiteNumber(shot.startSeconds, `${prefix}.startSeconds`);
    const durationSeconds = finiteNumber(shot.durationSeconds, `${prefix}.durationSeconds`);
    if (startSeconds < 0 || durationSeconds <= 0) throw new Error(`${prefix} has an invalid time range.`);
    const assets = Array.isArray(shot.assets)
      ? shot.assets.map((asset, assetIndex) => requiredText(asset, `${prefix}.assets[${assetIndex}]`))
      : [];
    return {
      id: requiredText(shot.id, `${prefix}.id`),
      startSeconds,
      durationSeconds,
      purpose: requiredText(shot.purpose, `${prefix}.purpose`),
      visual: requiredText(shot.visual, `${prefix}.visual`),
      visualMethod: requiredText(shot.visualMethod, `${prefix}.visualMethod`),
      action: requiredText(shot.action, `${prefix}.action`),
      visualProgression: requiredText(shot.visualProgression, `${prefix}.visualProgression`),
      framing: requiredText(shot.framing, `${prefix}.framing`),
      cameraMovement: requiredText(shot.cameraMovement, `${prefix}.cameraMovement`),
      ...(typeof shot.onScreenText === "string" && shot.onScreenText.trim() ? { onScreenText: shot.onScreenText.trim() } : {}),
      transition: requiredText(shot.transition, `${prefix}.transition`),
      audio: requiredText(shot.audio, `${prefix}.audio`),
      assets,
      ...(typeof shot.engineApproach === "string" && shot.engineApproach.trim() ? { engineApproach: shot.engineApproach.trim() } : {}),
    };
  }).sort((left, right) => left.startSeconds - right.startSeconds);

  const durationSeconds = finiteNumber(deliveryRaw.durationSeconds, "delivery.durationSeconds");
  const width = finiteNumber(deliveryRaw.width, "delivery.width");
  const height = finiteNumber(deliveryRaw.height, "delivery.height");
  const fps = finiteNumber(deliveryRaw.fps, "delivery.fps");
  if (shots[0]?.startSeconds !== 0) throw new Error("The first shot must start at 0 seconds.");
  for (let index = 0; index < shots.length; index += 1) {
    const shot = shots[index]!;
    if (shot.startSeconds + shot.durationSeconds > durationSeconds + 1e-6) {
      throw new Error(`Shot "${shot.id}" extends beyond the declared runtime.`);
    }
  }
  const finalShot = shots.at(-1)!;
  if (Math.abs(finalShot.startSeconds + finalShot.durationSeconds - durationSeconds) > 1e-6) {
    throw new Error("The final shot must end at delivery.durationSeconds.");
  }

  return {
    kind: "storyboard-review",
    notA: "rendered-video",
    plan: {
      id: requiredText(plan.id, "id"),
      title: requiredText(plan.title, "title"),
    },
    delivery: {
      durationSeconds,
      width,
      height,
      fps,
      format: requiredText(deliveryRaw.format, "delivery.format"),
    },
    creativeDirection: {
      objective: requiredText(directionRaw.objective, "creativeDirection.objective"),
      audience: requiredText(directionRaw.audience, "creativeDirection.audience"),
      concept: requiredText(directionRaw.concept, "creativeDirection.concept"),
      visualSystem: record(directionRaw.visualSystem),
      motionLanguage: requiredText(directionRaw.motionLanguage, "creativeDirection.motionLanguage"),
      soundDirection: requiredText(directionRaw.soundDirection, "creativeDirection.soundDirection"),
    },
    totalShots: shots.length,
    shots,
    limitations: [
      "This artifact is a planning review, not an MP4 or animated animatic.",
      "It contains authored shot descriptions; it does not generate, source or preview the referenced assets.",
      "It does not judge semantic story quality or prove that the final render will match the plan.",
    ],
  };
};

const escapeHtml = (value: string): string => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const timestamp = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds % 60).toFixed(2).padStart(5, "0");
  return `${String(minutes).padStart(2, "0")}:${remainder}`;
};

export const renderStoryboardPreviewHtml = (preview: StoryboardPreview): string => {
  const shotCards = preview.shots.map((shot, index) => {
    const end = shot.startSeconds + shot.durationSeconds;
    const details = [
      ["Purpose", shot.purpose],
      ["What happens", shot.action],
      ["Visual", shot.visual],
      ["Progression", shot.visualProgression],
      ["Framing", shot.framing],
      ["Camera", shot.cameraMovement],
      ["Transition", shot.transition],
      ["Audio", shot.audio],
      ...(shot.onScreenText ? [["On-screen text", shot.onScreenText]] : []),
      ...(shot.assets.length ? [["Assets", shot.assets.join(", ")]] : []),
      ...(shot.engineApproach ? [["Engine", shot.engineApproach]] : []),
    ] as Array<[string, string]>;
    return `
      <article class="shot" style="--index:${index + 1}">
        <header class="shot-head">
          <span class="shot-index">${String(index + 1).padStart(2, "0")}</span>
          <div><h2>${escapeHtml(shot.id)}</h2><p>${timestamp(shot.startSeconds)} — ${timestamp(end)} <span>· ${shot.durationSeconds.toFixed(2)}s</span></p></div>
          <span class="method">${escapeHtml(shot.visualMethod)}</span>
        </header>
        <div class="progress">
          <span>${timestamp(shot.startSeconds)}</span><div><i style="left:0;width:${Math.max(0, Math.min(100, shot.startSeconds / preview.delivery.durationSeconds * 100))}%"></i><b style="left:${Math.max(0, Math.min(100, shot.startSeconds / preview.delivery.durationSeconds * 100))}%;width:${Math.max(0, Math.min(100, shot.durationSeconds / preview.delivery.durationSeconds * 100))}%"></b></div><span>${timestamp(end)}</span>
        </div>
        <dl>${details.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>
      </article>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Storyboard Review — ${escapeHtml(preview.plan.title)}</title>
<style>
:root{color-scheme:dark;--bg:#090d14;--panel:#111a26;--line:#26364a;--muted:#9aa9ba;--ink:#f2f6fb;--accent:#6ad9ff}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 12% 0%,#17283a 0,transparent 36%),var(--bg);color:var(--ink);font:15px/1.5 Inter,ui-sans-serif,system-ui,sans-serif}
main{max-width:1120px;margin:auto;padding:42px 24px 80px}.eyebrow{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:700}
h1{font-size:clamp(30px,5vw,54px);line-height:1.05;margin:12px 0}.intro{color:var(--muted);max-width:800px}.meta{display:flex;gap:10px;flex-wrap:wrap;margin:22px 0 34px}.pill{border:1px solid var(--line);border-radius:999px;padding:7px 12px;color:#d8e5f1;font-size:13px}
.notice{border:1px solid #6c4c27;background:#241b12;color:#f6d7a4;padding:14px 16px;border-radius:12px;margin:28px 0}.timeline{height:8px;background:#1b2634;border-radius:999px;overflow:hidden;margin:24px 0 8px}.timeline i{display:block;height:100%;background:linear-gradient(90deg,#6ad9ff,#ff8790)}
.shot{background:linear-gradient(145deg,#111a26,#0e151f);border:1px solid var(--line);border-radius:16px;padding:20px;margin:16px 0;box-shadow:0 14px 36px #0003}
.shot-head{display:flex;gap:14px;align-items:center}.shot-index{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#203549;color:var(--accent);font-weight:800}
h2{font-size:20px;margin:0 0 2px}p{margin:0;color:var(--muted);font-size:13px}.method{margin-left:auto;border:1px solid #34516a;border-radius:999px;padding:6px 10px;color:var(--accent);font-size:12px;max-width:40%;text-align:right}
.progress{display:grid;grid-template-columns:70px 1fr 70px;gap:10px;align-items:center;color:var(--muted);font-variant-numeric:tabular-nums;font-size:11px;margin:18px 0}.progress>div{height:6px;position:relative;background:#253244;border-radius:10px}.progress i,.progress b{position:absolute;height:100%;top:0;border-radius:10px}.progress i{left:0;background:#38536c}.progress b{left:var(--start,0);background:var(--accent);opacity:.9}
dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0}dl div{border-top:1px solid #263648;padding-top:9px;min-width:0}dt{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#8fa3b9;font-weight:700}dd{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
footer{margin-top:34px;border-top:1px solid var(--line);padding-top:20px;color:var(--muted);font-size:13px}ul{padding-left:20px}@media(max-width:650px){main{padding:28px 14px 48px}.shot-head{align-items:flex-start}.method{font-size:10px;max-width:34%}dl{grid-template-columns:1fr}.progress{grid-template-columns:55px 1fr 55px}}
</style></head>
<body><main>
<div class="eyebrow">AI Video Studio / Pre-production</div>
<h1>${escapeHtml(preview.plan.title)}</h1>
<p class="intro">${escapeHtml(preview.creativeDirection.concept)}</p>
<div class="meta"><span class="pill">${preview.totalShots} shots</span><span class="pill">${preview.delivery.durationSeconds}s</span><span class="pill">${preview.delivery.width}×${preview.delivery.height} · ${preview.delivery.fps} fps</span><span class="pill">${escapeHtml(preview.delivery.format.toUpperCase())} target</span></div>
<div class="notice"><strong>Planning preview — not a rendered video.</strong><br>This page visualizes the authored shot plan in timeline order. No footage, image generation, animation, audio or semantic quality review is performed here.</div>
<h2>Creative direction</h2><p>${escapeHtml(preview.creativeDirection.objective)} Audience: ${escapeHtml(preview.creativeDirection.audience)}.</p>
<div class="timeline"><i style="width:100%"></i></div>
<section>${shotCards}</section>
<footer><strong>Review limitations</strong><ul>${preview.limitations.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul><p>Motion: ${escapeHtml(preview.creativeDirection.motionLanguage)}</p><p>Sound: ${escapeHtml(preview.creativeDirection.soundDirection)}</p></footer>
</main></body></html>`;
};

const runCli = async (): Promise<void> => {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) {
    process.stderr.write("Usage: npm run storyboard:preview -- <production-plan.json> <output.html>\n");
    process.exitCode = 2;
    return;
  }
  try {
    const plan: unknown = JSON.parse(await readFile(inputPath, "utf8"));
    const preview = buildStoryboardPreview(plan);
    await writeFile(resolve(outputPath), renderStoryboardPreviewHtml(preview), "utf8");
    process.stdout.write(`Storyboard planning preview written: ${resolve(outputPath)}\n`);
    process.stdout.write(`Shots: ${preview.totalShots}; target runtime: ${preview.delivery.durationSeconds}s. This is not a rendered video.\n`);
  } catch (error) {
    process.stderr.write(`Could not build storyboard preview: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
