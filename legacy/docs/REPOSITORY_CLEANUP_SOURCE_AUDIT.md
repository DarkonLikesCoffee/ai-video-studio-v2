# Source-code cleanup audit — 2026-11-22

## Scope

A source-level follow-up after PR #125, focused on concrete duplication with existing behavior and tests. This change is intentionally limited to the shared retry-delay calculation used by the Wikimedia Commons and NASA video asset downloaders.

## Repository inventory

The first complete recursive inventory used during source review was captured at main commit `f2a2b7328ac357c3d77e48b2ecde6f2213e9a064` before PR #125 was merged; it reported 186 tracked files (the API response was not truncated). The source review itself was performed on the cleanup branch based on post-PR #125 main. After PR #126 merged, the complete recursive tree at main commit `21783b093029cb6c9ae688db4be33c415563f458` contains 190 tracked files (not truncated).

## Finding: duplicated HTTP retry-delay algorithm

Both `scripts/commons-video-assets.mjs` and `scripts/nasa-video-assets.mjs` independently parsed numeric and HTTP-date `Retry-After` values, clamped retry delays, and computed exponential backoff.

Their policies are not identical and remain distinct:
- Wikimedia Commons: minimum Retry-After 1 second, maximum 120 seconds, exponential base 2 seconds, backoff cap 30 seconds.
- NASA: minimum Retry-After 1 second, maximum 60 seconds, exponential base 1 second, backoff cap 15 seconds.

## Change

- Added `scripts/retry-delay.mjs` with one pure shared calculation.
- Kept `getHttpRetryDelayMs` and `getNasaRetryDelayMs` as provider-specific wrappers, preserving their existing exports and settings.
- Left the HTTP request loops, timeout policies, retry counts, cancellation behavior, headers, URL validation and download logic unchanged.
- Added direct unit tests for Retry-After seconds, HTTP-date parsing, provider-specific clamps, exponential backoff and invalid-header fallback.
- Existing tests for both downloader exports remain in place.

## Explicitly not changed

- No dependencies, npm scripts, render workflows, production compositions or source assets were changed.
- No supposedly unused modules were removed. The candidate utility files inspected (`animation.ts`, `footage.ts`, `narration.ts`, `narration-timeline.ts`, `svg-path.ts` and `transitions.ts`) are referenced by production code/tests. `EiffelTower.tsx` is imported by `EiffelScene.tsx`; it is not orphaned.
- At the time of this source review no lockfile was present. A later dedicated follow-up generated and committed the root npm workspace lockfile; dependency removal remains deferred until a complete usage audit is performed.

## Verification

- Existing Commons and NASA retry tests exercise their public wrapper functions.
- New tests exercise the common helper and verify both provider policies.
- GitHub Actions CI must pass on this PR before merge. This connector-only session does not run a local install, test suite or build.



- Moved `@types/three` from `dependencies` to `devDependencies` in `packages/video-engine/package.json`.
- The package provides TypeScript declarations only; the runtime package `three` remains in `dependencies`.
- The other `@types/*` packages in the workspace were already classified as development dependencies.
- This changes dependency classification only; no package version was changed and no rendering/runtime dependency was removed.
- CI will verify workspace installation, type checking, tests and build on the PR.


## Package metadata follow-up — PR #128 merged

- Merged PR #128 as `6ea141c189d6406bb9648cd0dd45652c4ec5d702`.
- Moved the type-only `@types/three` package from `dependencies` to `devDependencies` in `packages/video-engine/package.json`. The `three` runtime package and all version pins are unchanged.
- PR CI #45019205207 and post-merge main CI #45019314801 passed.
- The root npm-generated lockfile was added in PR #131 and verified by a clean `npm ci`; dependency removal/version upgrades remain deferred until a separate usage audit is complete.


## Reproducible npm installs — PR #131 merged

- Generated the root `package-lock.json` with the repository's existing Node 22 CI install environment; npm lockfile version 3, 403 package/workspace entries, 194,120 bytes.
- The lockfile was exported from the completed CI runner and committed unchanged; it was not manually assembled.
- Changed GitHub Actions CI, GitHub Actions rendering and CircleCI rendering to use `npm ci`; included the lockfile in the CI npm-cache key.
- Changed the README clean-install command to `npm ci`; added dependency update/lockfile rules to `AGENTS.md` and `docs/DEPENDENCY_MANAGEMENT.md`.
- Merged PR #131 as `d4a2182cb2dc9a34f525ec203af9a24a07740a62`. PR CI #45021066792 and post-merge main CI #45021169591 passed using the committed lockfile and `npm ci`, including full tests, type-check, project validations and Studio build.
- No dependency declarations, package versions or source dependencies were changed.
