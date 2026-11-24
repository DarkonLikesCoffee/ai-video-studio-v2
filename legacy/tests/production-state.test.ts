import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PRODUCTION_STAGES, validateProductionEvidenceFiles, validateProductionState } from "../scripts/production-state";

const valid = {
  schemaVersion: 1,
  projectId: "lighthouse-repair",
  stage: "assets",
  updatedAt: "2026-11-23T10:00:00.000Z",
  evidence: {
    brief: ["production/creative-brief.md"],
    direction: ["production/creative-direction.md"],
    storyboard: ["production/production-plan.json"],
    assets: ["production/asset-manifest.json"],
  },
};

test("valid production state accepts ordered stages and artifact evidence", () => {
  assert.deepEqual(validateProductionState(valid, { requireEvidence: true }), []);
});

test("production stages are an explicit ordered workflow", () => {
  assert.deepEqual(PRODUCTION_STAGES, [
    "brief", "direction", "storyboard", "assets", "build",
    "render-ready", "frozen", "rendered", "qa", "accepted", "delivered",
  ]);
});

test("production state rejects unknown stages", () => {
  const invalid = { ...valid, stage: "almost-done" };
  assert.ok(validateProductionState(invalid).some((error) => error.includes("stage must be one of")));
});

test("production state rejects malformed or missing evidence", () => {
  const invalid = { ...valid, evidence: { brief: [" "], assets: [] } };
  const errors = validateProductionState(invalid, { requireEvidence: true });
  assert.ok(errors.some((error) => error.includes("evidence.brief")));
  assert.ok(errors.some((error) => error.includes('evidence for completed stage "direction"')));
});

test("production state can be tied to the project it belongs to", () => {
  assert.ok(validateProductionState(valid, { expectedProjectId: "another-project" })
    .some((error) => error.includes("does not match expected project")));
});

test("production state rejects invalid timestamps and unknown evidence keys", () => {
  const invalid = { ...valid, updatedAt: "yesterday", evidence: { ...valid.evidence, mystery: ["file"] } };
  const errors = validateProductionState(invalid);
  assert.ok(errors.some((error) => error.includes("updatedAt")));
  assert.ok(errors.some((error) => error.includes('unknown stage "mystery"')));
});


test("strict production-state validation resolves existing evidence files inside the project", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "production-state-evidence-"));
  const projectRoot = path.join(root, "projects", "lighthouse-repair");
  await mkdir(path.join(projectRoot, "production"), { recursive: true });
  await mkdir(path.join(root, "projects", "outside"), { recursive: true });
  await writeFile(path.join(projectRoot, "production", "creative-brief.md"), "# Brief");
  await writeFile(path.join(projectRoot, "production", "creative-direction.md"), "# Direction");
  await writeFile(path.join(projectRoot, "production", "production-plan.json"), "{}");
  await writeFile(path.join(projectRoot, "production", "asset-manifest.json"), "{}");
  try {
    const state = {
      ...valid,
      evidence: {
        brief: ["production/creative-brief.md"],
        direction: ["production/creative-direction.md"],
        storyboard: ["production/production-plan.json"],
        assets: ["production/asset-manifest.json"]
      }
    };
    assert.deepEqual(await validateProductionEvidenceFiles(state, {
      repositoryRoot: root,
      projectRoot,
      expectedProjectId: "lighthouse-repair",
      requireEvidence: true
    }), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("strict production-state validation rejects missing evidence files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "production-state-missing-"));
  const projectRoot = path.join(root, "projects", "lighthouse-repair");
  await mkdir(path.join(projectRoot, "production"), { recursive: true });
  await writeFile(path.join(projectRoot, "production", "creative-brief.md"), "# Brief");
  try {
    const state = {
      ...valid,
      evidence: {
        brief: ["production/creative-brief.md"],
        direction: ["production/missing-direction.md"],
        storyboard: ["production/production-plan.json"],
        assets: ["production/asset-manifest.json"]
      }
    };
    const errors = await validateProductionEvidenceFiles(state, {
      repositoryRoot: root,
      projectRoot,
      requireEvidence: true
    });
    assert.ok(errors.some(error => error.includes("missing-direction.md")));
    assert.ok(errors.some(error => error.includes("production-plan.json")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("strict production-state validation rejects traversal and absolute evidence paths", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "production-state-traversal-"));
  const projectRoot = path.join(root, "projects", "lighthouse-repair");
  await mkdir(path.join(projectRoot, "production"), { recursive: true });
  await writeFile(path.join(projectRoot, "production", "creative-brief.md"), "# Brief");
  await writeFile(path.join(projectRoot, "production", "creative-direction.md"), "# Direction");
  await writeFile(path.join(projectRoot, "production", "production-plan.json"), "{}");
  await writeFile(path.join(projectRoot, "production", "asset-manifest.json"), "{}");
  await writeFile(path.join(root, "outside.txt"), "outside");
  try {
    const state = {
      ...valid,
      evidence: {
        brief: ["../outside.txt"],
        direction: ["/tmp/outside.txt"],
        storyboard: ["production/production-plan.json"],
        assets: ["production/asset-manifest.json"]
      }
    };
    const errors = await validateProductionEvidenceFiles(state, {
      repositoryRoot: root,
      projectRoot,
      requireEvidence: true
    });
    assert.ok(errors.some(error => error.includes("..")));
    assert.ok(errors.some(error => error.includes("/tmp/outside.txt")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("strict production-state validation rejects symlinks and project roots outside repository", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "production-state-symlink-"));
  const projectRoot = path.join(root, "projects", "lighthouse-repair");
  const outsideRoot = path.join(root, "outside");
  await mkdir(path.join(projectRoot, "production"), { recursive: true });
  await mkdir(outsideRoot, { recursive: true });
  await writeFile(path.join(outsideRoot, "brief.md"), "# Outside");
  await writeFile(path.join(projectRoot, "production", "creative-direction.md"), "# Direction");
  await writeFile(path.join(projectRoot, "production", "production-plan.json"), "{}");
  await writeFile(path.join(projectRoot, "production", "asset-manifest.json"), "{}");
  await symlink(path.join(outsideRoot, "brief.md"), path.join(projectRoot, "production", "brief-link.md"));
  try {
    const state = {
      ...valid,
      evidence: {
        brief: ["production/brief-link.md"],
        direction: ["production/creative-direction.md"],
        storyboard: ["production/production-plan.json"],
        assets: ["production/asset-manifest.json"]
      }
    };
    const errors = await validateProductionEvidenceFiles(state, {
      repositoryRoot: root,
      projectRoot,
      requireEvidence: true
    });
    assert.ok(errors.some(error => error.includes("symbolic links")));
    const outsideProjectErrors = await validateProductionEvidenceFiles(state, {
      repositoryRoot: projectRoot,
      projectRoot: outsideRoot,
      requireEvidence: true
    });
    assert.ok(outsideProjectErrors.some(error => error.includes("contained within repositoryRoot")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("legacy production-state validation remains reference-presence-only unless strict file checking is requested", () => {
  assert.deepEqual(validateProductionState(valid, { requireEvidence: true }), []);
});
