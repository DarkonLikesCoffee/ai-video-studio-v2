import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const player = await readFile(new URL("../tools/visual-review-player.html", import.meta.url), "utf8");

test("player hashes the selected MP4 and records normal-speed playback evidence", () => {
  assert.ok(player.includes('crypto.subtle.digest("SHA-256", bytes)'));
  assert.ok(player.includes('kind: "visual-review-playback-session"'));
  assert.ok(player.includes("playedRangesSeconds: ranges()"));
  assert.ok(player.includes("endedEventObserved: true"));
  assert.ok(player.includes("playbackRate: video.playbackRate"));
});

test("player invalidates evidence on seeking, hidden page and lost window focus", () => {
  assert.ok(player.includes('video.addEventListener("seeking"'));
  assert.ok(player.includes('document.addEventListener("visibilitychange"'));
  assert.ok(player.includes('window.addEventListener("blur"'));
  assert.ok(player.includes("reviewWindowFocusedThroughout: !windowBlurObserved"));
});

test("player requires start, quarter, half, three-quarter and end checkpoints and coverage", () => {
  assert.ok(player.includes("hasCompleteCoverage(ranges(), video.duration)"));
  assert.ok(player.includes("checkpointTimes.length >= 5"));
  assert.ok(player.includes("checkpointTimes"));
});

test("player requires metadata before enabling playback and does not enable native seeking controls", () => {
  assert.ok(player.includes("metadataLoaded"));
  assert.ok(player.includes('<video id="player" playsinline preload="metadata"></video>'));
});
