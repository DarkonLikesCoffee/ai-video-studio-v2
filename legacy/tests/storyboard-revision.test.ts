import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createStoryboardRevision, applyStoryboardRevisionEdits, validateStoryboardRevision, setStoryboardRevisionSuggestionSelection, renderStoryboardRevisionReviewMarkdown, renderStoryboardRevisionPromptMarkdown, importStoryboardRevisionEdits } from "../scripts/storyboard-revision";

const example = JSON.parse(await readFile(new URL("../projects/examples/production-plan.json", import.meta.url), "utf8"));

const revisionExample = structuredClone(example);
revisionExample.shots[0].visual = "Show this concept";
revisionExample.shots[0].action = "Show the concept";
revisionExample.shots[0].visualProgression = "";

test("revision artifact preserves the complete source plan and starts suggestions unselected", () => {
  const source = JSON.stringify(example, null, 2);
  const artifact = createStoryboardRevision("example.json", source);
  assert.deepEqual(artifact.sourcePlan, example);
  assert.equal(artifact.sourcePlanSha256.length, 64);
  assert.equal(artifact.sourcePlanText, source);
  assert.ok(artifact.suggestions.every((suggestion) => suggestion.selected === false));
  assert.deepEqual(artifact.edits, []);
  assert.equal(artifact.validation, null);
});

test("revision suggestions can be selected and deselected without creating plan edits", () => {
  const artifact = createStoryboardRevision("example.json", JSON.stringify(revisionExample));
  const first = artifact.suggestions[0];
  const selected = setStoryboardRevisionSuggestionSelection(artifact, first.id, true);
  assert.equal(selected.suggestions[0].selected, true);
  assert.equal(artifact.suggestions[0].selected, false);
  assert.deepEqual(selected.edits, []);
  const deselected = setStoryboardRevisionSuggestionSelection(selected, first.id, false);
  assert.equal(deselected.suggestions[0].selected, false);
  assert.throws(() => setStoryboardRevisionSuggestionSelection(artifact, "unknown-suggestion"), /Unknown suggestion ID/);
});

test("revision review markdown distinguishes selections from explicit edits", () => {
  const artifact = createStoryboardRevision("example.json", JSON.stringify(revisionExample));
  const selected = setStoryboardRevisionSuggestionSelection(artifact, artifact.suggestions[0].id, true);
  const report = renderStoryboardRevisionReviewMarkdown(selected);
  assert.match(report, /Selected suggestions:\*\* 1 \/ /);
  assert.match(report, /SELECTED/);
  assert.match(report, /Selections are review decisions only/);
  assert.match(report, /No edits have been authored yet/);
});

test("applies explicit edits to a copy without mutating the embedded original", () => {
  const artifact = createStoryboardRevision("example.json", JSON.stringify(example));
  artifact.edits.push({ shotId: "opening-macro", changeNote: "Clarify reveal", fields: { visual: "A close-up reveals the metal edge." } });
  const revised = applyStoryboardRevisionEdits(artifact) as Record<string, any>;
  assert.equal(revised.shots[0].visual, "A close-up reveals the metal edge.");
  assert.equal((artifact.sourcePlan as Record<string, any>).shots[0].visual, example.shots[0].visual);
});

test("rejects edits referencing unknown shots", () => {
  const artifact = createStoryboardRevision("example.json", JSON.stringify(example));
  artifact.edits.push({ shotId: "missing-shot", changeNote: "No such shot", fields: { visual: "Test" } });
  assert.throws(() => applyStoryboardRevisionEdits(artifact), /unknown shot ID/);
});

test("revision validation reports schema errors and heuristic warnings separately", () => {
  const artifact = createStoryboardRevision("example.json", JSON.stringify(example));
  artifact.edits.push({ shotId: "opening-macro", changeNote: "Make visual vague", fields: { visual: "Show this concept" } });
  const result = validateStoryboardRevision(artifact);
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some((warning) => warning.includes("VAGUE_VISUAL_DESCRIPTION")));
  assert.deepEqual(result.errors, []);
});

test("revision prompt includes selected critiques and only the referenced shots", () => {
  const artifact = createStoryboardRevision("example.json", JSON.stringify(revisionExample));
  const selected = setStoryboardRevisionSuggestionSelection(artifact, artifact.suggestions[0].id, true);
  const prompt = renderStoryboardRevisionPromptMarkdown(selected);
  assert.match(prompt, /AI Storyboard Revision Brief/);
  assert.match(prompt, /Selected critique items/);
  assert.match(prompt, /Output schema/);
  assert.match(prompt, /opening-macro/);
  assert.match(prompt, /Return edits only for the listed shot IDs/);
  assert.throws(() => renderStoryboardRevisionPromptMarkdown(artifact), /Select at least one suggestion/);
});
 
test("imports AI edits only for selected suggestions and existing shots", () => {
  const artifact = createStoryboardRevision("example.json", JSON.stringify(revisionExample));
  const selected = setStoryboardRevisionSuggestionSelection(artifact, artifact.suggestions[0].id, true);
  const targetShotId = artifact.suggestions[0].item.shotIds[0];
  const imported = importStoryboardRevisionEdits(selected, { edits: [{ shotId: targetShotId, changeNote: "Make the reveal more specific", fields: { visual: "A concrete reveal in a defined environment." } }] });
  assert.equal(imported.edits.length, 1);
  assert.equal(imported.edits[0].shotId, targetShotId);
  assert.equal(imported.validation, null);
  assert.throws(() => importStoryboardRevisionEdits(selected, { edits: [{ shotId: "not-a-shot", changeNote: "x", fields: { visual: "y" } }] }), /unknown shot ID/);
  const sourceShots = (artifact.sourcePlan as { shots: Array<{ id: string }> }).shots;
  const unselectedShot = sourceShots.find((shot) => !artifact.suggestions[0].item.shotIds.includes(shot.id));
  if (unselectedShot) assert.throws(() => importStoryboardRevisionEdits(selected, { edits: [{ shotId: unselectedShot.id, changeNote: "x", fields: { visual: "y" } }] }), /not covered by a selected critique/);
  assert.throws(() => importStoryboardRevisionEdits(selected, { edits: [{ shotId: targetShotId, changeNote: "x", fields: { unsupported: "y" } }] }), /Unsupported revision field/);
  assert.throws(() => importStoryboardRevisionEdits(selected, { edits: [{ shotId: targetShotId, changeNote: "first", fields: { visual: "first" } }, { shotId: targetShotId, changeNote: "second", fields: { visual: "second" } }] }), /Duplicate imported edit/);
});
