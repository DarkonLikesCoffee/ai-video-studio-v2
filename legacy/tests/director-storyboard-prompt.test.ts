import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildStoryboardDirectorPrompt } from "../scripts/director-storyboard-prompt";

const brief = JSON.parse(await readFile(new URL("../projects/examples/creative-brief.json", import.meta.url), "utf8"));

test("storyboard handoff embeds source brief and frame-aware timing constraints", () => {
  const prompt = buildStoryboardDirectorPrompt(brief);
  assert.match(prompt, /Return ONLY valid JSON/);
  assert.match(prompt, /end at delivery\.durationSeconds/);
  assert.match(prompt, /frame-aligned/);
  assert.match(prompt, /Cinematic Product Launch/);
  assert.match(prompt, /acceptance criterion/);
  assert.match(prompt, /shot-01/);
  assert.match(prompt, /acceptanceCoverage/);
  assert.match(prompt, /shotIds/);
  assert.match(prompt, /rationale/);
  assert.match(prompt, /Copy the criterion text verbatim/);
});
test("shot target range adapts to brief duration", () => {
  const short = structuredClone(brief);
  short.delivery.durationSeconds = 10;
  const prompt = buildStoryboardDirectorPrompt(short);
  assert.match(prompt, /Target approximately 3–5 shots/);
  const long = structuredClone(brief);
  long.delivery.durationSeconds = 60;
  const longPrompt = buildStoryboardDirectorPrompt(long);
  assert.match(longPrompt, /Target approximately 12–30 shots/);
});
test("handoff warns against generic slide-like visual defaults", () => {
  const prompt = buildStoryboardDirectorPrompt(brief);
  assert.match(prompt, /Do not default to text cards, diagrams/);
  assert.match(prompt, /visual story/);
  assert.match(prompt, /sound is editorial/i);
});


test("handoff includes the verified composition registry and requires an explicit renderer decision", () => {
  const prompt = buildStoryboardDirectorPrompt(brief);
  assert.match(prompt, /Verified composition registry/);
  assert.match(prompt, /ProjectVideo \[project-video; 2d; selectable\]/);
  assert.match(prompt, /ProjectVideo is a fixed-layout compatibility renderer, not the default/);
  assert.match(prompt, /"renderStrategy"/);
  assert.match(prompt, /"availability": "registered \| to-be-built"/);
  assert.match(prompt, /new PascalCase ID/);
});

test("handoff requires a deliberate creative-territory choice and evolving visual grammar", () => {
  const prompt = buildStoryboardDirectorPrompt(brief);
  assert.match(prompt, /compare at least three different creative approaches/i);
  assert.match(prompt, /visual grammar/i);
  assert.match(prompt, /visual event—not just an image/i);
  assert.match(prompt, /only change is replacing text, color or background/i);
  assert.match(prompt, /not the easiest registered renderer\/template/i);
});
