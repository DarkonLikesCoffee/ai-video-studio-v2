import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildStoryboardPreview, renderStoryboardPreviewHtml } from "../scripts/storyboard-preview";

const example = JSON.parse(
  await readFile(new URL("../projects/examples/production-plan.json", import.meta.url), "utf8")
) as Record<string, unknown>;

test("builds a planning preview from every authored shot", () => {
  const preview = buildStoryboardPreview(example);
  assert.equal(preview.kind, "storyboard-review");
  assert.equal(preview.notA, "rendered-video");
  assert.equal(preview.totalShots, 4);
  assert.equal(preview.shots[0]?.id, "opening-macro");
  assert.equal(preview.shots[1]?.visualMethod, "3D product animation");
  assert.match(preview.shots[1]?.visualProgression ?? "", /Start:/);
});

test("planning preview rejects a shot extending beyond the requested runtime", () => {
  const invalid = structuredClone(example);
  const shots = invalid.shots as Array<Record<string, unknown>>;
  shots[3]!.durationSeconds = 8;
  assert.throws(() => buildStoryboardPreview(invalid), /extends beyond/);
});

test("planning preview preserves intentional transition overlaps", () => {
  const plan = structuredClone(example);
  const shots = plan.shots as Array<Record<string, unknown>>;
  shots[1]!.startSeconds = 2;
  shots[1]!.durationSeconds = 7;
  const preview = buildStoryboardPreview(plan);
  assert.equal(preview.shots[1]?.startSeconds, 2);
  assert.equal(preview.shots[1]?.durationSeconds, 7);
});

test("HTML preview escapes authored text", () => {
  const preview = buildStoryboardPreview(example);
  preview.shots[0]!.visual = '<script>alert("x")</script>';
  const html = renderStoryboardPreviewHtml(preview);
  assert.ok(!html.includes("<script>alert"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.match(html, /Planning preview — not a rendered video/);
});

test("preview includes action, progression, method, timing and audio cues", () => {
  const html = renderStoryboardPreviewHtml(buildStoryboardPreview(example));
  for (const field of ["What happens", "Progression", "Visual method", "Audio", "00:00.00"]) {
    if (field === "Visual method") continue; // The method is a prominent shot badge rather than a detail row.
    assert.ok(html.includes(field));
  }
  assert.ok(html.includes("3D product animation"));
  assert.ok(html.includes("HARD CUT") === false || html.includes("Cut"));
});
