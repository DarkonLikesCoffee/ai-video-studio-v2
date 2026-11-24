import assert from "node:assert/strict";
import testCase from "node:test";
import { retimeProjectToDuration } from "../packages/video-engine/src/narration-timeline";
import type { VideoProject } from "../packages/video-engine/src/project";

const fixture = (): VideoProject => ({
  schemaVersion: 1,
  id: "retime-test",
  title: "Retime test",
  composition: { id: "ProjectVideo", width: 1920, height: 1080, fps: 30 },
  scenes: [
    {
      id: "one", type: "title", durationInFrames: 300, title: "One",
      transitionIn: { type: "fade", durationInFrames: 30 },
      titleAnimation: { opacity: { keyframes: [{ frame: 0, value: 0 }, { frame: 120, value: 1 }] } },
      graphics: [{ id: "g", type: "ellipse", x: 1, y: 1, width: 10, height: 10, startInFrames: 30, durationInFrames: 240 }],
      particleSystems: [{ id: "p", count: 2, seed: 1, originX: 50, originY: 50, lifeInFrames: 120, colors: ["#FFFFFF"] }],
    },
    { id: "two", type: "outro", durationInFrames: 300, title: "Two" },
  ],
  subtitles: [{ id: "s", startInFrames: 300, durationInFrames: 60, text: "Hello", fadeInFrames: 6 }],
  audioTracks: [{ id: "music", role: "music", src: "assets/audio/music.wav", startInFrames: 0, durationInFrames: 600, fadeOutFrames: 60 }],
  output: { format: "mp4", codec: "h264" },
});

testCase("retimes scenes, animation, overlays and audio on one shared timeline", () => {
  const result = retimeProjectToDuration(fixture(), 300);
  assert.equal(result.scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0), 300);
  assert.equal(result.scenes[0]!.durationInFrames, 150);
  assert.equal(result.scenes[0]!.transitionIn?.durationInFrames, 15);
  assert.equal(result.scenes[0]!.titleAnimation?.opacity?.keyframes[1]?.frame, 60);
  assert.equal(result.scenes[0]!.graphics?.[0]?.startInFrames, 15);
  assert.equal(result.scenes[0]!.particleSystems?.[0]?.lifeInFrames, 60);
  assert.equal(result.subtitles?.[0]?.startInFrames, 150);
  assert.equal(result.audioTracks?.[0]?.durationInFrames, 300);
  assert.equal(result.audioTracks?.[0]?.fadeOutFrames, 30);
});

testCase("does not alter source-media trim or playback rate", () => {
  const project = fixture();
  project.scenes[0]!.media = {
    type: "video", src: "assets/clip.mp4", trimBefore: 90, playbackRate: 1.25,
    startInFrames: 30, durationInFrames: 240,
  };
  const result = retimeProjectToDuration(project, 300);
  assert.equal(result.scenes[0]!.media?.trimBefore, 90);
  assert.equal(result.scenes[0]!.media?.playbackRate, 1.25);
  assert.equal(result.scenes[0]!.media?.startInFrames, 15);
});

testCase("clamps rounded animation keyframes to the shortened scene boundary", () => {
  const project = fixture();
  project.scenes[1]!.durationInFrames = 300;
  project.scenes[1]!.graphics = [{
    id: "last-frame",
    type: "ellipse",
    x: 1, y: 1, width: 10, height: 10,
    animations: { rotation: { keyframes: [{ frame: 0, value: 0 }, { frame: 299, value: 360 }] } },
  }];
  const result = retimeProjectToDuration(project, 473);
  const finalScene = result.scenes[1]!;
  assert.ok(finalScene.graphics?.[0]?.animations?.rotation?.keyframes[1]?.frame! < finalScene.durationInFrames);
});
