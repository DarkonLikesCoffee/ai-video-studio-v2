import assert from "node:assert/strict";
import test from "node:test";
import { applyNarratedFootageToProject, buildNarratedFootageTimeline } from "../packages/video-engine/src/footage";
import type { VideoProject } from "../packages/video-engine/src/project";

const plan = {
  shots: [
    { id: "opening", startSeconds: 0, durationSeconds: 4 },
    { id: "middle", startSeconds: 4, durationSeconds: 3.5 },
    { id: "closing", startSeconds: 7.5, durationSeconds: 2.5 },
  ],
};

const project = (): VideoProject => ({
  schemaVersion: 1,
  id: "footage-test",
  title: "Footage test",
  composition: { id: "ProjectVideo", width: 1920, height: 1080, fps: 30 },
  scenes: [
    { id: "opening", type: "content", durationInFrames: 120, title: "Opening", media: { type: "image", src: "assets/old.svg", placement: "right" }, graphics: [] },
    { id: "middle", type: "content", durationInFrames: 105, title: "Middle", graphics: [] },
    { id: "closing", type: "outro", durationInFrames: 75, title: "Closing", graphics: [] },
  ],
  output: { format: "mp4", codec: "h264" },
});

test("maps reviewed local footage assets to exact storyboard frame ranges", () => {
  const manifest = {
    assets: [
      { file: "sunrise-12345678.mp4", license: "CC BY 4.0", shotIds: ["opening", "middle"], trimBeforeSecondsByShotId: { opening: 0, middle: 12.5 } },
      { file: "horizon-abcd1234.webm", license: "CC0", shotIds: ["closing"] },
    ],
  };
  assert.deepEqual(buildNarratedFootageTimeline(manifest, plan, 30), [
    { id: "footage-opening-0", shotId: "opening", src: "assets/sunrise-12345678.mp4", startInFrames: 0, durationInFrames: 120 },
    { id: "footage-middle-0", shotId: "middle", src: "assets/sunrise-12345678.mp4", startInFrames: 120, durationInFrames: 105, trimBefore: 375 },
    { id: "footage-closing-1", shotId: "closing", src: "assets/horizon-abcd1234.webm", startInFrames: 225, durationInFrames: 75 },
  ]);
});

test("accepts user-owned footage only with an explicit rights basis and note", () => {
  const manifest = {
    assets: [
      { file: "my-gameplay.mp4", rightsBasis: "user-owned", rightsNote: "Recorded by me in my own matches.", shotIds: ["opening"] },
      { file: "unknown-origin.mp4", rightsBasis: "user-owned", shotIds: ["middle"] },
      { file: "permission.mp4", rightsBasis: "permission-granted", rightsNote: "Written permission from the recording owner.", shotIds: ["closing"] },
    ],
  };
  const clips = buildNarratedFootageTimeline(manifest, plan, 30);
  assert.deepEqual(clips.map((clip) => clip.shotId), ["opening", "closing"]);
});

test("supports intentional consecutive clips in one shot and skips unknown shot IDs", () => {
  const manifest = {
    assets: [
      { file: "first.mp4", license: "Public domain", shotIds: ["opening", "not-in-plan"] },
      { file: "second.mp4", license: "CC BY 3.0", shotIds: ["opening", "middle"] },
    ],
  };
  const clips = buildNarratedFootageTimeline(manifest, plan, 24);
  assert.equal(clips.length, 3);
  assert.deepEqual(clips.map((clip) => [clip.src, clip.startInFrames, clip.durationInFrames]), [
    ["assets/first.mp4", 0, 48],
    ["assets/second.mp4", 48, 48],
    ["assets/second.mp4", 96, 84],
  ]);
});

test("does not emit unsafe paths or unsupported file extensions", () => {
  const manifest = {
    assets: [
      { file: "../secret.mp4", license: "CC0", shotIds: ["opening"] },
      { file: "still.jpg", license: "CC0", shotIds: ["middle"] },
      { file: "unlicensed.mp4", license: "CC BY-SA 4.0", shotIds: ["opening"] },
      { file: "safe.mov", license: "CC BY 2.0", shotIds: ["closing"] },
    ],
  };
  const clips = buildNarratedFootageTimeline(manifest, plan, 30);
  assert.deepEqual(clips.map((clip) => clip.src), ["assets/safe.mov"]);
});

test("rejects invalid frame rates and malformed inputs", () => {
  assert.throws(() => buildNarratedFootageTimeline({ assets: [] }, plan, 0), /fps/);
  assert.throws(() => buildNarratedFootageTimeline({}, plan, 30), /assets array/);
  assert.throws(() => buildNarratedFootageTimeline({ assets: [] }, {}, 30), /shots array/);
});

test("maps per-shot source trim offsets from the selected NASA clip", () => {
  const manifest = {
    assets: [{
      file: "Earth-Views.mp4",
      license: "Public domain",
      shotIds: ["opening", "middle"],
      trimBeforeSecondsByShotId: { opening: 12, middle: 48.5 },
    }],
  };
  const clips = buildNarratedFootageTimeline(manifest, plan, 30);
  assert.deepEqual(clips.map((clip) => clip.trimBefore ?? 0), [360, 1455]);
});

test("applies footage as a full-frame background while retaining scene overlays", () => {
  const input = project();
  const output = applyNarratedFootageToProject(input, {
    assets: [{
      file: "my-gameplay.mp4",
      rightsBasis: "user-owned",
      rightsNote: "Recorded by me in my own matches.",
      shotIds: ["opening", "closing"],
      trimBeforeSecondsByShotId: { opening: 2.5, closing: 18 },
    }],
  }, plan);
  assert.equal(output.scenes[0]?.media, undefined);
  assert.deepEqual(output.scenes[0]?.mediaLayers, [{
    id: "footage-opening-0",
    type: "video",
    src: "assets/my-gameplay.mp4",
    placement: "background",
    fit: "cover",
    opacity: 0.82,
    muted: true,
    zIndex: 0,
    startInFrames: 0,
    durationInFrames: 120,
    trimBefore: 75,
  }]);
  assert.equal(output.scenes[0]?.graphics?.length, 0);
  assert.equal(output.scenes[1]?.mediaLayers, undefined);
  assert.equal(output.scenes[2]?.mediaLayers?.[0]?.trimBefore, 540);
});


test("clamps retimed footage layer windows to the shortened scene", () => {
  const input = project();
  input.scenes[0]!.durationInFrames = 100;
  const output = applyNarratedFootageToProject(input, {
    assets: [
      { file: "ace-one.mp4", rightsBasis: "user-owned", rightsNote: "Recorded by me in my own matches.", shotIds: ["opening"] },
      { file: "ace-two.mp4", rightsBasis: "user-owned", rightsNote: "Recorded by me in my own matches.", shotIds: ["opening"] },
    ],
  }, plan);
  const layers = output.scenes[0]?.mediaLayers ?? [];
  assert.equal(layers.length, 2);
  assert.deepEqual(layers.map((layer) => [layer.startInFrames, layer.durationInFrames]), [[0, 50], [50, 50]]);
  for (const layer of layers) {
    assert.ok((layer.startInFrames ?? 0) + (layer.durationInFrames ?? 0) <= 100);
  }
});

test("applies multiple selected gameplay clips as sequential full-frame layers in one scene", () => {
  const input = project();
  const output = applyNarratedFootageToProject(input, {
    assets: [
      { file: "ace-one.mp4", rightsBasis: "user-owned", rightsNote: "Recorded by me in my own matches.", shotIds: ["opening"] },
      { file: "ace-two.mp4", rightsBasis: "user-owned", rightsNote: "Recorded by me in my own matches.", shotIds: ["opening"] },
    ],
  }, plan);
  assert.deepEqual(output.scenes[0]?.mediaLayers?.map((layer) => ({
    src: layer.src,
    startInFrames: layer.startInFrames,
    durationInFrames: layer.durationInFrames,
  })), [
    { src: "assets/ace-one.mp4", startInFrames: 0, durationInFrames: 60 },
    { src: "assets/ace-two.mp4", startInFrames: 60, durationInFrames: 60 },
  ]);
});
