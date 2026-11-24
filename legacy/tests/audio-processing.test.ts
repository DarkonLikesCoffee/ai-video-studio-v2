import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAudioInputArgs,
  buildMainAudioFilter,
  buildSidechainTailFilter,
} from "../scripts/audio-processing";

test("looped audio inputs are explicitly looped by FFmpeg", () => {
  assert.deepEqual(buildAudioInputArgs({ src: "score.wav", loop: true }), [
    "-stream_loop", "-1", "-i", "score.wav",
  ]);
  assert.deepEqual(buildAudioInputArgs({ src: "voice.wav", loop: false }), [
    "-i", "voice.wav",
  ]);
});

test("looped main music is bounded to its project timeline", () => {
  assert.equal(
    buildMainAudioFilter(60, true),
    "[0:a]aresample=48000,atrim=duration=60.00000,aformat=sample_fmts=fltp:channel_layouts=stereo[main0]",
  );
  assert.equal(
    buildMainAudioFilter(60, false),
    "[0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[main0]",
  );
});

test("short narration sidechain is padded to the end of the music track", () => {
  assert.deepEqual(buildSidechainTailFilter(60), [
    "apad=whole_dur=60.00000",
    "atrim=duration=60.00000",
  ]);
});

test("sidechain padding rejects invalid duration values", () => {
  assert.throws(() => buildSidechainTailFilter(0), /positive finite number/);
});
