import assert from "node:assert/strict";
import test from "node:test";
import { validateRenderCandidate } from "../scripts/render-candidate.mjs";

const candidateSha = "a".repeat(40);
const headSha = "b".repeat(40);
const previousCandidateSha = "c".repeat(40);
const request = {
  provider: "github-actions",
  compositionId: "ProjectVideo",
  outputName: "demo-video",
  requestId: "candidate-001",
  candidateSha,
};
const validInput = {
  request,
  beforeSha: candidateSha,
  headSha,
  changedFiles: ["render-request.json"],
  priorRequests: [],
  headCommittedAt: 100,
};

test("accepts one request-only commit tied to its exact frozen candidate SHA", () => {
  const result = validateRenderCandidate(validInput);
  assert.deepEqual(result.errors, []);
});

test("rejects a missing or malformed candidate SHA", () => {
  for (const value of [undefined, "abc", "g".repeat(40)]) {
    const result = validateRenderCandidate({
      ...validInput,
      request: { ...request, candidateSha: value },
    });
    assert.ok(result.errors.some((error) => error.startsWith("candidateSha")), String(value));
  }
});

test("rejects a candidate SHA that is not the pre-request remote tip", () => {
  const result = validateRenderCandidate({
    ...validInput,
    request: { ...request, candidateSha: previousCandidateSha },
  });
  assert.ok(result.errors.some((error) => error.includes("immediately before")));
});

test("rejects project or unrelated files in the render-triggering push", () => {
  for (const changedFiles of [
    ["render-request.json", "projects/demo/scene.json"],
    ["render-request.json", "README.md"],
    ["projects/demo/scene.json"],
  ]) {
    const result = validateRenderCandidate({ ...validInput, changedFiles });
    assert.ok(result.errors.some((error) => error.includes("must change render-request.json only")), changedFiles.join(","));
  }
});

test("rejects a candidate commit that has already been submitted", () => {
  const result = validateRenderCandidate({
    ...validInput,
    priorRequests: [{
      commitSha: previousCandidateSha,
      committedAt: 90,
      candidateSha,
      requestId: "older-id",
    }],
  });
  assert.ok(result.errors.some((error) => error.includes("already been submitted")));
});

test("rejects a reused request ID even for another candidate", () => {
  const result = validateRenderCandidate({
    ...validInput,
    priorRequests: [{
      commitSha: previousCandidateSha,
      committedAt: 90,
      candidateSha: previousCandidateSha,
      requestId: request.requestId,
    }],
  });
  assert.ok(result.errors.some((error) => error.includes("already been submitted")));
});

test("permits the earliest request and deterministically rejects later duplicates", () => {
  const laterDuplicate = {
    commitSha: previousCandidateSha,
    committedAt: 110,
    candidateSha,
    requestId: "later-id",
  };
  const first = validateRenderCandidate({ ...validInput, priorRequests: [laterDuplicate] });
  assert.deepEqual(first.errors, []);

  const second = validateRenderCandidate({
    ...validInput,
    headSha: previousCandidateSha,
    request: { ...request, requestId: "later-id" },
    beforeSha: candidateSha,
    changedFiles: ["render-request.json"],
    priorRequests: [{
      commitSha: headSha,
      committedAt: 100,
      candidateSha,
      requestId: request.requestId,
    }],
    headCommittedAt: 110,
  });
  assert.ok(second.errors.some((error) => error.includes("already been submitted")));
});

test("rejects initial branch pushes without a previous remote candidate", () => {
  const result = validateRenderCandidate({ ...validInput, beforeSha: "0".repeat(40) });
  assert.ok(result.errors.some((error) => error.includes("new branch")));
});
