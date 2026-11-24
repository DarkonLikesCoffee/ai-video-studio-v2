import assert from "node:assert/strict";
import test from "node:test";
import { buildNarrationSubtitles } from "../packages/video-engine/src/narration";
import { validateProjectDefinition } from "../packages/video-engine/src/project";

const project = (subtitles: unknown[]) => ({
  schemaVersion: 1,
  id: "narration-test",
  title: "Narration validation",
  composition: { id: "ProjectVideo", width: 1920, height: 1080, fps: 30 },
  scenes: [{ id: "scene-1", type: "content", durationInFrames: 90, title: "Test" }],
  subtitles,
  output: { format: "mp4", codec: "h264" },
});

test("accepts word-timed subtitle cues in the project schema", () => {
  const subtitles = buildNarrationSubtitles([
    { text: "Hola", startSeconds: 0.1, endSeconds: 0.3 },
    { text: "mundo.", startSeconds: 0.32, endSeconds: 0.58 },
  ], 30, 90);
  assert.deepEqual(validateProjectDefinition(project(subtitles)), []);
});

test("rejects overlapping and out-of-range word timings", () => {
  const overlapping = {
    id: "cue-1",
    startInFrames: 0,
    durationInFrames: 30,
    text: "Hola mundo",
    wordTimings: [
      { text: "Hola", startInFrames: 0, endInFrames: 12 },
      { text: "mundo", startInFrames: 10, endInFrames: 20 },
    ],
  };
  const outside = {
    id: "cue-2",
    startInFrames: 0,
    durationInFrames: 30,
    text: "Fuera",
    wordTimings: [{ text: "Fuera", startInFrames: 0, endInFrames: 31 }],
  };
  assert.ok(validateProjectDefinition(project([overlapping])).some((error) => error.includes("must not overlap")));
  assert.ok(validateProjectDefinition(project([outside])).some((error) => error.includes("within the subtitle cue")));
});
