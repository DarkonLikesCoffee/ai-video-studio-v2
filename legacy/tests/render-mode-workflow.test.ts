import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const githubWorkflow = await readFile(new URL("../.github/workflows/render.yml", import.meta.url), "utf8");
const circleCiWorkflow = await readFile(new URL("../.circleci/config.yml", import.meta.url), "utf8");
const strategyScript = await readFile(new URL("../scripts/validate-render-strategy.mjs", import.meta.url), "utf8");

test("GitHub Actions resolves the catalogue mode and routes 2D separately from WebGL", () => {
  assert.ok(githubWorkflow.includes("id: strategy"));
  assert.ok(githubWorkflow.includes("RENDER_MODE: ${{ steps.strategy.outputs.render_mode }}"));
  assert.ok(githubWorkflow.includes('elif [[ "$RENDER_MODE" == "2d" ]]; then'));
  assert.ok(githubWorkflow.includes('"--gl=swangle"'));
});

test("CircleCI runs the same composition preflight and consumes its resolved render mode", () => {
  assert.ok(circleCiWorkflow.includes("node scripts/validate-render-strategy.mjs /tmp/circleci-render-request.json"));
  assert.ok(strategyScript.includes('process.env.CIRCLECI === "true" && process.env.BASH_ENV'));
  assert.ok(circleCiWorkflow.includes('if [[ "$RENDER_MODE" == "2d" ]]; then'));
  assert.ok(circleCiWorkflow.includes('"--gl=swangle"'));
});

test("both render commands use the explicit 2D branch instead of composition-name exceptions", () => {
  const renderStart = githubWorkflow.indexOf("      - name: Render MP4 with GitHub Actions");
  const renderEnd = githubWorkflow.indexOf("\n      - name: Master final ProjectVideo audio", renderStart);
  const githubRenderStep = githubWorkflow.slice(renderStart, renderEnd);
  const circleRenderStart = circleCiWorkflow.indexOf("          name: Render MP4");
  const circleRenderEnd = circleCiWorkflow.indexOf("\n      - run:\n          name: Master final audio", circleRenderStart);
  const circleRenderStep = circleCiWorkflow.slice(circleRenderStart, circleRenderEnd);

  assert.ok(githubRenderStep.includes('elif [[ "$RENDER_MODE" == "2d" ]]'));
  assert.ok(circleRenderStep.includes('elif [[ "$RENDER_MODE" == "2d" ]]'));
  assert.ok(!githubRenderStep.includes("LighthouseRepairFilm"));
  assert.ok(!githubRenderStep.includes("MadridTrip"));
  assert.ok(!circleRenderStep.includes("LighthouseRepairFilm"));
  assert.ok(!circleRenderStep.includes("MadridTrip"));
});
