# Repository cleanup audit — 2026-11-22

## Scope

Non-destructive maintenance of the repository after rapid feature development. The cleanup prioritizes correct documentation and navigation while preserving active work, render inputs, benchmark projects and historical records.

## Inventory

- Main snapshot: 12d037f9d0382c302d069e9aa9104a2a8d2b2c77.
- Tracked tree: 232 entries.
- Remote branches observed: 144 across two listing pages.
- Open pull requests: 7 (#122, #119, #118, #117, #114, #113 and #110).
- Largest tracked binary: projects/valorant-immortal-decision-making/assets/valorant-gameplay-selected.zip (10,530,125 bytes).
- No rendered MP4 or render-output/ artifact appeared in the tracked tree.

## Changes in this cleanup

- Added the documentation index (README.md) to establish a single purpose for each project document.
- Refreshed the current verified repository snapshot and open-PR list in PROJECT_STATE.md.
- Corrected stale roadmap status for merged PRs #96, #102, #105, #115 and #116, and updated the VALORANT benchmark evidence reference.
- Corrected README capability claims: the repository has a Kokoro ONNX narration adapter; it does not yet have arbitrary-recording transcription/forced alignment or a general hosted voice-provider system.
- Updated the composition inventory and removed an outdated composition name in the production workflow guide.
- Preserved the full historical progress log; this audit is appended rather than rewriting old entries.

## Items deliberately preserved

1. Active work: all open PR branches remain untouched.
2. VALORANT gameplay ZIP: the render workflow explicitly extracts this archive. Removing it would break the existing render path. Consider Git LFS or external artifact storage only as a separate migration with CI/render verification.
3. Render and CircleCI request JSON files: both are workflow triggers. They are not ordinary config files and must not be deleted or reformatted as cleanup.
4. Benchmark projects and source assets: the CI workflow validates multiple examples and the render workflow uses project-specific source files. Nothing was removed based on a filename-only guess.
5. Historical branches and log entries: no branch was deleted. Each candidate needs to be checked against its originating PR, merge base and any commits not contained in main before deletion.

## Deferred work

- Review historical branches individually and delete only branches whose changes are fully integrated and which are not used by an open PR or an active workflow.
- Migrate the VALORANT archive out of the Git tree only after the render workflow has a reliable replacement and a fresh render proves it.
- Run a dependency-usage audit with install/build/test evidence before removing packages.
- Review source modules for dead code using imports, dynamic loading, workflow references and production composition registration before removing them.
- Avoid broad refactors during cleanup; separate them into focused PRs with regression tests.

## Verification boundary

This audit used the GitHub tree, workflow definitions, live open-PR list and current main/PR CI results. The cleanup branch changes documentation only; its PR CI must pass before merging. No code, package, render trigger, branch or production asset was deleted.