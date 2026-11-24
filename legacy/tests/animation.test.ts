import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAnimationTrack } from "../packages/video-engine/src/animation";
import type { AnimationTrack } from "../packages/video-engine/src/project";

test("linear keyframes interpolate between values", () => {
  const track: AnimationTrack = {
    keyframes: [
      { frame: 0, value: 0 },
      { frame: 20, value: 100 },
    ],
  };
  assert.equal(evaluateAnimationTrack(10, track, -1), 50);
});

test("keyframe easing is applied to the segment after its keyframe", () => {
  const track: AnimationTrack = {
    keyframes: [
      { frame: 0, value: 0, easing: "ease-in" },
      { frame: 20, value: 100 },
    ],
  };
  assert.equal(evaluateAnimationTrack(10, track, -1), 12.5);
});

test("custom cubic bezier and spring easings are accepted", () => {
  const bezier: AnimationTrack = {
    keyframes: [
      { frame: 0, value: 0, easing: { type: "bezier", x1: 0.4, y1: 0, x2: 0.2, y2: 1 } },
      { frame: 30, value: 100 },
    ],
  };
  const spring: AnimationTrack = {
    keyframes: [
      { frame: 0, value: 0, easing: { type: "spring", stiffness: 120, damping: 16 } },
      { frame: 30, value: 1 },
    ],
  };
  assert.ok(evaluateAnimationTrack(15, bezier, -1) > 0);
  assert.ok(evaluateAnimationTrack(15, spring, -1) > 0);
});

test("keyframe tracks clamp to their first and last values", () => {
  const track: AnimationTrack = {
    keyframes: [
      { frame: 5, value: 10 },
      { frame: 15, value: 30 },
    ],
  };
  assert.equal(evaluateAnimationTrack(0, track, -1), 10);
  assert.equal(evaluateAnimationTrack(30, track, -1), 30);
});

test("a single keyframe holds its value for the full element lifetime", () => {
  const track: AnimationTrack = { keyframes: [{ frame: 8, value: 0.4 }] };
  assert.equal(evaluateAnimationTrack(0, track, 1), 0.4);
  assert.equal(evaluateAnimationTrack(100, track, 1), 0.4);
});

test("missing animation tracks return their supplied base value", () => {
  assert.equal(evaluateAnimationTrack(12, undefined, 0.75), 0.75);
});
