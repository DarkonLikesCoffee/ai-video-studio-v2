import test from "node:test";
import assert from "node:assert/strict";
import { calculateRetryDelayMs } from "../scripts/retry-delay.mjs";

const commonsPolicy = {
  minRetryAfterMs: 1_000,
  maxRetryAfterMs: 120_000,
  baseDelayMs: 2_000,
  maxBackoffMs: 30_000,
};
const nasaPolicy = {
  minRetryAfterMs: 1_000,
  maxRetryAfterMs: 60_000,
  baseDelayMs: 1_000,
  maxBackoffMs: 15_000,
};

test("parses Retry-After values in seconds and HTTP-date form", () => {
  assert.equal(calculateRetryDelayMs("3", 0, commonsPolicy, 0), 3_000);
  assert.equal(calculateRetryDelayMs("Thu, 01 Jan 1970 00:00:12 GMT", 0, commonsPolicy, 0), 12_000);
});

test("clamps Retry-After values using the caller's provider policy", () => {
  assert.equal(calculateRetryDelayMs("0", 0, commonsPolicy, 0), 1_000);
  assert.equal(calculateRetryDelayMs("180", 0, commonsPolicy, 0), 120_000);
  assert.equal(calculateRetryDelayMs("90", 0, nasaPolicy, 0), 60_000);
});

test("uses provider-specific bounded exponential backoff", () => {
  assert.equal(calculateRetryDelayMs(null, 0, commonsPolicy), 2_000);
  assert.equal(calculateRetryDelayMs(null, 2, commonsPolicy), 8_000);
  assert.equal(calculateRetryDelayMs(null, 9, commonsPolicy), 30_000);
  assert.equal(calculateRetryDelayMs(null, 0, nasaPolicy), 1_000);
  assert.equal(calculateRetryDelayMs(null, 2, nasaPolicy), 4_000);
  assert.equal(calculateRetryDelayMs(null, 20, nasaPolicy), 15_000);
});

test("falls back to exponential backoff for unparseable Retry-After headers", () => {
  assert.equal(calculateRetryDelayMs("not-a-date", 1, commonsPolicy), 4_000);
});
