import assert from "node:assert/strict";
import test from "node:test";
import { matchesCompositionMetadata, validateRenderRequest } from "../scripts/render-request.mjs";

const validProjectRequest = {
  provider: "github-actions",
  projectPath: "projects/demo/scene.json",
  compositionId: "ProjectVideo",
  outputName: "demo-video",
  requestId: "test-001",
};

test("accepts the existing ProjectVideo request format", () => {
  const result = validateRenderRequest(validProjectRequest);
  assert.deepEqual(result.errors, []);
  assert.equal(result.request?.compositionId, "ProjectVideo");
  assert.equal(result.request?.projectPath, "projects/demo/scene.json");
});

test("accepts custom compositions without a project JSON file", () => {
  const result = validateRenderRequest({
    provider: "github-actions",
    compositionId: "CinematicAdBenchmark",
    outputName: "cinematic-ad",
    requestId: "custom-001",
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.request?.projectPath, undefined);
});

test("allows a custom composition to receive JSON props from a project folder", () => {
  const result = validateRenderRequest({
    ...validProjectRequest,
    compositionId: "CinematicAdBenchmark",
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.request?.projectPath, "projects/demo/scene.json");
});

test("requires projectPath for ProjectVideo", () => {
  const result = validateRenderRequest({
    provider: "github-actions",
    compositionId: "ProjectVideo",
    outputName: "demo-video",
    requestId: "test-002",
  });
  assert.ok(result.errors.includes("ProjectVideo requires projectPath."));
});

test("rejects unsafe composition identifiers", () => {
  const result = validateRenderRequest({
    ...validProjectRequest,
    compositionId: "$(touch /tmp/pwned)",
  });
  assert.ok(result.errors.some((error) => error.startsWith("compositionId")));
});

test("rejects paths outside the projects directory and traversal", () => {
  for (const projectPath of ["../secret.json", "packages/video-engine/project.json", "projects/../secret.json"]) {
    const result = validateRenderRequest({ ...validProjectRequest, projectPath });
    assert.ok(result.errors.some((error) => error.startsWith("projectPath")), projectPath);
  }
});

test("rejects malformed provider, output and request identifiers", () => {
  const result = validateRenderRequest({
    ...validProjectRequest,
    provider: "unknown",
    outputName: "../output",
    requestId: "bad request id",
  });
  assert.equal(result.errors.length, 3);
});

test("accepts an optional narration request for ProjectVideo", () => {
  const result = validateRenderRequest({
    ...validProjectRequest,
    narrationPath: "projects/demo/production/narration.json",
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.request?.narrationPath, "projects/demo/production/narration.json");
});

test("rejects narration for unapproved custom compositions and unsafe config paths", () => {
  const customComposition = validateRenderRequest({
    ...validProjectRequest,
    compositionId: "CinematicAdBenchmark",
    narrationPath: "projects/demo/production/narration.json",
  });
  assert.ok(customComposition.errors.includes("narrationPath is currently supported only for ProjectVideo and NarratedSkyExplainer."));

  const unsafePath = validateRenderRequest({
    ...validProjectRequest,
    narrationPath: "projects/../private.json",
  });
  assert.ok(unsafePath.errors.some((error) => error.startsWith("narrationPath")));
});


test("accepts narrated requests for the custom NarratedSkyExplainer composition", () => {
  const result = validateRenderRequest({
    provider: "github-actions",
    projectPath: "projects/examples/narrated-explainer/composition.json",
    narrationPath: "projects/examples/narrated-explainer/production/narration.json",
    compositionId: "NarratedSkyExplainer",
    outputName: "narrated-sky-custom",
    requestId: "custom-narrated-001",
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.request?.compositionId, "NarratedSkyExplainer");
});

test("checks that a project metadata file matches the requested composition", () => {
  assert.equal(
    matchesCompositionMetadata(
      { composition: { id: "NarratedSkyExplainer" } },
      "NarratedSkyExplainer",
    ),
    true,
  );
  assert.equal(
    matchesCompositionMetadata(
      { composition: { id: "ProjectVideo" } },
      "NarratedSkyExplainer",
    ),
    false,
  );
  assert.equal(matchesCompositionMetadata({}, "NarratedSkyExplainer"), false);
});

test("accepts an explicit production plan path for custom compositions", () => {
  const result = validateRenderRequest({
    provider: "github-actions",
    compositionId: "CinematicAdBenchmark",
    productionPlanPath: "projects/custom-film/production/production-plan.json",
    outputName: "custom-film",
    requestId: "custom-plan-001",
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.request?.productionPlanPath, "projects/custom-film/production/production-plan.json");
});

test("rejects unsafe or mismatched production plan paths", () => {
  for (const productionPlanPath of [
    "../production-plan.json",
    "projects/custom-film/production/other.json",
    "projects/custom-film/production/production-plan.json/../../secret.json",
    42,
  ]) {
    const result = validateRenderRequest({
      provider: "github-actions",
      compositionId: "CinematicAdBenchmark",
      productionPlanPath,
      outputName: "custom-film",
      requestId: "custom-plan-002",
    });
    assert.ok(result.errors.some((error) => error.startsWith("productionPlanPath")), productionPlanPath);
  }

  const mismatchedProject = validateRenderRequest({
    ...validProjectRequest,
    compositionId: "CinematicAdBenchmark",
    productionPlanPath: "projects/another-project/production/production-plan.json",
  });
  assert.ok(mismatchedProject.errors.includes("productionPlanPath must belong to the same project directory as projectPath."));
});


test("accepts a visual review history file inside the selected project", () => {
  const result = validateRenderRequest({
    ...validProjectRequest,
    visualReviewHistoryPath: "projects/demo/production/visual-review.json",
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.request?.visualReviewHistoryPath, "projects/demo/production/visual-review.json");
});

test("rejects visual review history paths outside or mismatched with the selected project", () => {
  for (const visualReviewHistoryPath of [
    "../visual-review.json",
    "projects/demo/production/other.json",
    "projects/other/production/visual-review.json",
  ]) {
    const result = validateRenderRequest({
      ...validProjectRequest,
      visualReviewHistoryPath,
    });
    assert.ok(result.errors.some((error) => error.startsWith("visualReviewHistoryPath")), visualReviewHistoryPath);
  }

  const withoutProject = validateRenderRequest({
    provider: "github-actions",
    compositionId: "CinematicAdBenchmark",
    outputName: "demo",
    requestId: "review-history-001",
    visualReviewHistoryPath: "projects/demo/production/visual-review.json",
  });
  assert.ok(withoutProject.errors.includes("visualReviewHistoryPath requires projectPath or productionPlanPath to identify its project."));
});


test("restricts visual review history to the GitHub Actions renderer", () => {
  const result = validateRenderRequest({
    ...validProjectRequest,
    provider: "circleci",
    visualReviewHistoryPath: "projects/demo/production/visual-review.json",
  });
  assert.ok(result.errors.includes("visualReviewHistoryPath is currently supported only by the GitHub Actions render workflow."));
});
