# Repository cleanup follow-up — 2026-11-22

## Scope

Second, evidence-based maintenance pass following the first documentation cleanup (PR #124). This pass deliberately makes no source-code, dependency, render-workflow, asset, or branch deletions.

## Verified live state

- Default branch: `main`.
- Current cleanup base at the start of this pass: the then-current `main` ref; this branch was created directly from `main`.
- Open PRs observed during audit: #122 ORBITAL BLOOM, #119 THE LAST SIGNAL, #118 sports car 3D, #117 render-gate documentation, #114 subtitle-overlap fix, #113 solar-system motion, and #110 Madrid render retry. These branches remain protected.
- Recent work also includes multiple active creative/render branches; branch age or naming alone is not grounds for removal.
- The earlier inventory of 144 branches is a dated observation, not asserted as today's complete branch count.

## Findings

### Package scripts

The root npm manifest defines 28 scripts. The audited command set is actively documented or referenced by implementation, README/agent workflows, tests, or CI/render pipelines. In particular:
- audio fixture generation is used by both CI and rendering;
- media QA, contact-sheet generation and render provenance are integrated into the render workflow;
- creative brief, storyboard, revision, asset evidence and production-plan commands are documented in README and/or the agent operating workflow;
- the project uses npm workspaces and Node 22, so a second package manager should not be introduced.

No script was removed based on absence from one search result. The search results and direct workflow references demonstrated that apparently specialized commands are still live.

### CI and rendering

- CI runs Python narration tests, TypeScript type-checking, Node tests, production-plan/project validation, audio fixture preparation, storyboard QA/previews and the Studio build.
- The render workflow includes frozen-candidate enforcement, request validation, composition strategy validation, optional narration, project validation, asset-rights evidence, rendering, mastering, media QA, contact sheets and provenance artifacts.
- The workflow is intentionally production-critical and should not be simplified without a complete dependency map and matching workflow tests.
- The VALORANT gameplay ZIP remains required by an explicit extraction step in the render workflow.
- `render-request.json` and `circleci-status-request.json` are workflow triggers, not disposable request files.

### Repository structure and documentation

- `docs/README.md` now provides the documentation navigation map.
- `PROJECT_STATE.md`, `ROADMAP.md` and `PROGRESS_LOG.md` each have distinct ownership; the dated history should not be rewritten as though old states were current.
- The new cleanup index and existing agent instructions reinforce those source-of-truth boundaries.

## Actions taken

- Created dedicated branch `chore/repository-cleanup-followup-2026-11-22` from `main`.
- Added this follow-up audit record.
- No dependencies, scripts, code, workflows, assets, render triggers, or remote branches were deleted or modified.

## Deferred candidates

1. The lockfile and clean-install foundation is now in place: PR #131 committed the npm-generated workspace lockfile and verified `npm ci` through CI/build. The remaining dependency-usage audit must compare each declared package against source imports, build tooling, scripts, tests and runtime workflows before proposing any removal.
2. Branch pruning needs complete enumeration across all pages plus per-branch merged-PR/ancestry checks and explicit protection for production experiments still awaiting creative review. This connector does not expose a branch-delete action.
3. Source dead-code analysis requires repository-wide symbol/import and dynamic-loading analysis; search snippets are not sufficient.
4. CI optimization should be a separate change with identical validation coverage and before/after runtime evidence.

## Verification boundary

This pass used live repository manifests, key operating documents, the production CI/render workflows, the current open-PR listing and targeted usage searches. The audit record is documentation-only. Repository CI is required on the PR; no local test/build or render was performed in this connector-only session.


## Reproducible dependency installation — completed 2026-11-22

- PR #131 added the root npm workspace lockfile and moved GitHub Actions CI, GitHub Actions renders and CircleCI renders to `npm ci`.
- The committed lockfile was validated by the full CI job and by post-merge main CI. Dependency pruning remains a separate evidence-based task.
