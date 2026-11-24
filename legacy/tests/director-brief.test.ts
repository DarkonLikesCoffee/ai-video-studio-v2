import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateCreativeBrief, renderCreativeBriefSummary } from "../scripts/director-brief";

const example = JSON.parse(await readFile(new URL("../projects/examples/creative-brief.json", import.meta.url), "utf8"));

test("example creative brief is valid", () => assert.deepEqual(validateCreativeBrief(example), []));
test("creative brief rejects missing core direction and invalid delivery", () => {
  const invalid = structuredClone(example);
  invalid.objective = "";
  invalid.delivery.fps = 29;
  invalid.visualLanguage.palette = [];
  invalid.acceptanceCriteria = ["only one"];
  const errors = validateCreativeBrief(invalid);
  assert.ok(errors.some((e) => e.includes("objective")));
  assert.ok(errors.some((e) => e.includes("fps")));
  assert.ok(errors.some((e) => e.includes("palette")));
  assert.ok(errors.some((e) => e.includes("acceptanceCriteria")));
});
test("creative brief enforces frame-aligned duration", () => {
  const invalid = structuredClone(example);
  invalid.delivery.durationSeconds = 1.11;
  assert.ok(validateCreativeBrief(invalid).some((e) => e.includes("whole number of frames")));
});
test("summary keeps the creative brief distinct from production plan", () => {
  const summary = renderCreativeBriefSummary(example);
  assert.match(summary, /Creative Brief/);
  assert.match(summary, /Creative thesis/);
  assert.match(summary, /not a storyboard or a verified production plan/);
});
