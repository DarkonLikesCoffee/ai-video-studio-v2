import assert from "node:assert/strict";
import test from "node:test";
import { buildNarrationSubtitles } from "../packages/video-engine/src/narration";

test("groups aligned words into short phrase captions with word timing offsets", () => {
  const cues = buildNarrationSubtitles([
    { text: "Hola,", startSeconds: 0.1, endSeconds: 0.35 },
    { text: "esto", startSeconds: 0.38, endSeconds: 0.55 },
    { text: "es", startSeconds: 0.57, endSeconds: 0.68 },
    { text: "una", startSeconds: 0.7, endSeconds: 0.85 },
    { text: "prueba.", startSeconds: 0.88, endSeconds: 1.2 },
    { text: "Funciona", startSeconds: 1.65, endSeconds: 2.05 },
    { text: "palabra", startSeconds: 2.08, endSeconds: 2.35 },
    { text: "a", startSeconds: 2.38, endSeconds: 2.44 },
    { text: "palabra.", startSeconds: 2.46, endSeconds: 2.9 },
  ], 30, 180);

  assert.equal(cues.length, 2);
  assert.equal(cues[0]?.text, "Hola, esto es una prueba.");
  assert.equal(cues[0]?.startInFrames, 3);
  assert.equal(cues[0]?.wordTimings?.length, 5);
  assert.equal(cues[0]?.wordTimings?.[0]?.startInFrames, 0);
  assert.equal(cues[0]?.activeWordColor, "#F5C66B");
  assert.equal(cues[1]?.text, "Funciona palabra a palabra.");
  assert.equal(cues[1]?.startInFrames, 49);
});

test("splits captions at word-count and pause boundaries", () => {
  const cues = buildNarrationSubtitles([
    { text: "Uno", startSeconds: 0, endSeconds: 0.2 },
    { text: "dos", startSeconds: 0.22, endSeconds: 0.4 },
    { text: "tres", startSeconds: 0.42, endSeconds: 0.6 },
    { text: "cuatro", startSeconds: 0.62, endSeconds: 0.9 },
    { text: "cinco", startSeconds: 0.92, endSeconds: 1.1 },
    { text: "seis", startSeconds: 1.8, endSeconds: 2.1 },
  ], 30, 120, { maxWords: 3, maxPauseSeconds: 0.3 });

  assert.deepEqual(cues.map((cue) => cue.text), ["Uno dos tres", "cuatro cinco", "seis"]);
});

test("rejects invalid, overlapping or out-of-range word timings", () => {
  assert.throws(() => buildNarrationSubtitles([], 30, 120), /at least one word/);
  assert.throws(() => buildNarrationSubtitles([
    { text: "uno", startSeconds: 0.4, endSeconds: 0.8 },
    { text: "dos", startSeconds: 0.7, endSeconds: 1.0 },
  ], 30, 120), /overlaps/);
  assert.throws(() => buildNarrationSubtitles([
    { text: "fuera", startSeconds: 4, endSeconds: 5 },
  ], 30, 120), /beyond the project duration/);
});

test("rejects subtitle styling outside renderer limits", () => {
  assert.throws(() => buildNarrationSubtitles([
    { text: "uno", startSeconds: 0, endSeconds: 0.2 },
  ], 30, 120, { activeWordColor: "red" }), /six-digit hex color/);
});
