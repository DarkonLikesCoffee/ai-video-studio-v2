import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildAssetEvidenceReport } from "../scripts/director-asset-evidence";

test("VALORANT production plan and manifest provide strict criterion-to-asset evidence", async () => {
  const projectPath = path.resolve("projects/valorant-immortal-decision-making");
  const plan = JSON.parse(await readFile(path.join(projectPath, "production/production-plan.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(projectPath, "production/asset-manifest.json"), "utf8"));
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "valorant-asset-evidence-"));

  try {
    // The report checks metadata and file presence, not media decoding. Stage
    // placeholder files so this test remains deterministic and does not need clips.
    for (const asset of manifest.assets) {
      const relativePath = typeof asset.path === "string" ? asset.path : `assets/${asset.file}`;
      const filePath = path.join(fixtureRoot, relativePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, "asset-evidence fixture", "utf8");
    }

    const report = await buildAssetEvidenceReport(plan, manifest, { projectRoot: fixtureRoot });
    assert.equal(report.summary.status, "ready");
    assert.equal(report.summary.unknownManifestShotIds, 0);
    assert.equal(report.summary.unresolvedPlannedAssetRefs, 0);
    assert.equal(report.summary.missingFiles, 0);
    assert.equal(report.summary.missingProvenance, 0);
    assert.equal(report.summary.missingRights, 0);
    assert.equal(report.summary.linkedCriteria, report.summary.criterionCount);
    assert.ok(report.shots.every((shot) => shot.manifestAssets.length > 0));
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
