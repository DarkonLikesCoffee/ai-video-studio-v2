import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createStoryboardBeatReport, renderStoryboardBeatReportMarkdown } from "../scripts/storyboard-beats";

const plan = {
  title: "Narrative test",
  shots: [
    { id: "opening", startSeconds: 0, durationSeconds: 3, narrativeBeat: "hook" },
    { id: "middle", startSeconds: 3, durationSeconds: 4, narrativeBeat: "development" },
    { id: "ending", startSeconds: 7, durationSeconds: 2, narrativeBeat: "payoff" },
  ],
};

test("storyboard beat report groups explicit labels and sums durations", () => {
  const report = createStoryboardBeatReport(plan);
  assert.equal(report.shotCount, 3);
  assert.equal(report.taggedShotCount, 3);
  assert.deepEqual(report.untaggedShotIds, []);
  assert.deepEqual(report.beats.map((beat) => beat.beat), ["hook", "development", "payoff"]);
  assert.equal(report.beats.find((beat) => beat.beat === "development")?.durationSeconds, 4);
  assert.deepEqual(report.warnings, []);
});

test("beat report warns about incomplete labels without guessing narrative roles", () => {
  const report = createStoryboardBeatReport({ title: "Partial", shots: [{ id: "a", narrativeBeat: "hook" }, { id: "b" }, { id: "c" }] });
  assert.equal(report.taggedShotCount, 1);
  assert.deepEqual(report.untaggedShotIds, ["b", "c"]);
  assert.ok(report.warnings.some((warning) => warning.includes("coverage is incomplete")));
  assert.ok(!report.warnings.some((warning) => warning.includes("No development")));
});

test("beat report prompts review for missing development and payoff in sufficiently tagged sequences", () => {
  const report = createStoryboardBeatReport({ shots: [{ id: "a", startSeconds: 0, narrativeBeat: "pause" }, { id: "b", startSeconds: 1, narrativeBeat: "context" }, { id: "c", startSeconds: 2, narrativeBeat: "transition" }] });
  assert.ok(report.warnings.some((warning) => warning.includes("Opening beat")));
  assert.ok(report.warnings.some((warning) => warning.includes("No development")));
  assert.ok(report.warnings.some((warning) => warning.includes("No payoff")));
});

test("markdown report is transparent about heuristics and limitations", () => {
  const markdown = renderStoryboardBeatReportMarkdown(createStoryboardBeatReport(plan));
  assert.match(markdown, /Narrative Beat Review/);
  assert.match(markdown, /No narrative-beat review prompts were generated/);
  assert.match(markdown, /does not infer story meaning/);
});

test("example production plan demonstrates a hook-development-reveal-payoff arc", async () => {
  const example = JSON.parse(await readFile(new URL("../projects/examples/production-plan.json", import.meta.url), "utf8"));
  const report = createStoryboardBeatReport(example);
  assert.equal(report.taggedShotCount, report.shotCount);
  assert.deepEqual(report.beats.map((beat) => beat.beat), ["hook", "development", "reveal", "payoff"]);
  assert.deepEqual(report.warnings, []);
});
