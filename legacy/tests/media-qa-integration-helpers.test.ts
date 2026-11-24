import test from "node:test";
import assert from "node:assert/strict";
import { shouldSkipMediaIntegration } from "./media-qa-integration-helpers";

test("media integration tests do not skip when tools are available", () => {
  assert.equal(shouldSkipMediaIntegration(true, false), false);
  assert.equal(shouldSkipMediaIntegration(true, true), false);
});

test("media integration tests skip locally when tools are missing and not required", () => {
  assert.equal(shouldSkipMediaIntegration(false, false), true);
});

test("media integration tests remain enabled when CI requires tools", () => {
  assert.equal(shouldSkipMediaIntegration(false, true), false);
});
