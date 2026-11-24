import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("demo scene is a 10-second 1080p composition at 30 FPS", async () => {
  const scene = JSON.parse(await readFile(new URL("../projects/demo/scene.json", import.meta.url), "utf8"));
  assert.equal(scene.schemaVersion, 1);
  assert.equal(scene.composition.width, 1920);
  assert.equal(scene.composition.height, 1080);
  assert.equal(scene.composition.fps, 30);
  assert.equal(scene.composition.durationInFrames, 300);
  assert.equal(scene.output.format, "mp4");
});

test("demo scene uses the registered Remotion composition ID", async () => {
  const scene = JSON.parse(await readFile(new URL("../projects/demo/scene.json", import.meta.url), "utf8"));
  assert.equal(scene.composition.id, "DemoVideo");
});
