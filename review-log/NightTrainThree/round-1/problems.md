# Round 1 — initial Three.js composition

## Three worst aesthetic problems
1. **Camera/subject scale is not yet verified.** The side and low-angle shots must show the locomotive and coaches occupying at least roughly one quarter of frame width; verify against rendered samples.
2. **Mountain depth and train separation need visual validation.** The multi-layer mountain placements, atmospheric fog, and train lighting must read as distinct near/mid/far planes rather than one dark silhouette.
3. **Motion cadence needs a full contact-sheet check.** Confirm train displacement and camera travel across each one-second sample; any three consecutive nearly identical samples are unacceptable.

## Technical issues
- Not yet checked: run the TypeScript check and render before asserting any visual/technical status.
