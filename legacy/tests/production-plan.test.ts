import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateProductionPlan } from "../scripts/validate-production-plan";
import { NARRATIVE_BEATS } from "../scripts/storyboard-beats";
import { analyzeStoryboardRisks } from "../scripts/storyboard-qa";
import { critiqueStoryboard, renderStoryboardCritiqueMarkdown } from "../scripts/storyboard-critic";

const example = JSON.parse(
  await readFile(new URL("../projects/examples/production-plan.json", import.meta.url), "utf8")
) as Record<string, unknown>;

test("production-plan JSON Schema matches runtime shot requirements and narrative-beat labels", async () => {
  const schema = JSON.parse(await readFile(new URL("../schemas/production-plan.schema.json", import.meta.url), "utf8"));
  const shotSchema = schema.properties.shots.items;
  const runtimeRequiredFields = ["id", "startSeconds", "durationSeconds", "purpose", "visual", "visualMethod", "action", "visualProgression", "framing", "cameraMovement", "transition", "audio"];
  for (const field of runtimeRequiredFields) {
    assert.ok(shotSchema.required.includes(field), `Schema must require ${field}`);
    assert.ok(shotSchema.properties[field], `Schema must define ${field}`);
  }
  assert.deepEqual(shotSchema.properties.narrativeBeat.enum, NARRATIVE_BEATS);
  assert.ok(!shotSchema.required.includes("narrativeBeat"), "narrativeBeat remains optional");
  assert.ok(shotSchema.properties.implementationNotes, "free-form implementation notes must be preserved");
  assert.ok(schema.required.includes("renderStrategy"), "a plan must make a whole-video composition decision");
  assert.deepEqual(schema.properties.audioMode.enum, ["required", "optional", "silent"]);
  assert.ok(!schema.required.includes("audioMode"), "legacy plans remain valid without audio mode");
  assert.deepEqual(schema.properties.renderStrategy.required, ["renderer", "compositionId", "availability", "rationale", "requiredCapabilities", "fallback"]);
  const coverageSchema = schema.properties.acceptanceCoverage;
  assert.ok(coverageSchema, "schema must define optional acceptance coverage");
  assert.ok(!schema.required.includes("acceptanceCoverage"), "legacy plans remain valid without coverage");
  assert.deepEqual(coverageSchema.items.required, ["criterion", "shotIds", "rationale"]);
});

test("example production plan passes validation", () => {
  assert.deepEqual(validateProductionPlan(example), []);
});

test("production plan preserves bounded free-form implementation notes", () => {
  const withNotes = structuredClone(example);
  const shots = withNotes.shots as Array<Record<string, unknown>>;
  shots[0]!.implementationNotes = "Use a custom Remotion composition.";
  assert.deepEqual(validateProductionPlan(withNotes), []);
  shots[0]!.implementationNotes = "x".repeat(501);
  assert.ok(validateProductionPlan(withNotes).some((error) => error.includes("implementationNotes")));
});

test("production plan accepts supported narrative beat tags", () => {
  const tagged = structuredClone(example);
  const shots = tagged.shots as Array<Record<string, unknown>>;
  shots[0]!.narrativeBeat = "hook";
  shots[1]!.narrativeBeat = "development";
  assert.deepEqual(validateProductionPlan(tagged), []);
});

test("production plan rejects unknown narrative beat tags", () => {
  const invalid = structuredClone(example);
  (invalid.shots as Array<Record<string, unknown>>)[0]!.narrativeBeat = "random";
  assert.ok(validateProductionPlan(invalid).some((error) => error.includes("narrativeBeat")));
});

test("production plan requires a meaningful acceptance checklist", () => {
  const invalid = structuredClone(example);
  invalid.acceptanceCriteria = ["Only one criterion"];
  assert.ok(validateProductionPlan(invalid).some((error) => error.includes("acceptanceCriteria")));
});

test("production plan rejects duplicate shot IDs", () => {
  const invalid = structuredClone(example);
  const shots = invalid.shots as Array<Record<string, unknown>>;
  shots[1]!.id = shots[0]!.id;
  assert.ok(validateProductionPlan(invalid).some((error) => error.includes("unique")));
});

test("production plan rejects shots that exceed the requested runtime", () => {
  const invalid = structuredClone(example);
  const shots = invalid.shots as Array<Record<string, unknown>>;
  shots[3]!.durationSeconds = 8;
  assert.ok(validateProductionPlan(invalid).some((error) => error.includes("extends beyond")));
});

test("production plan rejects out-of-order shots", () => {
  const invalid = structuredClone(example);
  const shots = invalid.shots as Array<Record<string, unknown>>;
  shots[2]!.startSeconds = 2;
  assert.ok(validateProductionPlan(invalid).some((error) => error.includes("ordered")));
});

test("production plan requires a selected visual method for every shot", () => {
  const invalid = structuredClone(example);
  const shots = invalid.shots as Array<Record<string, unknown>>;
  delete shots[0]!.visualMethod;
  assert.ok(validateProductionPlan(invalid).some((error) => error.includes("visualMethod")));
});

test("production plan requires concrete action and visual progression", () => {
  const invalid = structuredClone(example);
  const shots = invalid.shots as Array<Record<string, unknown>>;
  delete shots[1]!.action;
  shots[2]!.visualProgression = " ";
  const errors = validateProductionPlan(invalid);
  assert.ok(errors.some((error) => error.includes("action")));
  assert.ok(errors.some((error) => error.includes("visualProgression")));
});

test("storyboard QA warns about long shots and static camera holds", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots[1]!.durationSeconds = 8;
  shots[1]!.cameraMovement = "static locked-off camera";
  const findings = analyzeStoryboardRisks(plan);
  assert.ok(findings.some((finding) => finding.code === "LONG_SHOT" && finding.shotIds.includes("form-reveal")));
  assert.ok(findings.some((finding) => finding.code === "STATIC_HOLD" && finding.shotIds.includes("form-reveal")));
});

test("storyboard QA warns on repeated adjacent framing", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots[1]!.framing = shots[0]!.framing;
  const findings = analyzeStoryboardRisks(plan);
  assert.ok(findings.some((finding) => finding.code === "REPEATED_FRAMING" && finding.shotIds.length === 2));
});

test("storyboard QA warns only on long runs of repeated visual method and camera movement", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots.forEach((shot) => {
    shot.visualMethod = "motion graphics";
    shot.cameraMovement = "slow push-in";
  });
  const findings = analyzeStoryboardRisks(plan);
  assert.ok(findings.some((finding) => finding.code === "REPEATED_VISUAL_METHOD" && finding.shotIds.length === 4));
  assert.ok(findings.some((finding) => finding.code === "REPEATED_CAMERA_MOVEMENT" && finding.shotIds.length === 4));
});

test("storyboard QA returns no findings for a varied short sequence", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots.forEach((shot, index) => {
    shot.durationSeconds = 3;
    shot.visualMethod = `method-${index}`;
    shot.framing = `frame-${index}`;
    shot.cameraMovement = `move-${index}`;
  });
  assert.deepEqual(analyzeStoryboardRisks(plan), []);
});

test("storyboard QA flags placeholder-like visual and action descriptions", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots[0]!.visual = "Show this concept";
  shots[0]!.action = "Show the idea";
  const findings = analyzeStoryboardRisks(plan);
  assert.ok(findings.some((finding) => finding.code === "VAGUE_VISUAL_DESCRIPTION" && finding.shotIds.includes("opening-macro")));
  assert.ok(findings.some((finding) => finding.code === "VAGUE_ACTION" && finding.shotIds.includes("opening-macro")));
});

test("storyboard QA warns when progression lacks explicit phases", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots[2]!.visualProgression = "A detail moves into frame and the light changes.";
  assert.ok(analyzeStoryboardRisks(plan).some((finding) => finding.code === "INCOMPLETE_VISUAL_PROGRESSION" && finding.shotIds.includes("detail-proof")));
});

test("storyboard QA flags highly similar adjacent visual descriptions", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots[1]!.visual = shots[0]!.visual;
  const findings = analyzeStoryboardRisks(plan);
  assert.ok(findings.some((finding) => finding.code === "REPEATED_VISUAL_DESCRIPTION" && finding.shotIds.length === 2));
});

test("storyboard QA warns on unusually long on-screen copy without failing validation", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots[0]!.onScreenText = "A very long headline that may overwhelm the visual and take too long to read on screen";
  assert.ok(analyzeStoryboardRisks(plan).some((finding) => finding.code === "TEXT_HEAVY_SHOT"));
});


test("storyboard QA warns when a long sequence uses only two recognizable shot scales", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots.push({ ...shots[3], id: "extra-shot", startSeconds: 15, durationSeconds: 2 });
  shots.forEach((shot, index) => { shot.framing = index % 2 === 0 ? "Close-up shot" : "Tight close up"; });
  const findings = analyzeStoryboardRisks(plan);
  assert.ok(findings.some((finding) => finding.code === "LOW_SHOT_SCALE_VARIETY" && finding.shotIds.length === 5));
});

test("storyboard QA warns on runs of three adjacent shots with the same recognized scale", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots.forEach((shot) => { shot.framing = "Medium shot with subject left"; });
  const findings = analyzeStoryboardRisks(plan);
  assert.ok(findings.some((finding) => finding.code === "REPEATED_SHOT_SCALE" && finding.shotIds.length === 4));
});


test("storyboard critic prioritizes actionable high-impact shot revisions", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots[0]!.visual = "Show this concept";
  shots[0]!.action = "Show the idea";
  shots[0]!.visualProgression = "No change";
  const critique = critiqueStoryboard(plan);
  assert.ok(critique.length > 0);
  assert.equal(critique[0]!.priority, "high");
  assert.ok(critique[0]!.revision.length > 30);
  assert.ok(critique.some((item) => item.shotIds.includes("opening-macro")));
});

test("storyboard critic report is review-only and does not modify the source plan", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots[0]!.visual = "Show this concept";
  shots[0]!.action = "Show the idea";
  const before = JSON.stringify(plan);
  const report = renderStoryboardCritiqueMarkdown(plan);
  assert.match(report, /Review-only report/);
  assert.match(report, /Suggested revision/);
  assert.match(report, /validate:plan/);
  assert.equal(JSON.stringify(plan), before);
});

test("storyboard critic states no creative approval when no findings exist", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots.forEach((shot, index) => {
    shot.durationSeconds = 3;
    shot.visualMethod = `method-${index}`;
    shot.framing = `frame-${index}`;
    shot.cameraMovement = `move-${index}`;
  });
  assert.match(renderStoryboardCritiqueMarkdown(plan), /not a creative approval/);
});

import { createVisualStrategyReport, renderVisualStrategyMarkdown } from "../scripts/storyboard-strategy";

test("visual strategy report summarizes methods and gives targeted alternatives", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots[0]!.visual = "Show this concept";
  shots[0]!.action = "Show the idea";
  shots[0]!.visualProgression = "No progression";
  shots.forEach((shot) => { shot.visualMethod = "motion graphics"; });
  const report = createVisualStrategyReport(plan);
  assert.equal(report.shotCount, shots.length);
  assert.equal(report.methodCounts["motion graphics"], shots.length);
  const opening = report.recommendations.find((item) => item.shotId === "opening-macro");
  assert.ok(opening);
  assert.ok(opening.issueCodes.includes("VAGUE_VISUAL_DESCRIPTION"));
  assert.ok(opening.alternatives.some((alternative) => alternative.includes("visual demonstration")));
});

test("visual strategy report is review-only and states its limits", () => {
  const report = renderVisualStrategyMarkdown(example);
  assert.match(report, /Rule-based planning aid/);
  assert.match(report, /does not rewrite the plan/);
  assert.match(report, /Visual method mix/);
});

import { renderVisualStrategyJson } from "../scripts/storyboard-strategy";

test("visual strategy JSON has a versioned machine-readable envelope", () => {
  const plan = structuredClone(example);
  const parsed = JSON.parse(renderVisualStrategyJson(plan)) as {
    schemaVersion: number;
    reportType: string;
    planTitle: string;
    report: { shotCount: number; methodCounts: Record<string, number>; recommendations: unknown[] };
    generatedBy: string;
  };
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.reportType, "storyboard-visual-strategy");
  assert.equal(parsed.planTitle, plan.title);
  assert.equal(parsed.report.shotCount, plan.shots.length);
  assert.equal(parsed.generatedBy, "ai-video-studio/storyboard:strategy");
  assert.ok(Array.isArray(parsed.report.recommendations));
});


test("production plan requires an explicit registered or to-be-built composition strategy", () => {
  const missing = structuredClone(example);
  delete missing.renderStrategy;
  assert.ok(validateProductionPlan(missing).some((error) => error.includes("renderStrategy")));

  const invalid = structuredClone(example);
  invalid.renderStrategy = {
    renderer: "project-video",
    compositionId: "SomeMadeUpComposition",
    availability: "registered",
    rationale: "Use it because it seems suitable.",
    requiredCapabilities: ["2D animation"],
    fallback: "Try the default renderer.",
  };
  assert.ok(validateProductionPlan(invalid).some((error) => error.includes("not registered")));
});

test("assetVisualReviewRequired is optional for legacy plans and must be boolean when set", () => {
  const legacy = structuredClone(example);
  delete legacy.assetVisualReviewRequired;
  assert.deepEqual(validateProductionPlan(legacy).filter(error => error.includes("assetVisualReviewRequired")), []);

  const enabled = structuredClone(example);
  enabled.assetVisualReviewRequired = true;
  assert.deepEqual(validateProductionPlan(enabled).filter(error => error.includes("assetVisualReviewRequired")), []);

  const invalid = structuredClone(example);
  invalid.assetVisualReviewRequired = "required";
  assert.ok(validateProductionPlan(invalid).some(error => error.includes("assetVisualReviewRequired must be a boolean")));
});
