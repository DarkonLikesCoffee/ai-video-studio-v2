import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildProductionPlanFromStoryboard } from "../scripts/director-production-plan";
import { validateAcceptanceCoverage, validateProductionPlan } from "../scripts/validate-production-plan";

const brief = JSON.parse(await readFile(new URL("../projects/examples/creative-brief.json", import.meta.url), "utf8"));
const narratedPlan = JSON.parse(await readFile(new URL("../projects/examples/narrated-explainer/production/production-plan.json", import.meta.url), "utf8"));

const storyboard = () => ({
  schemaVersion: 1,
  id: "cinematic-launch-storyboard",
  title: "Cinematic Product Launch",
  delivery: { ...brief.delivery },
  renderStrategy: {
    renderer: "custom-remotion",
    compositionId: "HeadphoneProductReveal",
    availability: "to-be-built",
    rationale: "The product reveal needs bespoke 3D macro photography, an exploded product view and a moving camera that no current registered composition provides.",
    requiredCapabilities: ["Three.js product geometry", "procedural macro materials", "animated camera orbit", "exploded-view object animation"],
    fallback: "Build the custom composition before rendering; do not silently fall back to the fixed ProjectVideo layout.",
  },
  creativeDirection: {
    objective: brief.objective,
    audience: brief.audience,
    concept: "A tactile reveal from material macro to a resolved hero silhouette.",
    visualSystem: {
      palette: brief.visualLanguage.palette,
      typography: brief.visualLanguage.typography,
      composition: brief.visualLanguage.composition,
      lighting: brief.visualLanguage.lighting,
      texture: brief.visualLanguage.texture,
    },
    motionLanguage: brief.motionLanguage,
    soundDirection: brief.soundIdentity,
  },
  shots: [
    {
      id: "shot-01",
      startSeconds: 0,
      durationSeconds: 6,
      purpose: "Introduce material texture and establish curiosity.",
      visual: "Macro brushed-metal surface with the product concealed beyond the crop.",
      visualMethod: "Custom 3D macro product scene",
      action: "A narrow light strip travels across the surface as a subtle edge enters frame.",
      visualProgression: "Start on texture; reveal an edge; end with the material and silhouette hint visible.",
      framing: "Extreme macro, low oblique angle.",
      cameraMovement: "Slow lateral slider move.",
      transition: "Cut on the moving highlight.",
      audio: "Tactile metal foley over a quiet pulse.",
      assets: [],
      engineApproach: "Use a custom 3D render with a procedural brushed-metal material.",
    },
    {
      id: "shot-02",
      startSeconds: 6,
      durationSeconds: 7,
      purpose: "Reveal the product silhouette before the midpoint.",
      visual: "The complete headphone silhouette emerges against a dark studio background.",
      visualMethod: "Custom 3D product reveal",
      action: "The camera pulls back while the product rotates into a readable profile.",
      visualProgression: "Begin concealed; uncover the full silhouette; settle into a clean profile.",
      framing: "Medium close-up, profile with negative space.",
      cameraMovement: "Motivated pull-back with a restrained orbit.",
      transition: "Match cut from the highlight to the rim light.",
      audio: "The pulse opens into a restrained tonal swell.",
      assets: [],
    },
    {
      id: "shot-03",
      startSeconds: 13,
      durationSeconds: 7,
      purpose: "Resolve the tactile reveal into a confident hero frame.",
      visual: "Full product centered in a balanced studio composition, retaining the opening highlight motif.",
      visualMethod: "Custom 3D hero shot",
      action: "The product settles and a final edge highlight traces the opening motif.",
      visualProgression: "Move from a floating reveal to a stable hero frame with a final highlight.",
      framing: "Wide hero composition with balanced negative space.",
      cameraMovement: "Slow orbit decelerating into a locked-off finish.",
      transition: "Fade to black after the hero hold.",
      audio: "Pulse resolves; tactile tail fades into intentional silence.",
      assets: [],
      engineApproach: "A simple three-dimensional scene with restrained camera movement.",
    },
  ],
  acceptanceCoverage: brief.acceptanceCriteria.map((criterion, index) => ({
    criterion,
    shotIds: index === 0 ? ["shot-02"] : index === 1 ? ["shot-01", "shot-02", "shot-03"] : index === 2 ? ["shot-01", "shot-02", "shot-03"] : index === 3 ? ["shot-02"] : ["shot-03"],
    rationale: `Storyboard review should verify this criterion in ${index === 0 ? "the midpoint silhouette reveal" : index === 1 ? "the macro, medium and hero compositions" : index === 2 ? "the authored action/progression in each shot" : index === 3 ? "the text and claims review" : "the final motif/hero resolution"}.`,
  })),
});

test("Creative Brief + storyboard converts to a validated production plan with criteria traceability", () => {
  const plan = buildProductionPlanFromStoryboard(brief, storyboard());
  assert.deepEqual(validateProductionPlan(plan), []);
  assert.equal(plan.shots.length, 3);
  assert.equal(plan.renderStrategy.compositionId, "HeadphoneProductReveal");
  assert.equal(plan.renderStrategy.availability, "to-be-built");
  assert.equal(plan.acceptanceCoverage.length, brief.acceptanceCriteria.length);
  assert.deepEqual(plan.acceptanceCriteria, brief.acceptanceCriteria);
  assert.equal(plan.shots[0]?.implementationNotes, "Use a custom 3D render with a procedural brushed-metal material.");
  assert.equal(plan.shots[0]?.engineApproach, undefined);
  assert.equal(plan.creativeDirection.objective, brief.objective);
  assert.equal(plan.creativeDirection.visualSystem.textureAndMaterials, brief.visualLanguage.texture);
  assert.equal(plan.creativeDirection.visualSystem.texture, undefined);
});

test("conversion rejects uncovered brief criteria", () => {
  const draft = storyboard();
  draft.acceptanceCoverage.pop();
  assert.throws(() => buildProductionPlanFromStoryboard(brief, draft), /missing criterion/);
});

test("conversion rejects coverage that references an unknown shot", () => {
  const draft = storyboard();
  draft.acceptanceCoverage[0].shotIds = ["missing-shot"];
  assert.throws(() => buildProductionPlanFromStoryboard(brief, draft), /unknown shot/);
});

test("conversion rejects delivery drift from the brief", () => {
  const draft = storyboard();
  draft.delivery.durationSeconds = 18;
  assert.throws(() => buildProductionPlanFromStoryboard(brief, draft), /must match the Creative Brief/);
});

test("conversion rejects gaps and non-frame-aligned shot timing", () => {
  const draft = storyboard();
  draft.shots[1].startSeconds = 6.1;
  assert.throws(() => buildProductionPlanFromStoryboard(brief, draft), /Timeline gap\/overlap|frame-aligned/);
});

test("legacy plans without acceptanceCoverage remain valid", async () => {
  const legacy = JSON.parse(await readFile(new URL("../projects/examples/production-plan.json", import.meta.url), "utf8"));
  assert.equal(legacy.acceptanceCoverage, undefined);
  assert.deepEqual(validateAcceptanceCoverage(legacy), []);
  assert.deepEqual(validateProductionPlan(legacy), []);
});


test("migrated narrated explainer preserves legacy implementation notes and validates", () => {
  assert.deepEqual(validateProductionPlan(narratedPlan), []);
  assert.equal(narratedPlan.shots.length, 5);
  assert.ok(narratedPlan.shots.every((shot: Record<string, unknown>) => shot.engineApproach === undefined && shot.implementationNotes === "external-footage-with-3d-inset"));
});


test("conversion rejects an unregistered composition falsely marked as available", () => {
  const draft = storyboard();
  draft.renderStrategy.availability = "registered";
  assert.throws(() => buildProductionPlanFromStoryboard(brief, draft), /not registered/);
});

test("conversion rejects a renderer that conflicts with the selected composition", () => {
  const draft = storyboard();
  draft.renderStrategy.renderer = "project-video";
  assert.throws(() => buildProductionPlanFromStoryboard(brief, draft), /must use renderer "custom-remotion"/);
});
