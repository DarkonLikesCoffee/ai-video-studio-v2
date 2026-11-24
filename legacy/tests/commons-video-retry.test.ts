import test from "node:test";
import assert from "node:assert/strict";
import { fetchWithRetries, getHttpRetryDelayMs } from "../scripts/commons-video-assets.mjs";

test("uses Retry-After seconds and HTTP dates", () => {
  assert.equal(getHttpRetryDelayMs("3", 0, 0), 3000);
  assert.equal(getHttpRetryDelayMs("Thu, 01 Jan 1970 00:00:12 GMT", 0, 0), 12000);
});

test("uses bounded exponential backoff when Retry-After is absent", () => {
  assert.equal(getHttpRetryDelayMs(null, 0), 2000);
  assert.equal(getHttpRetryDelayMs(null, 2), 8000);
  assert.equal(getHttpRetryDelayMs(null, 9), 30000);
});

test("retries throttled media requests and returns the successful response", async () => {
  let requests = 0;
  const waits: number[] = [];
  const response = await fetchWithRetries(
    "https://upload.wikimedia.org/example.webm",
    {},
    async () => {
      requests += 1;
      return requests === 1
        ? new Response("rate limited", { status: 429, headers: { "retry-after": "2" } })
        : new Response("video", { status: 200 });
    },
    async (milliseconds) => { waits.push(milliseconds); },
  );
  assert.equal(response.status, 200);
  assert.equal(requests, 2);
  assert.deepEqual(waits, [2000]);
});

test("does not retry permanent HTTP failures", async () => {
  let requests = 0;
  const waits: number[] = [];
  const response = await fetchWithRetries(
    "https://upload.wikimedia.org/example.webm",
    {},
    async () => {
      requests += 1;
      return new Response("not found", { status: 404 });
    },
    async (milliseconds) => { waits.push(milliseconds); },
  );
  assert.equal(response.status, 404);
  assert.equal(requests, 1);
  assert.deepEqual(waits, []);
});

test("creates a fresh timeout signal for every retry attempt", async () => {
  const signals: AbortSignal[] = [];
  let requests = 0;
  const response = await fetchWithRetries(
    "https://upload.wikimedia.org/example.webm",
    {},
    async (_url, options) => {
      requests += 1;
      signals.push(options.signal as AbortSignal);
      return requests === 1
        ? new Response("rate limited", { status: 429, headers: { "retry-after": "1" } })
        : new Response("video", { status: 200 });
    },
    async () => {},
  );
  assert.equal(response.status, 200);
  assert.equal(signals.length, 2);
  assert.notEqual(signals[0], signals[1]);
  assert.equal(signals.every((signal) => signal instanceof AbortSignal), true);
});
