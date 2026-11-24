## 2026-11-21 — Explicit Director composition selection (PR #121; CI and representative render passed)

- Re-read the roadmap, state, operating instructions, production workflow, Creative Director and Remotion Producer skills. Confirmed autonomous AI Production Director is an explicitly planned but unfinished P1 milestone.
- Implemented a model-facing Remotion composition catalogue, required top-level plan `renderStrategy`, storyboard prompt wiring, schema/import/runtime validation, pre-render registration and plan/request matching, tests, and updated agent playbooks.
- Whole-video renderer/composition selection is distinct from per-shot visual methods. ChatGPT (or another external model) remains the creative decision-maker; no LLM is embedded in this repo.
- Migrated the checked-in plan examples: NarratedSkyExplainer, explicit legacy ProjectVideo selections for SORA and VALORANT, and a not-yet-built ProductRevealFilm for the generic 3D product sample.
- Fixed SORA's missing acceptanceCoverage by mapping all five criteria to relevant shot IDs with explicit rationales. The strict asset-evidence gate remains unchanged.
- PR #121 is the clean replacement PR: https://github.com/DarkonLikesCoffee/ai-video-studio/pull/121. Superseded PR #120 is closed.
- CI runs #44920371134 and #44920356458 passed on PR head `dd90fe01cb3857e39e009e3d0dfcff257e0f5008`: 254 tests passed, 0 failed, 0 skipped; typecheck, narration tests, plan/project/storyboard checks, audio preparation and Studio build all passed.
- Representative SORA render #44920489901 passed on that exact frozen candidate. The candidate-freeze gate, request validator and new Director composition gate all passed. Asset evidence: `ready`, 4 local assets, all 5 criteria linked, 0 issues.
- Retrieved and inspected MP4 artifact #14712604149, SHA-256 `56dd7610c19102f5cf132d8b19b0dcd7fccdcd0e1d8f6931489370db3895d772`. Output: H.264 1920×1080/30fps, 360 frames/12.0s; AAC stereo 48kHz, 12.1s container. QA passed: no silence, frozen or black intervals; 0.10s A/V duration drift, 0s start offset, -15.8 LUFS integrated loudness and -7.9 dBFS true peak.
- The one-second frame inspection shows four distinct SORA scene designs, but ProjectVideo's recurring eyebrow/title treatment and restrained in-scene movement remain. This is a technical path smoke test using the explicitly selected legacy ProjectVideo, not evidence of cinematic quality or an autonomous Director's creative judgment.
- Audio was measured by QA but not listened to. No creative-acceptance claim is made.
- Latest next step: merge PR #121 after verifying the two required checks remain green; continue the broader Director milestone with richer custom-composition selection and actual per-brief visual strategy.


## 2026-11-18 — User-provided gameplay footage integration merged (PR #58)

- Reviewed the post-merge narration-sync render #44394465979 and downloaded artifact #14469659407. QA: 47.733s video, 47.8s audio, 1920x1080, 30fps, H.264/AAC stereo, -16.1 LUFS, zero silence/freeze/black intervals. Contact sheet confirmed the technical result still reads as repeated vector-diagram compositions.
- Diagnosed a missing production integration: buildNarratedFootageTimeline existed and was used for NarratedSkyExplainer custom props, but the ProjectVideo narration path never added the resulting footage to scene media layers.
- PR #58 added owner-provided footage rights metadata (user-owned or permission-granted plus a meaningful rightsNote), injects matched local video as muted full-frame backgrounds behind the scene's vector overlays and captions, preserves custom-composition props compatibility, and adds separate user footage credits.
- Added tests for explicit rights metadata, shot-to-scene injection, trim offsets, overlay preservation and credits. Added projects/valorant-immortal-decision-making/production/USER_FOOTAGE.md and README documentation.
- First CI run #44396824372 failed only because the empty-credits test expected the old message. Updated the expectation; final PR CI #44397239973 passed, including typecheck and all tests.
- PR #58 merged by squash to main as baeabc412b2a52be48e69d41b6709936b265cc6c.
- No actual gameplay clips have been added yet and no footage render has been performed. The code path is now ready; creative validation requires real, authorized gameplay clips.
- Next: verify post-merge main CI, then select short clips from the user's own recordings or clips with explicit permission, map them to shot IDs, render and inspect.
- Current branch / commit: main / baeabc412b2a52be48e69d41b6709936b265cc6c.

## 2026-11-18 — Narration/video timeline synchronization fixed and merged

- User review identified that narration ended before the video. Measured v7 from workflow #44387937003: generated narration was 47.31s while the rendered video remained 60.0s, leaving approximately 12.7s of un-narrated visuals.
- Added packages/video-engine/src/narration-timeline.ts and integrated it into scripts/apply-narration.ts. The helper retimes scene durations, transitions, local animation keyframes, media/graphic/particle timing, existing subtitles, and non-voice audio events together to the narration duration plus a 0.4s visual landing. Source trim and playback-rate values remain unchanged.
- Added regression tests for shared timeline retiming and frame-boundary clamping. V8 render #44392886686 exposed a one-frame keyframe overflow in two outro graphics; fixed it by clamping local keyframes to their shortened scene/layer duration. V9 render succeeded.
- Latest PR CI #44393414920 passed. PR #57 merged by squash into main as 2bd52e9f0830600718fcb60fc5bd6f5cf6b4677.
- V9 branch render #44393399283 produced artifact #14469578336. Measured narration: 47.31s. Video: 47.733s (47.8s container duration), approximately 0.42s visual landing after speech. QA: 1920x1080, 30fps, H.264/AAC stereo, -16.2 LUFS, zero silence/freeze/black intervals. Contact sheet inspected.
- Main CI #44394465963 passed. Main render #44394465979 was running at the time of this log entry; inspect its artifact before closing this handoff.
- Creative limitation: the video is still built primarily from tactical vector diagrams and typography. Camera motion reduces freeze detections but does not create authentic gameplay footage. The result is technically synchronized but not yet accepted as a cinematic VALORANT explainer.
- Next: inspect post-merge main render; then prioritize verified licensed moving gameplay footage, semantic shot variety and audio/video sync diagnostics in media QA.
- Current branch / commit: main / 2bd52e9f0830600718fcb60fc5bd6f5cf6b4677.

## 2026-11-18 — v6 audio fix verified; cinematic camera motion in PR #57

- PR #56 merged into main as 338b55a2bf45e39e096ac722a740f73b9562a5f1 (fix(audio): preserve looped music through narration tail).
- Main CI run #44385444014 passed.
- Downloaded actual render artifact #14466045811 from v6 render #44383766685. QA confirms 60.1s, 1920x1080, 30fps, H.264/AAC stereo, integrated loudness -16.8 LUFS, zero silence intervals and zero black-frame intervals.
- Audio issue is considered fixed based on this full production render; v6 is not accepted as a finished video because nine freeze intervals remain and the visuals are still dominated by original vector diagrams rather than authentic VALORANT gameplay.
- Inspected source: scenes last 300 frames, but many media/graphic animation tracks clamp at frames 70–190. The composition then holds almost static for the rest of each scene. The existing outer decorative ring movement is too subtle and mostly outside the frame.
- Created PR #57: https://github.com/DarkonLikesCoffee/ai-video-studio/pull/57. Adds optional per-scene cameraMotion (zoom/pan), validation bounds, media/graphics/particle camera movement while keeping typography stationary, and alternating camera moves across the six VALORANT scenes. Added schema regression tests.
- CI run #44385753034 is running. Do not merge until green CI and a fresh v7 render confirms the camera movement is visible, reduces freeze warnings and does not crop important content.
- Next: inspect PR #57 CI; fix any type/test/render issues; render v7 and inspect the actual artifact. Then prioritize authentic licensed motion footage and shot-level visual diversity.

## 2026-11-18 — Sidechain fix strict-type correction

- PR #55's first CI run #44383361646 failed at TypeScript typecheck because `AudioTrack.loop` is optional and the helper requires a concrete boolean.
- Corrected the call site to pass `track.loop ?? false`; no tests were skipped or weakened.
- Superseded PR #55 with PR #56 on branch `fix/sidechain-music-tail-v2`, based on the corrected head.
- Next: verify CI for PR #56, run the branch's VALORANT render v6, and inspect the actual audio QA report before merge.

## 2026-11-18 — VALORANT v5 diagnosis and sidechain tail fix (PR #55 in progress)

- Render run #44381103388 completed successfully on main commit `8804c66264f2243378424836c3d74fddb24617ab`; artifact #14462663601 contains the MP4 and `.qa.json` (expires 2026-11-21).
- Downloaded and inspected the actual QA report: 60.1s, 1920x1080, 30fps, H.264/AAC stereo, integrated loudness -16.3 LUFS, no black-frame intervals.
- Confirmed three persistent digital-silence intervals: 46.840–50.063s, 51.256–56.033s, 57.353–60.100s. QA also reported nine frozen-video intervals, including 46.667–50.000s and 55.867–58.133s. The video is not accepted.
- Inspected the source pipeline: the VALORANT music track is a 20-second generated score marked `loop: true`, and is preprocessed with FFmpeg sidechain compression against a shorter generated narration track. The offline preprocessing did not explicitly loop the music input or pad the voice sidechain to the full track timeline. This is the leading root-cause hypothesis for the missing music tail; verify with the next actual render.
- Opened PR #55: [Fix looped music truncation in sidechain processing](https://github.com/DarkonLikesCoffee/ai-video-studio/pull/55). Added reusable FFmpeg input/filter helpers, explicit looping and timeline trimming for looped music, sidechain padding after timeline delay, and four regression tests.
- Reproduced a 20-second music + 46.84-second narration scenario with the proposed FFmpeg filter graph locally. Output was exactly 60.0 seconds and a -50 dB/0.75s silence scan found no silence intervals.
- CI/check-runs for PR #55 had not appeared at the time of this log update. Do not merge until CI/typecheck/tests pass and a fresh VALORANT render confirms the three late silence gaps are gone.
- Next action: get PR #55 CI green; rerender the actual VALORANT project; download and inspect the new MP4/QA report. Then tackle visual stagnation: nine freeze warnings and repeated SVG-only compositions; add real licensed motion footage or a more cinematic motion/shot grammar rather than merely changing text cards.

## 2026-11-18 — Media QA diagnostics merged; VALORANT verification render

- PR #54 merged into main by squash as `8e2049f7dd2a26a64b64431f6c4fb6fed3921a26`.
- CI run #44380704836 passed: Python narration tests, TypeScript typecheck, all Node tests including four media-QA cases, production-plan validation, FFmpeg audio fixture/project preparation, and studio build.
- Added `npm run qa:media -- <rendered.mp4>`, writing a timestamped JSON report with ffprobe metadata, silence intervals, EBU R128 loudness diagnostics, freeze intervals and black-frame intervals.
- Missing audio/video streams or invalid duration fail the command. Silence/freeze/black are warnings for human/creative review, not automatic failures (intentional pauses/cuts can be valid).
- Render workflow runs media diagnostics on the final mastered MP4 and includes the `.qa.json` report in the uploaded artifact.
- PR #51 was closed as obsolete, not merged; its alignment work was superseded by PR #52.
- The previous VALORANT video remains creatively unacceptable (slideshow-like) and had documented late audio gaps. The new diagnostic has not yet been run on a fresh real render; a v5 verification render is being triggered now.
- Next action: inspect its QA report for the three known late audio gaps, trace the root cause to timeline/audio track processing or narration alignment, fix and rerender. After audio repair, return to shot/visual-method variety and real licensed footage; do not call the project finished from technical QA alone.

## 2026-11-18 — First automated media-QA slice (PR #54 in progress)

- Re-read `START_HERE.md`, `AGENTS.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `PROGRESS_LOG.md`, README, production workflow and the relevant creative/audio/Remotion/visual-QA skills.
- Confirmed main CI #44379637013 passed and the latest main VALORANT render #44362064050 completed, but the video still has documented digital-silence gaps and did not meet the cinematic creative brief.
- Closed obsolete PR #51 without merging; its alignment repair was superseded by merged PR #52.
- Opened PR #54: [Add automated rendered-media quality diagnostics](https://github.com/DarkonLikesCoffee/ai-video-studio/pull/54).
- Added `scripts/media-qa.ts` and `scripts/qa-media.ts`: ffprobe metadata, FFmpeg silence detection, EBU R128 diagnostics, freeze detection and black-frame detection; JSON report; missing audio/video or invalid duration are hard failures, while silence/freeze/black are warnings for human review.
- Added four media-QA regression tests and a dedicated skill/README section. Render workflow now runs the diagnostics on each GitHub Actions MP4 and uploads the JSON sidecar.
- First CI run #44380458995 found strict TypeScript nullability in FPS parsing; fixed in `6676c5f`. Follow-up run #44380595061 was cancelled by a superseding push; run #44380631630 was queued at the time of this log update.
- No code has been merged into main from PR #54. No real MP4 has yet been run through the new diagnostics; local execution is unavailable in this GitHub-only session. Do not describe the CI tests as passing until the latest workflow completes.
- Next action: inspect run #44380631630, fix any further failures, then merge PR #54 only after green CI; trigger the VALORANT render request so the new report can inspect the actual artifact and use its timestamps to guide the source-level fix.

## 2026-11-18 — Continuity system created

- Added a universal entry point so a new AI or conversation can resume by reading `START_HERE.md`.
- Added cross-agent operating rules in `AGENTS.md`.
- Added verified project snapshot in `PROJECT_STATE.md` and prioritized roadmap in `ROADMAP.md`.
- This documentation change is being prepared on branch `docs/project-continuity`; update this entry with the PR/merge result after validation.
- Next development work should begin with P0 quality gates, especially diagnosing the VALORANT render's audio silence and creating reusable video/audio QA. Do not build another decorative slideshow showcase as a substitute for the core production workflow.

## 2026-11-18 — VALORANT explainer render and creative QA

- PR #50 added the VALORANT competitive decision-making explainer, original tactical vector assets, production plan, storyboard, narration and render request.
- The first render failed during Kokoro word/phoneme alignment. Several fixes were attempted; the successful repair landed in PR #52.
- PR #52 fixed context-sensitive phoneme alignment and added regression coverage. Branch render run #44360142074 succeeded; the resulting MP4 was retrieved.
- The rendered file was approximately 60.1 seconds, 1920×1080, 30 FPS, H.264 with AAC stereo audio.
- Creative review found that the result did not meet the cinematic brief: it used mostly dark title/reticle/tactical-diagram visuals, lacked authentic gameplay and player-action footage, and felt like animated slides rather than an esports documentary/trailer.
- Audio analysis found unexpected digital-silence intervals near 46.85–50.07s, 51.22–56.03s and 57.22–60.10s. These are defects to diagnose, not acceptable intentional silence unless the creative brief explicitly calls for them.
- Main commit after PR #52: `d1510e5c51d9ce4bd8503e1f5a43248bb450b196`. Main CI run #44362063980 and main render run #44362064050 completed successfully.
- PR #51 remained open on an older alignment-fix branch at the time of inspection. Re-check whether it is obsolete before taking action.
- Lesson: CI and a successful MP4 render prove technical execution, not creative quality. Do not accept future videos without inspecting the actual artifact.

## 2026-11-18 — NASA footage pipeline

- Earlier work added a NASA Image and Video Library asset-manifest workflow, safe HTTPS/rendition selection and per-shot trims from different portions of source footage.
- A narrated NASA/ISS explainer render was reported as completed with multiple source segments, Kokoro narration and a 3D inset.
- The NASA workflow demonstrates licensed-source discovery and compositing for a particular use case; it does not provide universal video generation or arbitrary stock footage access.
- Verify current source code and project artifacts before extending this workflow.

---

## Session handoff template

Append one entry per meaningful development session:

### YYYY-MM-DD — Short title

- **Goal:**
- **Changes:** files/features/commits/PRs.
- **Tests:** exact commands and pass/fail results.
- **Render:** workflow run, artifact ID, duration/resolution/codec.
- **QA:** what was actually inspected/listened to; defects found.
- **Decisions:** durable product/architecture choices.
- **Known issues:**
- **Next action:** one clear highest-priority next step.
- **Current branch / commit:**

## 2026-11-19 — Visual storytelling production guidance (in progress)

- Goal: begin implementing the roadmap direction by making the agent production process explicitly story-first and anti-slideshow, before attempting a broad renderer rewrite.
- Created branch `feature/visual-storytelling-production-guidelines` from roadmap commit `1341df8aa1f391024d5f30d25ecadc6048b9bebb`.
- Updated `agent/skills/creative-director/SKILL.md`: visual storytelling over animating information, concrete events/actions, per-shot visual-method selection, and effects only when motivated.
- Updated `agent/skills/storyboard/SKILL.md`: each shot must define method, action, start→development→end progression, motion, assets/fallback, and a slideshow-risk review before production.
- Updated `agent/README.md`: clarified production-method selection and added a production-intelligence checklist before scene building.
- No renderer or production-plan schema changes yet. This is the first workflow-guidance slice, not an implemented autonomous Director or new engine capability.
- Validation: changes are documentation-only; no tests or render were run. Validate links/content and open PR for review; CI should still be checked before merge.
- Next: open PR, inspect its CI; then build a small testable storyboard-quality validator that can identify missing shot actions/progression and warn about slideshow risk without overclaiming semantic AI QA.
- Current branch: `feature/visual-storytelling-production-guidelines`.

## 2026-11-19 — Production-plan shot requirements added (PR #66, validation pending)

- Added required `visualMethod`, `action`, and `visualProgression` shot fields to `validateProductionPlan`.
- Added regression tests for omitted method, action and progression.
- Enriched all four existing production-plan examples with the new fields. Each shot now describes method selection, a concrete action and start/development/end visual progression.
- The validator currently checks presence/non-empty strings only; it does not claim to judge creative quality or automatically detect slide-like output.
- CI run #44498960909 is validating the latest branch head. No render was performed.
- Next: resolve CI; then consider deterministic storyboard-risk warnings as a separate, testable slice.

## 2026-11-19 — Visual storytelling requirements merged (PR #66)

- PR #66 https://github.com/DarkonLikesCoffee/ai-video-studio/pull/66 merged by squash as `bbfce5c68d9a4c4a84b918285b23ac07f26b52f6`.
- CI run #44499140921 passed for final PR head `8a1bf5bbca568792332972bc89b852c58ef00950`.
- Updated Creative Director, Storyboard and agent production workflow guidance to emphasize concrete visual events, per-shot visual-method selection, start→development→end progression, and slideshow-risk review.
- Validator now requires non-empty `visualMethod`, `action`, and `visualProgression` on every shot. Updated tests cover missing fields; all four checked-in production plans were enriched.
- This validates planning completeness only; it does not semantically judge video/story quality or detect slideshow-like renders.
- No render was run.
- Next: implement a transparent deterministic storyboard-risk report with warnings only, backed by tests.

## 2026-11-19 — Deterministic storyboard risk report (PR pending)

- Started branch `feature/storyboard-risk-report` from current main.
- Added `scripts/storyboard-qa.ts`: warning-only deterministic signals for long shots, explicit static holds, repeated adjacent framing, repeated visual method and repeated camera movement. Output explicitly says these heuristics do not judge story meaning or prove quality.
- Added tests, package command `storyboard:qa`, and CI execution against the example plan.
- Added a roadmap check for this limited deterministic QA slice. The larger semantic storyboard/visual QA milestone remains incomplete.
- Tests/CI not yet confirmed; no video render performed.
- Next: inspect CI and fix failures, then update docs and merge only if green.

## 2026-11-19 — Deterministic storyboard risk report merged (PR #67)

- PR #67 https://github.com/DarkonLikesCoffee/ai-video-studio/pull/67 merged by squash as `40f38b7a7576bb061e5f0318e265358a759829f3`.
- CI run #44499955017 passed typecheck, all tests, four plan validations, storyboard QA CLI against all four production plans, project validation, audio preparation and studio build.
- `npm run storyboard:qa -- <production-plan.json>` now emits warning-only signals for shots 8s+, static camera holds 5s+, adjacent framing repetition, 3+ shot visual-method runs and 3+ camera-movement runs.
- QA output: the launch-film, narrated explainer and SORA plans had no deterministic warnings; VALORANT generated six long-shot pacing warnings for its six 10-second chapters. This is expected as a review prompt, not an automatic defect.
- Documentation added to README and agent guidance. This report is deterministic and does not claim semantic creative judgment or video inspection.
- No render was run.
- Next: improve shot-sequence planning/validation with transparent visual-method distribution and action/progression checks, then evaluate storyboard/animatic review before expanding renderer effects.


## 2026-11-19 — Live repository audit and storyboard review vertical-slice kickoff

- Re-read `START_HERE.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `PROGRESS_LOG.md`, `AGENTS.md`, `README.md`, agent workflow guidance and the relevant Creative Director, Storyboard, Remotion Producer and Visual QA skills.
- Verified live `main` at `a30be87792a5bc0646e4c4dc3b1bf04d42a8dd92`; latest main CI run #44500292909 succeeded. No open PRs were returned. PRs #66 and #67 are merged.
- Read the attached continuation: after #66/#67 the project owner supplied NotebookLM research and chose to treat it as strategic input, not a shopping list. The agreed direction is story-first planning, per-shot visual-method selection and a reviewable sequence before expanding renderer effects.
- Confirmed the current storyboard analyzer is deterministic warning-only QA. It does not semantically judge story content or render previews.
- Confirmed the current production plan already records shot timing, visual method, action, start/development/end progression, framing, camera, transition and audio. The existing schema has no animatic renderer.
- Created branch `feat/storyboard-animatic-preview` from verified main. No application code or render request has been changed yet.
- Chosen next vertical slice: a lightweight, dependency-free storyboard/animatic review artifact derived from an existing production plan. It should show timed shot cards and the authored visual direction, clearly label itself as a planning preview (not a video render), and provide a way to inspect the full sequence before committing to asset production/rendering.
- No render was run in this session. The last reported VALORANT v4 run #44485488551 was technically successful (47.86s, 1080p/30fps); creative acceptance remains open and the uploaded conversation reports frame-based review, not full-timeline playback/audio listening in this session.
- **Next:** inspect the full storyboard/production-plan format and implement the smallest reusable preview generator plus tests, then run CI and inspect the produced preview. Keep the renderer and `render-request.json` untouched unless an end-to-end render becomes necessary for acceptance.
- Current branch: `feat/storyboard-animatic-preview`; base: `a30be87792a5bc0646e4c4dc3b1bf04d42a8dd92`.


## 2026-11-19 — Storyboard planning preview implementation (PR preparation)

- Added `scripts/storyboard-preview.ts`, a dependency-free TypeScript utility that converts an existing production plan into a timeline-ordered HTML review page.
- The preview surfaces shot timing, visual method, purpose, visual description, concrete action, start/development/end progression, framing, camera movement, transition, audio, text and asset references.
- The utility validates the preview's basic sequence bounds (starts at 0, shots ordered/non-overlapping, no shot past runtime, final shot ends at declared runtime) so the review page cannot silently imply an invalid sequence.
- The output explicitly labels itself as a planning preview, not a rendered video or animated animatic. It does not load footage, generate assets or claim semantic creative approval.
- Added `tests/storyboard-preview.test.ts` for data coverage, invalid timing/overlap and HTML escaping. Added `npm run storyboard:preview`.
- Documented the review step in README and agent workflow guidance.
- CI now generates planning previews for the launch-film and VALORANT production plans and uploads them as the `storyboard-planning-previews` artifact (7-day retention).
- This is an inspectable pre-production planning aid; it does not yet show thumbnails or generated motion. The next iteration can add asset thumbnails/representative media only after a reliable, rights-aware preview path exists.
- Branch: `feat/storyboard-animatic-preview`, based on `a30be87792a5bc0646e4c4dc3b1bf04d42a8dd92`.
- Validation: awaiting PR CI. No full video render was initiated because this feature produces a planning artifact only, not a video-producing engine change.
- Next: inspect CI, download and inspect the HTML artifact, resolve any issues, then open/complete the PR review and update state with exact CI/artifact evidence.


## 2026-11-19 — Storyboard planning preview merged (PR #68)

- PR #68: https://github.com/DarkonLikesCoffee/ai-video-studio/pull/68 merged to main using squash.
- Merge commit: `e7988966b6783ff0cf4e0f92bcd656859b9cafc3`.
- Branch CI run #44502735050 passed all steps: Python narration tests, TypeScript typecheck, 151 Node tests, production-plan validations, new storyboard preview generation, storyboard risk reports, FFmpeg/FFprobe setup, media/project validations and studio build.
- CI artifact #14516579993 (`storyboard-planning-previews`) was downloaded and inspected. It contains `launch-film.html` (4 shots) and `valorant.html` (6 shots); both files are non-empty standalone HTML outputs.
- The preview is an HTML pre-production planning page, not an animated animatic or rendered video. It shows the authored shot timeline and creative fields; it does not play the clips or semantically evaluate story quality.
- Tests revealed valid projects can contain transition overlaps. The preview now preserves overlaps instead of rejecting them. The project-wide validator, not this display helper, remains authoritative for timeline legality.
- Roadmap updated to mark the HTML planning-preview milestone complete. Future work remains to create a true visual animatic with representative media/motion, a persistent/assisted Production Director, and actual semantic visual QA.
- Main CI after merge: run #44502943805 was queued at the time of this update; do not mark the post-merge CI complete until its result is checked.
- No MP4 render was started: this PR changes pre-production planning review only and deliberately leaves the render request and renderer untouched.
- Current main at documentation update start: `e7988966b6783ff0cf4e0f92bcd656859b9cafc3`.

## 2026-11-19 — Expanded storyboard quality signals (PR preparation)

- Started `feature/storyboard-quality-signals` from live main `f2f54d121279944a19a5fe187efba6b6aeccc066`.
- Extended `storyboard:qa` with transparent warning-only checks: generic/placeholder visual descriptions, vague actions, missing explicit Start/Development/End progression markers, highly similar adjacent visual descriptions, and long on-screen copy.
- These checks do not fail production plans and are not semantic quality scores. The purpose is to help an agent identify weak shots and rewrite them before asset production.
- Added regression tests for all five signals; existing risk warnings remain unchanged.
- Updated README and agent workflow guidance.
- Pending validation/CI. No render yet; this change affects pre-production review only.


## 2026-11-19 — Expanded storyboard quality signals merged (PR #69)

- PR #69: https://github.com/DarkonLikesCoffee/ai-video-studio/pull/69 merged by squash into main as `ac153121b0f7ec81a02dbec63e8c1b37fb205200`.
- New warning-only heuristics: `VAGUE_VISUAL_DESCRIPTION`, `VAGUE_ACTION`, `INCOMPLETE_VISUAL_PROGRESSION`, `REPEATED_VISUAL_DESCRIPTION` and `TEXT_HEAVY_SHOT`.
- Existing storyboard risk checks retained. No validation is weakened; the warnings do not fail plans.
- CI run #44504229542 passed the full workflow: typecheck, test suite, production-plan validation, storyboard planning previews and QA reports, project validation, FFmpeg/FFprobe setup, audio processing validation and studio build.
- The first CI attempt failed due to a syntax error in the new helper. Fixed regex escaping and the missing function closure; the succeeding full CI run passed. This is recorded rather than hidden.
- PR is merged. No video render was performed because this is a pre-production QA CLI change.
- Limitations: token similarity and phrase patterns can miss weak shots or produce false positives; they do not semantically evaluate story or inspect video.
- Next: improve the quality signals with shot-size/layout change and text-vs-visual balance where measurable, then prototype a review/repair loop. Keep actual rendered video QA separate.


## 2026-11-19 — Shot-scale variety signals merged (PR #70)

- PR #70 https://github.com/DarkonLikesCoffee/ai-video-studio/pull/70 merged by squash as `50a3e81d2bb29e72307772ba96ec22735af10ccb`.
- `storyboard:qa` recognizes common shot-scale descriptions (extreme close-up, macro, close-up, medium, wide) and adds warning-only `REPEATED_SHOT_SCALE` (three adjacent shots) and `LOW_SHOT_SCALE_VARIETY` (5+ shots, at least 60% recognizable, no more than two recognized scales).
- Unknown framings are excluded from scale variety, avoiding warnings based solely on unrecognized terminology.
- Regression tests added; README and agent guide updated.
- CI run #44505337143 passed for final head `b7a3a86f322cfeab5a96556cdfa3131c708b948c`: Python narration tests, typecheck, Node tests, plan validation, storyboard previews and QA, all project validations, FFmpeg/FFprobe/audio checks, and studio build. No render was run (pre-production QA only).
- Next: prototype a separate critique report with prioritized, specific revisions for weak shots. Keep it review-only initially; do not silently rewrite a plan. Validate revised plans with the existing validator and QA, then evaluate an explicit approval/repair loop.
- Main merge commit: `50a3e81d2bb29e72307772ba96ec22735af10ccb`.


## 2026-11-19 — Review-only storyboard critic report merged (PR #71)

- PR #71 https://github.com/DarkonLikesCoffee/ai-video-studio/pull/71 merged by squash as `c18b1be0e79f25e6b14b3d49838f31b9c683044d`.
- Added `scripts/storyboard-critic.ts` and `npm run storyboard:critic -- <production-plan.json> [output.md]`. The command turns deterministic QA warnings into high/medium prioritized actionable revision suggestions.
- Suggestions cover weak visual/action descriptions, missing visual progression, repeated adjacent visual content, text-heavy shots, long shots/static holds and repeated framing/scale/method/camera movement.
- It is strictly review-only: does not mutate source plan, invoke an AI provider, auto-repair or approve the creative. Apply selected revisions to a copy and rerun plan validation and QA.
- Added tests for prioritization, report content, non-mutation and no-findings behavior; CI smoke-generates a critique for the launch-film example. Updated README and agent docs.
- First CI run #44506671305 failed on a test that expected recommendations from the clean example; fixed by deliberately weakening a shot in the test. Final PR CI run #44506823215 succeeded.
- Final run passed typecheck, tests, plan validation, previews, critic report, all storyboard QA checks, project validation, FFmpeg/FFprobe, audio preparation and studio build. No render was performed because this is a pre-production review tool.
- Main merge SHA: `c18b1be0e79f25e6b14b3d49838f31b9c683044d`.
- Next: define a versioned revision artifact that preserves original plan, selected recommendations, applied edits and validation results. Then evaluate model-assisted semantic critique under an explicit no-paid-call constraint; do not implement auto-repair until review and rollback are auditable.


## 2026-11-19 — Repository continuity snapshot reconciliation

- Re-verified live main at `40ffe8fd8a21466fa4cca607ace6ecc422c7ab35`; latest main CI #44507106494 completed successfully; no open PRs.
- Found `PROJECT_STATE.md` was stale and contradicted recent merged milestones. Replaced it with a current, evidence-based snapshot including PRs #66–#71 and explicit limits of the storyboard QA/critic tools.
- Added the traceable storyboard revision artifact as a roadmap item: source plan, critique, selected suggestions, explicit edits and validation result, with original plan preserved.
- This is documentation reconciliation only; no implementation or render was performed.


## 2026-11-19 — Preserve continuity context during snapshot update

- Safety review found the initial PR #72 draft shortened `PROJECT_STATE.md` too aggressively, removing useful architecture, engine capability, limitation, and VALORANT benchmark context.
- Revised the proposed snapshot to preserve sections 1–5 of the existing state document and replace only stale duplicated history with current verified milestones and resume instructions.
- CI must re-run against this updated head before merge. This is a documentation improvement only; no tests or render are claimed.


## 2026-11-19 — Traceable storyboard revision artifact (PR preparation)

- Implemented `scripts/storyboard-revision.ts` with `storyboard:revision init|validate|apply` CLI modes.
- `init` creates a version-1 artifact that preserves the exact source plan text, parsed source object, source SHA-256, critic suggestions (unselected), explicit edit list and empty validation field.
- `validate` and `apply` verify the source file and embedded text still match the original hash, and verify the embedded object matches the preserved text; source drift requires a fresh artifact.
- Edits are explicit per shot (`shotId`, `changeNote`, `fields`). Applying writes a separate revised plan and never overwrites the original. Schema errors and heuristic warnings are recorded separately.
- Added regression tests for source preservation, edits without source mutation, unknown shot IDs, and separating validation errors from QA warnings. Updated CLI docs, agent workflow and roadmap.
- This is a deterministic review/edit artifact, not AI auto-repair or creative approval. CI is required for test/typecheck verification; no render is needed for this pre-production-only capability.


## 2026-11-19 — True-peak measurement in media QA (PR preparation)

- Added extraction of EBU R128 `True peak` from FFmpeg audio-analysis logs into `measurements.truePeakDbfs`.
- Default warning threshold is -1.0 dBFS; readings above it warn, readings above 0.0 dBFS fail. Both values configurable.
- Added tests for safe, warning, and over-limit readings; updated README and roadmap to distinguish partial implementation from full audio QA.
- CI is pending. No render or listening session was performed for this change.


## 2026-11-19 — Trailing silence through EOF (PR preparation)

- Confirmed the silence parser currently pairs only `silence_start` and `silence_end`, leaving an EOF-trailing silence unreported when FFmpeg emits only a final `silence_start`.
- Added a parser path to close unmatched final silence at the probed media duration, preserving interval duration precision and skipping zero-length intervals.
- Added regression tests for a long trailing silence that must fail, a short trailing silence warning, and an EOF zero-length edge case.
- CI pending. No benchmark render or audio listening was performed.


## 2026-11-19 — PR #75 merged; contact-sheet QA utility started

- PR #75 CI passed and was merged to main as `faacfbe097b1ac933052de9e6a7070d5fa9d6d28`. It detects trailing silence with an unmatched final `silence_start` by closing it at EOF.
- Started a reusable FFmpeg contact-sheet CLI on `feat/media-qa-contact-sheet`: samples frames at configurable intervals, creates a JPEG grid and supports interval/columns/width/output options.
- Added unit tests for grid layout and option validation. CI is pending; no real MP4 contact sheet has been generated/inspected in this session yet.


## 2026-11-19 — Contact-sheet CLI merged (PR #76)

- PR #76 https://github.com/DarkonLikesCoffee/ai-video-studio/pull/76 merged by squash as `712b5b864a437f87501a735bfb718293abe9ad62`.
- CI run #44516361047 passed after fixing invalid TypeScript escaping in the CLI output strings. The initial run failed at `scripts/qa-contact-sheet.ts` lines 53–59; the failure was diagnosed from logs, corrected in commit `c1f19f153af097ca8f0f47158476aa72ef26c92e`, and the final CI passed.
- The CLI uses FFprobe to obtain duration and FFmpeg to sample frames into a JPEG grid. Options include interval, columns, thumbnail width and output path. Unit tests cover grid calculation and validation.
- Post-merge main CI run #44516765269 is running; check its result before considering the merge fully verified.
- No real MP4 contact sheet has been generated/visually inspected yet. This is implemented tooling, not completed rendered-video QA.
- Next: verify post-merge main CI; then use the contact-sheet CLI plus existing `qa:media` report on an actual benchmark MP4 and record the artifact/evidence. Improve automation only after validating this real workflow.


## 2026-11-19 — VALORANT v4 real-render media QA and contact-sheet inspection

- PR #77 docs reconciliation merged as `93cec7fec2a4c8917bb6c231519b75181fb54d48`; its CI #44517012780 and post-merge main CI #44517175453 passed.
- Retrieved render run #44485488551 artifact #14511125907 (`valorant-immortal-decision-making-v4.mp4`, 46.7 MB) and its bundled QA report. The MP4 is 47.856s container duration, 1920×1080, 30fps H.264 video and AAC stereo audio at 96kHz. Video stream duration is 47.733s; measured audio/video duration drift is 0.123s.
- QA report: passed; no detected silence intervals, frozen intervals or black-frame intervals. Integrated loudness was -16.0 LUFS. No true-peak reading was present in this older render report, so true peak is not verified for this artifact. Audio was measured, not listened to.
- Generated a 5-second contact sheet (10 sampled frames; 4 columns) and visually inspected it. It shows real gameplay clips under repeated large centered headline overlays. Frame samples indicate composition/framing repetition and text dominance; this is a review finding, not a continuous-motion analysis.
- Contact-sheet image is retained in the current work environment at `/mnt/data/valorant-v4-qa/contact-sheet.jpg`; MP4/QA ZIP at `/mnt/data/valorant-v4-artifact.zip`. These are session artifacts, not repository assets.
- This completes one real-artifact contact-sheet/QA trial, but not full creative acceptance: no full-timeline playback or audio listening occurred, and sparse samples cannot verify motion continuity or shot timing.
- Next: turn the contact-sheet workflow into repeatable evidence/acceptance (including audio listening and true-peak coverage on a fresh render), then prioritize a production change that reduces repetitive text-overlay compositions instead of adding more QA infrastructure.


## 2026-11-19 — Contact-sheet evidence report (PR preparation)

- Added a pure helper to calculate exact sample timestamps, matching the contact-sheet interval/count logic (including short clips and non-multiple durations).
- Extended the CLI with optional `--report report.json`. The JSON evidence report records schema version, input path, duration, frame count, grid rows, exact sampled timestamps, selected options, contact-sheet output path and generator name. Report output is optional; existing CLI use remains unchanged.
- Added unit coverage for timestamp sequence, short clips and invalid intervals. CI is pending; do not claim tests pass until workflow confirms.
- Goal: make sparse visual inspection repeatable and reviewable without pretending it replaces continuous playback or creative QA.

## 2026-11-19 — Visual strategy alternatives report (PR pending)

- Added `scripts/storyboard-strategy.ts` and `npm run storyboard:strategy`, a report-only command that summarizes storyboard visual-method distribution and turns existing deterministic QA signals into shot-specific production alternatives.
- Alternatives are concrete options (e.g. footage, physical/3D demonstration, macro detail, before/after, motivated camera choices) rather than generic "add variety" advice. The report does not modify the plan or claim semantic understanding.
- Added regression tests for method counts, actionable shot alternatives and explicit report limitations.
- Branch: `feat/storyboard-visual-strategy-report`. The first CI run found one assertion mismatch (the recommendation wording omitted the exact phrase expected by the test); TypeScript typecheck passed. Wording was corrected in commit b95bd5f. Local test execution was not possible because the container could not resolve github.com; rerun CI is in progress.

## 2026-11-19 — PR #81 merged; strategy report JSON extension underway

- PR #81 merged at `f621b018facaa1f37ed48d34d35d342fe788b32`. Branch CI passed and post-merge main CI passed.
- `storyboard:strategy` currently emits Markdown by default. New branch `feat/storyboard-strategy-json` adds a versioned JSON output envelope with `schemaVersion`, `reportType`, `planTitle`, the full report payload, and `generatedBy`.
- CLI adds `--json`; optional file output remains supported, enabling future agent/workflow consumption without scraping Markdown.
- Regression test validates JSON envelope and report content. CI pending.


## 2026-11-19 — PR #82 merged; state docs reconciliation

- PR #82 `Add machine-readable storyboard strategy reports` merged by squash to main as `25e946045f00764142fb26c9c8e305bdd511e8c5`.
- PR CI run #44520734383 passed for head `b12bd9cf6ff06442fa6ef91e82bd53f720e5b8ec`; post-merge main CI run #44521207902 passed for merge commit.
- Added `--json` to `storyboard:strategy`, producing a versioned envelope while retaining Markdown default.
- Reconciled PROJECT_STATE's commit snapshot and fixed an earlier escaped-newline formatting artifact in the strategy-report section.
- Next: examine the existing `storyboard:revision` artifact workflow before designing any integration; avoid duplicating the critic's existing suggestions.


## 2026-11-19 — Render contact-sheet evidence integration (PR preparation)

- Added a render-workflow step after media QA to create a 5-second contact sheet (4 columns, 320px thumbnails) and a JSON evidence report using the existing `qa:contact-sheet` CLI.
- Expanded the render artifact to include both evidence files in addition to MP4, credits and media-QA JSON. This avoids manual contact-sheet generation for future GitHub Actions renders.
- No render has been run with this workflow change yet; validation is pending CI. Contact sheets remain sparse review evidence and do not replace full playback or audio listening.


## 2026-11-19 — Render contact-sheet evidence integration merged (PR #84)

- PR #84 merged as `5cfcdc1d01067295ec2d76c2e7307905dbe678a6` after branch CI passed for exact head `58e68ccd8da334a481c2a825731338dbd6d7b2f5`.
- GitHub Actions now generates a 5-second contact sheet (4 columns, 320px width) and JSON evidence report after Media QA and includes them in the render artifact.
- Post-merge main CI run #44524069933 is running. No render has yet been run through the new workflow.
- Next: verify main CI, then inspect the revision artifact/critic integration for the next production-intelligence slice.


## 2026-11-19 — True Peak media QA fix merged (PR #86)

- Rebuilt the relevant code-only changes from stale PR #80 on current main, avoiding old documentation snapshots.
- PR #86 merged as `4ea4cbdeda0b1be480bfe0c3b52653ed23f7011d`; PR CI passed for exact head `4e6ce4db751ed8fd307a631c68efda0ada990512`.
- EBU R128 filter enables `peak=true`; parser handles the actual two-line True peak summary. Added regression tests and a pure configurable audio-filter builder.
- Main CI #44525255281 is in progress; confirm result before declaring merge validation complete.
- PR #80 was not merged; its code fix was rebuilt and merged through PR #86.



## 2026-11-19 — PR #88 merged; model-neutral storyboard revision prompt handoff underway

- PR #88 merged as `5e7b019ce8487c7af067b4b8fe0ee1f9186f4fd3`; its PR CI and post-merge main CI run #44526796903 passed.
- Implementing `storyboard:revision prompt`: export a ready-to-use creative revision prompt from selected critique items, including original data for only affected shots and explicit constraints to preserve unselected shots/source plan.
- Prompt asks a downstream model to return structured `edits` JSON only, matching the revision artifact fields; it does not call an AI provider, alter the plan or auto-apply edits.
- Added test coverage for selected critique context, output instructions, and refusal when no suggestion is selected. CI is required to verify these changes.
- Branch: `feat/storyboard-revision-ai-handoff`. No render has been created for this slice.


## 2026-11-19 — PR #89 merged; guarded revision-edit import underway

- PR #89 merged as `bd1b0b5c62dddfd9c246af0da54c93f26cc6ace4`; validation check succeeded.
- Follow-up slice: add `import-edits` to accept model JSON response and import only edits for existing shots covered by selected critique items.
- Guardrails: reject unknown shot IDs, duplicate edits per shot, unselected shots and unsupported fields. Import clears validation state; plan remains untouched until validate/apply creates a separate output.
- Added tests for accepted import and rejection paths. CI is required before merge. No video render created.


## 2026-11-19 — PR #90 and #91 merged; narrative beat review completed

- PR #90 `feat(storyboard): safely import revision edits from AI` merged as `8c3c2dbf1ca8a819c7203cc3d4572c1e4cccce2f` after CI run #44533984018 passed. Its first CI failure was corrected (test syntax and inverted allowlist logic); regression tests now cover permitted/unsupported fields and duplicate edits.
- PR #91 `feat(storyboard): add explicit narrative beat review` merged as `85d1ab0fd4d211365e2dec2fb0213cdf4fda2296`; CI run #44534929322 passed after fixing a test fixture whose opening beat did not trigger the intended warning.
- Production plans now optionally label shot beats; `storyboard:beats` reports counts, duration totals, unlabeled shots and arc review prompts. Example plan tags hook → development → reveal → payoff.
- The report is explicit-label only, advisory and not semantic story QA. No render was produced for these planning-tool changes.


## 2026-11-19 — PR #93 creative brief contract

- Verified live main after PR #92 merge commit `7bcb7b583d16eb5cf4ef2445bdefc25b614bcd27`. No open PRs were reported at start; post-merge status checks were unavailable via combined-status endpoint.
- New branch `feat/creative-brief-contract` defines a versioned creative brief schema, deterministic validator/Markdown summary CLI, sample brief and tests. This separates director-level intent from the executable storyboard/render plan.
- The CLI is groundwork only: it validates/summarizes an authored brief and does not call an LLM or claim autonomous direction.
- CI pending; no render produced.


## 2026-11-19 — Render contact-sheet workflow verified on a real artifact (run #42)

- The render workflow's existing PR #84 integration was exercised on branch `fix/render-contact-sheet-artifact-validation-2026-11-19`. Run #41 failed validation because the output name was over 60 characters; the name was shortened on the same branch and run #42 completed successfully (commit `96846b5186558bb91a912ed1a0c82227cd06ec3c`).
- Artifact #14532466761 was downloaded and its ZIP contents verified: `valorant-immortal-v4-contact-sheet-check.mp4`, `.qa.json`, `review/...contact-sheet.jpg`, and `review/...contact-sheet.json`. The credits file was skipped. The MP4 was not played back continuously and audio was not listened to.
- Media-QA JSON reports 47.899s, 1920×1080 H.264, 30fps/1,431 frames, AAC stereo 96kHz, 0 findings, no silence/freeze/black intervals, -16.0 LUFS integrated, -1.5 dBFS true peak, and 0.199s A/V duration drift.
- Contact-sheet report records 10 timestamps (0–45s every 5s), 4 columns, 320px thumbnails. The contact sheet image was retrieved and visually inspected: gameplay is present, but adjacent samples repeatedly show similar large text-overlay composition. Sparse samples cannot prove motion, pacing or synchronization, so this is evidence packaging plus limited visual review—not full creative acceptance.
- Run #42: https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/44527278383 ; artifact: https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/44527278383/artifacts/14532466761

## 2026-11-19 — PR #93 creative-brief contract merged

- PR #93 merged as `d643e752b4430165121072185ef41e8ad5fc940c`. CI run #327 (`44536804622`) passed on exact head `50ee419791c88338a1b8ac690176ba088e5fb2bb`.
- First CI attempt #326 failed only because the frame-alignment fixture used 1.1s at 30fps, which is exactly 33 frames and therefore valid. Corrected fixture to 1.11s on the same PR branch; the rerun passed. This was a test-fixture error, not a validator failure.
- The versioned creative-brief schema/validator and summary CLI are merged; they do not call an LLM or generate storyboards. No render gate was applicable to this schema/CLI slice.
- Post-merge main CI run #328 (`44537158524`) is still running at this documentation update.


## 2026-11-19 — Production-plan schema/runtime consistency fix (in progress)

- Main at branch start: `7fc374fc8c96cd617bd490da5cff5fe8ea49fa0a` (PR #94 docs merge); post-merge main CI #44537639626 passed.
- Found a contract mismatch: `validateProductionPlan` requires `visualMethod`, `action`, and `visualProgression`, but the JSON Schema omitted those fields from both `properties` and `required`. It also omitted `narrativeBeat`, which runtime accepts as an optional supported label; `additionalProperties:false` made the schema incompatible with the validator/example.
- Branch `fix/production-plan-schema-runtime-contract` adds those properties, makes them required, adds the optional narrative-beat enum, and adds a regression test asserting schema/runtime-required fields and enum alignment.
- This is a schema-only correction; no render was produced or needed. CI pending.


## 2026-11-19 — PR #80 status reconciled; PR #96 merged; storyboard import implementation

- PR #80 (`fix/qa: enable true-peak measurement`) is **closed, not merged**. Its CI run #44519259478 succeeded, but the correction was superseded and integrated via PR #86, merge commit `4ea4cbdeda0b1be480bfe0c3b52653ed23f7011d`. No attempt to reopen or duplicate the fix.
- PR #84 contact-sheet workflow integration remains verified by real render run #42 / artifact #14532466761. This is already in main; no duplicate workflow work was started.
- PR #96 production-plan schema/runtime correction merged as `98a972911052fa8a3381c4852e1f6f38c1d94398`. PR CI run #332 (`44538121663`) passed on head `ebd53bec9f260af31b0d9c7e6e391eb426837057`. Post-merge main CI run #44547338478 is in progress.
- PR #95 was rebased/squashed onto current main `98a972911052fa8a3381c4852e1f6f38c1d94398`; current head `7bd50163aa29f284eedc5775891c743f085592cf` is mergeable. Two check suites are queued with zero check runs, so do not merge until CI actually completes.
- Branch `feat/director-production-plan-import` (based on #96 merge commit) adds a CLI to convert Creative Brief + storyboard JSON into a production plan. It validates brief, matching delivery fields, shot descriptions, contiguous/frame-aligned timing and complete exact criterion-to-shot coverage with rationale. The plan schema optionally supports coverage while preserving legacy plans; free-form implementation notes are preserved in a bounded field. Added six regression tests and updated README/agent workflow/state/roadmap.
- Tests/typecheck have **not** been executed locally because this connector cannot run the repository. CI must verify. No render gate is applicable to this non-rendering planning/import feature. No video playback or audio listening performed.
- PR #97 is now open: https://github.com/DarkonLikesCoffee/ai-video-studio/pull/97, head `2face7f8acfc96340800f6e363c650208c2a625e`, base `98a972911052fa8a3381c4852e1f6f38c1d94398`. Its three check suites are queued and no run has completed yet. The diff was reviewed for scope; no render gate applies.
- Next: monitor #95 and #97 CI, fix failures on their existing branches, merge only after all required checks pass, then connect the production plan to asset/build stages with acceptance-criterion evidence review.


## 2026-11-19 — PR #95 merged; PR #97 compatibility failure fixed

- PR #95 storyboard handoff reviewed and merged as `76b9b99fdd49c7f95ce35b01301170ab9658a4dd`. Its required `validate` CI run #44550178698 passed on head `6209942bdfa08cfeabac0c4f74849e59182db11b`. Post-merge main CI #44554881017 passed.
- PR #97's initial CI #44550086585 failed in the narrated-explainer production-plan validation: five legacy shots used free-form `engineApproach: external-footage-with-3d-inset`, which the new validator rejects because the schema only permits three normalized engine enum values.
- Compatibility fix preserves each legacy string as `implementationNotes`, removes unsupported `engineApproach`, and adds a regression test asserting the migrated example passes `validateProductionPlan`. The converter already maps unknown storyboard engineApproach strings to implementationNotes.
- Reconciled PR #97 with PR #95's main merge and combined README/package/agent-workflow docs so the handoff CLI precedes production-plan import. PROJECT_STATE and ROADMAP now record current evidence.
- No render gate is applicable to this planning/import slice. Local tests/typecheck cannot be executed through the GitHub connector; the updated CI run is required.


## 2026-11-19 — PR #97 merged; criterion-to-asset evidence bridge in development

- PR #95 storyboard handoff and PR #97 storyboard-to-production-plan import are merged. PR #97 required CI run #44556330379 passed; merge commit is `b05ff0b3674e9a96fd9fdd925bd73a7d9afa6354`. Post-merge main CI #44574582076 is in progress.
- Re-read `START_HERE.md`, live `PROJECT_STATE.md`, `ROADMAP.md`, `PROGRESS_LOG.md`, `AGENTS.md`, `README.md`, `agent/README.md`, `docs/agent-production-workflow.md`, and relevant Creative Director, Storyboard, Asset Producer, Remotion Producer, Media QA, Visual QA, Narrated Video Producer and Audio Designer skills. No installed plugin skills were available.
- Verified the only open PR was #97 before merge; PR #95 and #97 are now merged, and no open PRs remain at the initial next-task check. PR #80 remains closed/unmerged; True Peak fix is through PR #86.
- Selected the roadmap's next small slice: report-only linking of acceptance criterion → shot → asset manifest, checking plan references, local-file presence/path safety and provenance/rights metadata. It does not claim semantic asset suitability or require assets for procedural shots.
- Added `scripts/director-asset-evidence.ts` and `director:asset-evidence`, plus tests for mapping/readiness, missing files/metadata, `all` assignments, unknown shot IDs, unsafe paths, unresolved plan references and missing coverage. Updated README, agent guide, production workflow, Asset Producer skill, PROJECT_STATE and ROADMAP.
- Tests/typecheck have not been run in this connector-only workflow; GitHub Actions is the validation gate. This report-only change does not require a video render. No playback or audio listening was performed.
- Opened PR #98: https://github.com/DarkonLikesCoffee/ai-video-studio/pull/98. Initial CI #44576694962 failed typecheck on two missing closing parentheses in `scripts/director-asset-evidence.ts`; fixed on the existing branch. The latest CI run was queued, then cancelled by subsequent documentation commits; CI is rerunning against the current PR head. Post-merge main CI #44574582076 passed.


## 2026-11-19 — PR #98 test syntax regression corrected

- Inspected latest PR #98 CI run #44591887176. Type-check passed; the test step failed to load `tests/director-asset-evidence.test.ts` because the unknown-shot assertion at line 88 was missing a closing parenthesis. Earlier run #44585662593 had the same syntax error in the shared-asset assertion at line 80; that was corrected in a later head, revealing the second typo.
- Fixed the line-88 assertion on the existing `feat/director-asset-evidence-report` branch in commit `42bdb0366e3a3ffa8063b5bde982cf4d559f3c6a`. No test was bypassed. Connector-only environment means tests were not executed locally; CI is required on the final branch head.
- Updated PROJECT_STATE with the CI evidence. Main CI #44574582076 passed. This report-only change does not require a render gate. No full video playback or audio listening was performed.


## 2026-11-19 — PR #98 merged; media QA stream start-offset diagnostic in progress

- PR #98 criterion-to-asset evidence report merged as `73807bad31f133a0a2819cdd084286903f963645`. Required `validate` CI #44608513408 passed; post-merge main CI also passed. The report-only criterion→shot→manifest bridge is now on main; it checks unresolved references, local path/file safety and provenance/rights fields without asserting visual suitability.
- Re-read `START_HERE.md` and its required state/roadmap/log/agent/docs/skills; checked current main, open PRs (none), CI/workflows and relevant media-QA implementation. PRs #95 and #97 remain merged and are not being redone; PR #80 remains closed/unmerged and its true-peak fix is through #86.
- Roadmap P0 synchronization/QA remains incomplete: duration checks cannot detect equal-length streams with differing start timestamps. Selected a focused follow-up on branch `feat/media-qa-av-start-offset`.
- Added ffprobe stream `start_time` support and a signed `audioVideoStartOffsetSeconds` measurement (audio start minus video start). Absolute offsets over 0.5s default fail, independently from duration drift; the option is configurable. Missing timestamps are omitted rather than guessed.
- Added regression tests for aligned starts, late audio with equal stream durations, early audio, configurable threshold and absent timestamps. Updated README and Media QA skill plus PROJECT_STATE and ROADMAP. No local test/typecheck was run because this connector session cannot execute the repo; CI is required.
- This diagnostic slice does not require a render. No new render, full video playback or audio listening was performed. Latest previously inspected render run #42 remains technical QA evidence only: no detected silence and 0.199s duration drift, with limited contact-sheet inspection.


## 2026-11-19 — PR #99 code review correction and benchmark timestamp check

- Reviewed PR #99 diff and caught two unintended parser regressions before CI: the true-peak regex was missing its closing parenthesis, and the `silence_end` regex had lost its negative-number allowance. Corrected both on the same branch in commit `e40a71c3aeb7437dc2abffbbd6b503b8fe39fdac`.
- Retrieved Render run #42 artifact #14532466761 and inspected its actual MP4 with ffprobe. Video start time 0.000s, audio start time 0.000s (new signed offset would be 0.000s); video stream duration 47.700s, audio/format duration 47.899s. Existing QA JSON passed with no findings, no detected silence/freeze/black intervals, -16.0 LUFS, -1.5 dBFS true peak and 0.199s duration drift. This is technical metadata, not full playback or listening.
- PR #99 is open: https://github.com/DarkonLikesCoffee/ai-video-studio/pull/99. CI run #44628990848 completed successfully for exact head `78915bd48f3b55373a6a829a8473b7e55fdfcb70`; type-check, tests and validate all passed. PR #99 is mergeable and remains open pending merge. No render gate applies to the diagnostic-only slice.


## 2026-11-20 — PR #99 current-head validation evidence (merge pending)

- Rechecked PR #99 against main commit `73807bad31f133a0a2819cdd084286903f963645`: branch `feat/media-qa-av-start-offset`, exact head `89c88a155c7b13bb699e15515de1871c625d066a`, 21 commits ahead and 0 behind; PR remains open and mergeable.
- Required validate CI #44643693225 completed successfully on this exact head. All steps passed, including TypeScript type-check, tests, production-plan/example validation, preview generation, project validations and studio build. Its `storyboard-planning-previews` artifact #14587822246 was uploaded (8,947 bytes). No render artifact is expected from this diagnostics-only change.
- Reviewed the PR patch: the signed offset is computed from ffprobe first video/audio stream `start_time`, missing/invalid timestamp values are omitted, and the configurable default 0.5s absolute threshold is independent of duration drift. Regression tests cover zero offset, equal-duration late audio, early audio, custom tolerance and missing timestamps.
- Main CI #44620050018 passed on the current main commit. PR #99 is merge-ready pending the final merge action. No local test execution, fresh render, full video playback or audio listening was performed.


## 2026-11-20 — PR #99 merged; real-MP4 media-QA integration test underway

- PR #99 merged as `86a3549a3b0be0bcfe64f41f6e8f8237453113d8` from exact head `153d4b979544efbd150bb596cb7c58ffb5f5e340`. Required validate CI #44646093493 passed; post-merge main CI #44654418400 is currently in progress.
- After re-reading the entry point, state, roadmap, progress log, agent rules, README, production workflow and relevant skills, selected the next P0 quality-gate slice: exercise the real `inspectMedia` pipeline on a deliberately offset MP4 rather than relying only on synthetic probe objects passed to `buildMediaQaReport`.
- PR #100 (`test/media-qa-ffmpeg-offset-integration`) creates a short moving test-pattern MP4 with 0.65s delayed audio, then asserts the start-offset finding is present and stream-duration drift remains below the independent threshold. The fixture skips when FFmpeg/FFprobe are absent; CI installs both before tests.
- Manually verified the fixture recipe with FFmpeg/FFprobe: video start `0.000000`, audio start `0.628000`, video duration `3.600000`, audio duration `3.621333`, drift `0.021333s`; audio/video filters emitted no silence/freeze/black findings. The actual repository test and typecheck have not run locally; PR CI is pending.
- No render gate applies to this test-only QA hardening. No full video playback or audio listening was performed.


## 2026-11-20 — PR #100 merged; real-media test skipped, PR #101 corrects CI ordering

- PR #100 merged as `ad5746fbf07053116786b5d4c9c8c1a72137296a`; its CI #44654898138 and post-merge main CI #44662134081 passed.
- Inspected the actual PR #100 CI job log. `npm test` reported 216 passed and 1 skipped; subtest 57, the real MP4 delayed-audio integration test, was skipped because FFmpeg/FFprobe had not been installed yet. The workflow installed them only after `npm test`, so the green run did not exercise the integration test.
- PR #101 moves FFmpeg setup and verification before the test step and adds real MP4 silence integration cases through `inspectMedia`: 1.2s silence should be a warning and keep the report passed; 2.5s silence should be an error and fail the report.
- Manually generated and inspected the fixture recipes with local FFmpeg/FFprobe: warning case silence 1.215667s; excessive case 2.516979s. Both streams start aligned and video filters report no freeze/black intervals. This is fixture verification, not execution of the repository TypeScript tests.
- No render gate applies. No full video playback or audio listening was performed.


## 2026-11-20 — PR #101 merged; PR #102 real-video interval tests underway

- PR #101 merged as `a299ab13321df1399b3f7176292fb04d838ff211`. Exact-head CI #44662651944 passed on `8f4b2526dfe041e67693e85e3ae6e63da42459fb`; the job log explicitly reported 219 tests passed, 0 failed, 0 skipped. Post-merge main CI #44669560240 passed.
- Re-read `START_HERE.md`, PROJECT_STATE, ROADMAP, PROGRESS_LOG, AGENTS, README, agent README, production workflow and relevant Media QA, Visual QA, Remotion Producer and Creative Director skills. PR #101 is merged; no open PRs were present before PR #102 was created.
- Selected the next P0 QA gap: the report's freeze/black detections were unit-tested using synthetic FFmpeg logs, but lacked real MP4 integration tests exercising the actual `inspectMedia` pipeline and severity thresholds.
- PR #102 branch `test/media-qa-real-video-intervals` adds four generated MP4 tests for frozen-video and black-frame intervals: short warning/pass and excessive error/fail. Tests isolate the intended finding and verify continuous audio, aligned starts and duration drift below 0.5s.
- Manually executed fixture recipes with FFmpeg/FFprobe 7.1.5. Frozen segments measured 2.0s and 3.0s; black segments measured 0.8s and 1.4s; streams started at 0.000s and their durations matched. This verifies the fixture filters, not the TypeScript test pipeline.
- PR #102 is pending CI. No render gate applies; no full playback or audio listening was performed.


## 2026-11-20 — PR #102 merged; CI media-tool skip prevention (PR #103)

- PR #102 merged as `5483728b441847a7e9cd1ac7b7f659dc71d81dd6`. Exact-head CI #44669898766 completed successfully: 223 tests passed, 0 failed, 0 skipped. Its four real-MP4 tests cover short/excessive freezes and black intervals through `inspectMedia`, isolating the expected finding while asserting clean A/V timing and continuous audio.
- Post-merge main CI #44674647378 completed successfully on the merge commit.
- PR #103 introduces a shared media-test helper and pure skip-policy regressions. Local integration runs still skip when tools are unavailable unless required; CI sets `MEDIA_QA_INTEGRATION_REQUIRED=1`, which disables skips and makes missing FFmpeg/FFprobe fail with a clear message. This directly prevents the silent skipped-test issue discovered in PR #100 from recurring.
- Test-only changes require no render gate. No full render, playback or audio listening was performed.


## 2026-11-20 — PR #103 merged; render provenance manifest underway (PR #104)

- PR #103 merged as `d6e5314c320b01a24e8161f2ff59c7a313e03be3`. Exact-head CI #44675048271 passed on `58f13f776e989f0394f99e98821f7aac095919e7`: FFmpeg and FFprobe were verified before tests, `MEDIA_QA_INTEGRATION_REQUIRED=1` was present, and the suite reported 226 passed, 0 failed, 0 skipped. The validate job's remaining steps (example production-plan validation, preview generation, critic/risk reports, project validation and studio build) also passed.
- Post-merge main CI #44681010124 was in progress when this entry was written. PR #103 was merged only after exact-head validation and diff review; no render gate applies to the skip-policy hardening.
- Selected the next actionable P0 item: preserve traceable evidence for each GitHub Actions render. The existing artifact bundles MP4, Media QA JSON, contact-sheet image/report and optional credits, but lacks a source/request/run manifest and post-upload artifact identifiers in the run summary.
- PR #104 adds `scripts/render-provenance.ts`, `render:provenance`, tests for metadata/QA summaries and SHA-256 file evidence, a manifest in the render artifact, and a post-upload workflow summary with artifact ID, URL and digest. Documentation is reconciled to PR #103's verified state.
- This is render-workflow evidence tooling, not a new video-producing capability. CI tests the script/workflow changes; a subsequent render is still needed to verify the manifest against a real uploaded artifact. No render, playback or audio listening was performed during this work.


## 2026-11-20 — PR #104 provenance CI passed; merge review

- PR #98 is merged as `73807bad31f133a0a2819cdd084286903f963645`; required CI #44608513408 passed, and post-merge main CI #44620050018 passed. PR #103 post-merge main CI #44681010124 also passed on main commit `d6e5314c320b01a24e8161f2ff59c7a313e03be3`.
- PR #104 (`feat/render-provenance-manifest`) is based on that main commit. Exact-head CI #44695855199 passed on code head `78d58e5febe56f1b42be1215828fb932e52c3938`: 231 tests passed, 0 failed, 0 skipped; TypeScript type-check, project validation, examples/preview/risk steps and studio build passed. Reviewed the provenance script, tests and workflow wiring: required render/evidence files are hashed and sized; optional credits are included when present; the manifest is uploaded; the run summary records the post-upload artifact ID, URL and digest. The manifest intentionally does not include its own artifact ID.
- No render has exercised the provenance manifest. This remains workflow/code validation, not audiovisual acceptance. No full playback or audio listening was performed.
- Updated project state and roadmap to reflect the main CI success and PR #104 validation. This documentation commit requires a fresh CI run before merge.


## 2026-11-20 — PR #104 merged; strict render asset-evidence gate (PR #105)

- PR #104 merged as `dd25e95c7853bc298f744e3eb6b5e891a66a9eba`. Exact-head CI #44704302163 passed 231 tests, 0 failed, 0 skipped; post-merge main CI #44717786935 passed 231 tests, 0 failed, 0 skipped.
- Render run #44717916331 is in progress on `fix/render-provenance-benchmark-v5`; it uses the v5 request on the merged provenance code to validate the manifest on a real artifact. No artifact has been inspected yet.
- PR #105 (`feat/render-asset-evidence-gate`) adds a strict pre-render asset-evidence report for projects with a production plan and manifest, includes the report in upload/provenance, corrects the VALORANT benchmark SVG shot IDs and rights metadata, and adds a fixture regression that checks all criterion/asset links. CI and a render using the new gate are pending.
- The project regression stages placeholder files, so it validates mapping and metadata rather than media decoding or creative suitability. No full playback or audio listening was performed.


## 2026-11-20 — Render v5 provenance verified; QA findings

- Render run #44717916331 succeeded on `fix/render-provenance-benchmark-v5`. Artifact #14620562670 (`valorant-immortal-decision-making-v5`) was downloaded and inspected; the ZIP contains the 46,763,460-byte MP4, Media QA JSON, contact-sheet image/report and provenance manifest. ZIP SHA-256: `561a072317938846649988b74fc45f01a7a1ae6295b3e49e5023008dbc9053f0`. Artifact link: https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/44717916331/artifacts/14620562670
- Media QA passed: 1920×1080 H.264, 30 fps, 1,432 frames; AAC stereo 96 kHz; audio 47.856 s and video stream 47.733 s (0.123 s duration drift, 0 s start offset); no detected silence, freeze or black intervals; integrated loudness −16.0 LUFS and true peak −1.4 dBFS.
- The provenance manifest was verified against source commit `0189ca97c40d7a34447193ff46deb028c9781c34`, request ID `valorant-immortal-gameplay-integration-v5`, run #44717916331, file sizes/hashes, QA and contact-sheet samples. The upload digest and artifact ID/URL were recorded in the workflow summary.
- A 1-fps contact sheet (48 frames) was inspected. It shows real gameplay under persistent chapter-title overlays and six chapter transitions. This is not full video playback or audio listening; creative acceptance remains pending.
- **Duration defect:** the project and production plan specify 60 s (six 10 s scenes), but v5 is 47.856 s. The video stream is 47.733 s and the audio stream 47.856 s. Confirmed the cause: `scripts/apply-narration.ts` intentionally retimes the six scenes to the 47.33 s narration plus 0.40 s visual tail (47.73 s); `scripts/master-audio.ts` does not trim the video. The 60 s plan and narration disagree, so revise the narration/target duration and add an expected-duration gate. Do not claim the previous silence source is fixed; v5 simply reports no detected silence intervals.
- PR #105 adds the strict asset-evidence gate and corrected shot/rights mapping. Its Initial CI #44719406967 failed because the project production plan had no `acceptanceCoverage` (report returned `criteria-unavailable`). Six explicit criterion-to-shot mappings were added in commit `91faad30cfb1f2f8fd87a89865f896875b0a5688`; latest CI and render v6 validation remain pending. v5 predates the gate and therefore does not contain an asset-evidence report.


## 2026-11-20 — PR #105 merged; benchmark duration contract underway

- PR #105 strict pre-render asset-evidence gate merged as `3f3dd846e59a02c0d0f9101ced794ee87357d2e3`. Exact-head PR CI #44719701055 passed 233 tests, 0 failed, 0 skipped; strict-gate render #44719959584 succeeded and artifact #14622220762 was inspected. Evidence report: `ready`, 6/6 acceptance criteria linked, 18 assets, zero unresolved assets, missing files, unsafe paths, missing rights/provenance or reported issues. Provenance manifest includes report summary and hashes.
- v6 MP4 technical QA: 47.899s, H.264 1920×1080/30fps, AAC stereo, no detected silence/freeze/black intervals, −16 LUFS, −1.4 dBFS true peak, A/V duration drift 0.199s, start offset 0s. A 2-second sampled contact sheet was inspected: authentic gameplay is present, but large chapter-title overlays remain over gameplay; this may undermine footage readability. No full playback or audio listening was performed, so creative acceptance remains pending.
- Confirmed benchmark contract defect: production plan requests 60s across six 10s shots, but generated narration is about 47.33s. `apply-narration.ts` retimes all shots to narration + 0.40s, producing about 47.73s; mastering does not trim the video. This is a plan/narration mismatch.
- Created `fix/benchmark-duration-contract-v2` from merged main commit `3f3dd846e59a02c0d0f9101ced794ee87357d2e3`. The slice expands benchmark English narration to 169 words and makes Media QA compare final container duration to `delivery.durationSeconds` (default tolerance ±0.75s), with regression coverage proving v6-like 47.899s fails against 60s. Render workflow passes the plan path. A new render is required to verify actual TTS duration and calibrate the script; do not speed up or stretch narration to fake the target. The v7 render request is running as Actions run #44750655444.
- Main post-merge CI #44749739555 was queued at this entry. No open PRs remained after #105 merge.


## 2026-11-20 — Benchmark duration contract passed on render v7

- Branch CI #44750874075 passed on `d914fa18249c009cc449e7410f501ee0e866da72`: 234 tests passed, 0 failed, 0 skipped; TypeScript typecheck, project/storyboard validations, audio-preparation checks and studio build all completed successfully.
- Render v7 #44750655444 completed successfully from source commit `daf0922bc7e026254727b83b8c52cd6127342d8a`. All applicable steps passed: TTS generation/alignment, project validation, audio prep, strict asset-evidence gate, Remotion render, audio mastering, Media QA, contact-sheet generation, provenance manifest and artifact upload. Footage-credit and CircleCI steps were skipped by their existing conditions.
- Artifact #14636060983 (`valorant-immortal-decision-making-v7-duration-check`) is 52,240,849 bytes, digest `sha256:16ea43dc11127c653ddde8d649073725d0b50b9af77c127a5d3264b1f59492e4`, expires 2026-11-23. It contains MP4, QA JSON, contact-sheet JPG/JSON, asset-evidence JSON and provenance JSON. MP4 SHA-256: `c9eb091b7834bbcdcd55f1a5dd7bbf4eaa741ebc55948d5ffc1f0b3d913fc9c7`.
- Duration gate passed: MP4 container duration 59.300s versus plan 60s; absolute delta 0.700s is within ±0.750s. QA records the expected duration and tolerance. Video is H.264 1920×1080/30fps (1778 frames); audio AAC stereo 96kHz, 59.300s; A/V duration drift 0.033s; start offset 0s; no silence, freeze or black intervals; integrated loudness −16.0 LUFS and true peak −1.4 dBFS. Findings: none.
- Asset evidence is `ready`: 6 shots, 18 assets, 6/6 criteria linked, 0 missing files, unresolved references, unsafe paths, missing rights/provenance, warnings or errors. Provenance manifest hashes the MP4 and QA, contact-sheet and asset-evidence files.
- Inspected the 12-frame v7 contact sheet at 5-second intervals. It shows real supplied gameplay in all six chapters, but large chapter headlines remain overlaid on the footage. This is sampled visual review only; no complete playback or audio listening was performed. Creative acceptance remains open.
- Current development branch `fix/benchmark-duration-contract-v2` is based on main `3f3dd846e59a02c0d0f9101ced794ee87357d2e3`; the latest CI tested the implementation and the render v7 commit contains the render-specific code/config changes. No PR has yet been opened for this slice. Next priority is full audiovisual review and refinement of title hierarchy/timing and gameplay readability.


## 2026-11-20 — Technical render freeze and duplicate-request gate

- Root cause addressed: project commits were not the render trigger; changes to `render-request.json` were. The old render path validated request shape but did not require a frozen candidate SHA or reject repeat submissions of the same candidate.
- Added `scripts/render-candidate.mjs` and placed it at the start of the Render workflow, before dependency installation and Remotion. The request must specify `candidateSha` equal to the remote branch tip immediately before the request-only commit; the entire triggering push must change exactly `render-request.json`.
- The workflow fetches full history and rejects reused candidate SHAs or request IDs. Deterministic ordering means only the earliest of duplicate submissions can proceed. New-branch pushes are rejected. Added regression tests covering missing/mismatched SHA, mixed project/request pushes, duplicate candidates, duplicate IDs and initial branch pushes.
- CI passed: #44801247196 for PR #115 and #44801549483 for PR #116 (typecheck, test suite and studio build all succeeded). PR #115 targets `main`; PR #116 applies the same protection to the active Biceps production branch.
- The Biceps v10 request and its `render-request.json` were left untouched; this change did not trigger another render. Existing render run #44797815155 had already completed successfully.
- Limitation: a machine cannot infer whether a creative concept is artistically finished. The new gate guarantees a separate frozen candidate, checks the technical request boundary and prevents duplicate submissions; the agent's render-ready review and existing project/asset/media QA remain required.


## 2026-11-22 — Repository cleanup audit

- Audited the live `main` tree at `12d037f9d0382c302d069e9aa9104a2a8d2b2c77`: 232 tracked tree entries, 144 remote branches and seven open PRs.
- Kept all seven open PR branches untouched. No remote branches were deleted; merged/history branches still need individual ancestry and unmerged-work review before removal.
- Identified and retained the 10,530,125-byte VALORANT gameplay ZIP because `.github/workflows/render.yml` extracts it during the VALORANT render path. A future migration to Git LFS or external artifact storage must update and verify that workflow before removal.
- Retained `render-request.json` and `circleci-status-request.json`: they are deliberate GitHub Actions workflow triggers, not throwaway request files. The render request remains subject to the frozen-candidate, request-only commit rule.
- Found stale status statements in the roadmap/project-state docs and contradictory README claims about Kokoro text-to-speech. Refreshed the current snapshot, corrected those known stale claims, and added a documentation index.
- Preserved the chronological progress log and all production projects/assets. This audit did not delete application code or dependencies: static repository browsing alone is not sufficient evidence that a module or package is unused.
- Main CI run #45013735955 and PR #123 validation #45013634377 passed before this cleanup branch was created. The cleanup PR receives its own CI validation.

## 2026-11-22 — Second repository cleanup audit

- Started `chore/repository-cleanup-followup-2026-11-22` from live `main` after PR #124.
- Checked current package/workspace manifests, README and agent command references, CI, render workflow, source-of-truth docs and live open PRs.
- Verified the root's 28 npm scripts remain part of documented or automated workflows; did not remove any.
- Kept render request triggers, active project branches, production assets and full rendering/QA gates intact.
- Added `docs/REPOSITORY_CLEANUP_FOLLOWUP.md` with findings and explicit follow-up candidates.
- No code or dependency changes; no local CI/build/render execution in this connector-only session. Await GitHub PR CI for verification.


## 2026-11-22 — Shared retry-delay cleanup

- Inspected the full recursive source tree and traced the core animation, footage, narration, timeline and transition helpers to production/test references.
- Identified duplicated Retry-After parsing and bounded exponential backoff in the Wikimedia Commons and NASA video downloaders.
- Extracted only the pure delay calculation to `scripts/retry-delay.mjs`; kept the provider-specific request loops, timeouts, retry counts, cancellation, headers and URL checks unchanged.
- Kept existing exported retry-delay functions as wrappers with the exact prior Commons and NASA delay limits.
- Added tests for seconds/date parsing, provider-specific bounds, exponential fallback and invalid headers.
- Added `docs/REPOSITORY_CLEANUP_SOURCE_AUDIT.md`. Await CI before merge; local tests/build/render were not run in this connector-only session.


## 2026-11-22 — Source cleanup PR #126 merged

- Merged [PR #126](https://github.com/DarkonLikesCoffee/ai-video-studio/pull/126) as `21783b093029cb6c9ae688db4be33c415563f458`.
- The refactor extracts the shared Retry-After parser and bounded exponential-backoff calculation into `scripts/retry-delay.mjs`.
- Wikimedia Commons and NASA keep their separate delay bounds and existing exported wrapper functions. Request loops, timeouts, retry counts, headers, cancellation and URL allow-lists were unchanged.
- Added four direct unit tests. PR CI #45018775059 passed; post-merge main CI #45018877315 passed.
- Refreshed the verified current snapshot and roadmap. No production render was needed for this internal retry utility refactor.


## 2026-11-22 — Type-only dependency reclassified

- Identified `@types/three` under the video engine's runtime dependencies, unlike the other `@types/*` packages already under development dependencies.
- Moved only `@types/three` to `devDependencies`; retained `three` and all version pins unchanged.
- No runtime dependency, render path or production asset changed. Await the full CI job before merge.


## 2026-11-22 — Type dependency cleanup PR #128 merged

- Merged [PR #128](https://github.com/DarkonLikesCoffee/ai-video-studio/pull/128) as `6ea141c189d6406bb9648cd0dd45652c4ec5d702`.
- Moved `@types/three` from `packages/video-engine/package.json` dependencies to devDependencies, consistent with other `@types/*` packages in the workspace.
- Retained `three` as a runtime dependency; all dependency version pins remain unchanged.
- PR CI #45019205207 and post-merge main CI #45019314801 passed.
- No rendering workflow, composition, asset or render-request file changed.


## 2026-11-22 — npm workspace lockfile and reproducible installs (PR #131)

- Generated the real root `package-lock.json` through the existing Node 22 GitHub Actions CI install; lockfile version 3, 403 package/workspace entries, 194,120 bytes.
- Retrieved the generated bytes from the completed CI job log and committed them unchanged; no manual dependency resolution or lockfile editing.
- Switched CI, GitHub Actions rendering and CircleCI rendering to `npm ci`; added the lockfile to the npm cache key.
- Updated the README and agent instructions; added `docs/DEPENDENCY_MANAGEMENT.md` and indexed it in `docs/README.md`.
- No package.json dependency declarations or version ranges changed. No production render triggered. PR #131 requires a final full run using the committed lockfile before merge.


## 2026-11-22 — Lockfile-backed npm ci validation passed

- Final PR #131 CI run [#45020893580](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45020893580) passed on the latest code commit with the committed root lockfile.
- The workflow's `npm ci` install, Python narration tests, TypeScript check, full Node tests, example/production-plan/project validations and Studio build all passed.
- Compared root, Studio and video-engine manifest dependency/devDependency/optionalDependency declarations against their respective root lockfile workspace entries; there were no mismatches.
- Verified GitHub Actions CI, GitHub Actions rendering, CircleCI rendering and README clean setup use `npm ci`. The temporary lockfile export step is removed.


## 2026-11-22 — Reproducible npm installs PR #131 merged

- Merged [PR #131](https://github.com/DarkonLikesCoffee/ai-video-studio/pull/131) as `d4a2182cb2dc9a34f525ec203af9a24a07740a62`.
- Added the npm-generated root `package-lock.json` (lockfile v3; 403 package/workspace entries; 194,120 bytes).
- Switched GitHub Actions CI, GitHub Actions video rendering and CircleCI rendering to `npm ci`; added the lockfile to the CI npm cache key.
- Added `docs/DEPENDENCY_MANAGEMENT.md`, linked it from `docs/README.md`, changed the README's clean-install command to `npm ci`, and documented lockfile rules in `AGENTS.md`.
- PR CI #45021066792 and post-merge main CI #45021169591 passed. No dependency declarations, version ranges, runtime packages or production assets were changed.


## 2026-11-22 — GitHub Actions FFmpeg setup reliability (PR #133 merged)

- Replaced `AnimMouse/setup-ffmpeg@v1` in `.github/workflows/ci.yml` and `.github/workflows/render.yml`. The workflows now check for both `ffmpeg` and `ffprobe`, install Ubuntu's `ffmpeg` package only if either binary is unavailable, then verify both binaries.
- Root cause in main CI #639: the third-party setup action downloaded a response that was not an XZ archive, so the job failed before Node tests ran.
- PR #133 merged as `607518fccb4f5f80c9850d6d6081c4bc05561cb2`. PR CI #45034977395 passed 259 Node tests (0 failures, 0 skips); its logs confirm Ubuntu installed FFmpeg 8.0.1 and FFprobe. Post-merge main CI #45035118531 passed.
- The same fallback pattern is already used by CircleCI. The GitHub Actions render workflow was updated, but no production render was requested; render-time verification remains pending.
- No application code, project assets, dependencies or render requests changed.

## 2026-11-22 — Model-neutral assistant workflow clarified (PR #134 merged)

- Updated `AGENTS.md` and `START_HERE.md` so new assistants load the current project snapshot and only the roadmap, history, README sections and skills relevant to their task. Removed the previous requirement to read the full `PROJECT_STATE.md`, `ROADMAP.md`, `PROGRESS_LOG.md` and `README.md` at every startup.
- Clarified that `agent/skills/` and the shared production workflow are model-neutral guidance for ChatGPT, Claude and other assistants. The active assistant supplies creative reasoning; repository CLI scripts generate handoffs, validate artifacts, render deterministic projects and report checks, but do not call an LLM or autonomously direct a video.
- Corrected `.claude/skills/video-engine/PROJECT-INTEGRATION.md`: the repository has an optional Kokoro ONNX narration adapter on the GitHub Actions render worker for documented Spanish and US English paths. The upstream vendored skill was left unchanged; its ElevenLabs/Fish Audio examples are not configured project providers by default.
- PR #134 merged as `ce1dc23c1f80d1191272fc516fb517fa6428409c`. PR CI #45035261813 passed 259 Node tests (0 failures, 0 skips); post-merge main CI #45035430951 passed.
- No application code, LLM integration, model/API dependency, render engine, project assets or production renders changed. This improves assistant discoverability and removes incorrect documentation; it does not make the Creative Director autonomous.



## 2026-11-22 — Prevent repeated-scene/text-only videos (shot-differentiation gate)

- Root cause from the AURA benchmark failure: the project workflow guidance stated that shots should vary, but the implementation/QA handoff did not force a shot-by-shot proof. A custom composition could reuse one scene, camera and object animation while text changed, and this could still reach render/delivery.
- Added `agent/skills/shot-differentiation/SKILL.md`: mandatory shot cards, adjacent-shot contrast, minimum meaningful variety, implementation-to-source audit, pre-render rejection checklist and post-render failure rule.
- Linked the new contract from Remotion Producer, Visual QA, `docs/agent-production-workflow.md`, `START_HERE.md` and `AGENTS.md`. Future assistants are instructed to stop before rendering if adjacent shots are not visually distinguishable without text; final MP4 repetition is a major failure.
- Limit: this change is an explicit process gate, not automated semantic frame-difference detection. CI passing does not prove the video has creative variety. The actual MP4 must still be inspected.


## 2026-11-23 — Machine-readable production state merged (PR #143)

- Merged [PR #143](https://github.com/DarkonLikesCoffee/ai-video-studio/pull/143) as `c09a4db22b323ca7acc6373c8635fc9a33e29e21`.
- Added an optional `production/production-state.json` contract with 11 ordered stages, project identity, timestamp and stage-keyed evidence references; added a structural validator, six tests and usage documentation.
- The first CI attempt found an `exactOptionalPropertyTypes` error when the CLI passed `expectedProjectId: undefined`. The CLI was corrected to omit the optional property. Final exact-head CI [#45159548730](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45159548730) passed TypeScript, full tests, the state-validator test step, project/storyboard validations and the Studio build. Post-merge main CI [#45160123155](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45160123155) passed.
- The validator remains opt-in. It checks the shape and presence of evidence references but does not prove that files exist, assets were visually inspected, or a final MP4 was watched. No existing project was migrated and no render request was changed.

## 2026-11-23 — Composition identity preflight (PR #144 in progress)

- Opened draft [PR #144](https://github.com/DarkonLikesCoffee/ai-video-studio/pull/144) on `fix/composition-identity-gate`.
- Moved the capability catalogue to `schemas/composition-registry.json`, shared by the Director's TypeScript logic and the dependency-free render preflight.
- Strengthened preflight to require exact, unique ID parity between RemotionRoot and the catalogue; reject unknown and reference/test-only composition IDs; validate renderer, availability, rationale, capabilities and fallback; and require render-request identity to match the plan's selectable registry entry.
- Added optional `productionPlanPath` for custom compositions without a separate props file, plus regression tests for paths, catalogue parity, test-only selections, renderer mismatches and a new composition that must be registered in both places.
- Updated the workflow guide and documentation index. No render request was edited and no production render was triggered.
- Latest branch head at this entry: `0fcb3e1be005f8857f538f9f8f8c30d0d1044944`. GitHub Actions CI for that exact head is running; do not treat the slice as complete until it passes.



## 2026-11-23 — Stormlight Keeper integrated with current composition registry

- Rebuilt the Stormlight Keeper feature on top of the current main after PR #144 introduced the canonical shared composition catalogue and strict RemotionRoot/catalogue ID parity. Added `LighthouseRepairFilm` to both RemotionRoot and `schemas/composition-registry.json`.
- Preserved the dedicated Remotion component, ten SVG studies, six-shot production plan, scene metadata, local asset manifest, audio generator and SVG preview workflow. Added CI checks for production-plan validity, storyboard risk, generated audio duration and strict local asset evidence; added the headless custom-render branch and the SVG preview npm script.
- Deliberately did **not** carry over the feature branch's `render-request.json` or lockfile newline-only edit. Render request 03 already ran on the feature branch; copying that request into main would create an unintended render trigger.
- Verified render run [#45072523096](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45072523096), request `stormlight-keeper-20261122-svg-render-03`, source `98354d6c1f0b58c6cd138a676cab3007bba45e19`. Artifact #14773409887 passed technical Media QA at 24.000 s, 1920×1080, 30 fps, H.264/AAC stereo; no silence, freeze, black-frame or A/V-sync findings. Strict asset evidence reported 6/6 criteria linked, 12 manifest entries, no missing files, rights/provenance gaps or unresolved references.
- Inspected the final artifact's 1-fps contact sheet. It shows six distinct visual setups and changes in the robot, door, mechanism, lens and beacon beam. This is sampled inspection only; the full MP4 was not watched end-to-end and the audio was not listened to. The visual language is restrained flat vector illustration, not realistic 3D.
- Clarified that the ten SVGs are design references, not imported runtime image assets: `LighthouseRepairFilm.tsx` reconstructs the selected artwork as animated inline SVG groups and paths. Their manifest entries now identify `usageRole: design-reference`; the score and atmosphere WAVs are runtime audio. The asset-evidence report checks file presence/metadata/linkage, not source-code usage.
- No render request was modified and no production render was triggered on main as part of this migration.


## 2026-11-23 — Jumping Cat composition integrated with canonical registry

- Rebuilt the Jumping Cat feature on current main following the shared composition-registry migration. Registered `JumpingCat` in both `packages/video-engine/src/root.tsx` and `schemas/composition-registry.json`; the typed Director continues to consume the JSON source.
- Preserved the dedicated 2D vector/inline-SVG character scene, 20-second production plan and acceptance coverage, creative brief, empty asset manifest (no external image assets), and generated 20-second wind ambience.
- Added CI plan/storyboard checks and verification that the generated wind WAV exists and is exactly inspectable by FFprobe. Added a production handoff README explaining the composition and future explicit `productionPlanPath`.
- The original feature branch's render request is intentionally excluded. No MP4 render is claimed or triggered by this migration; a render request must be a separate frozen-candidate commit with a unique ID.
- No standalone SVG files are required: the cat, meadow and grass are procedurally drawn as inline SVG geometry in the dedicated Remotion composition.


## 2026-11-23 — Tiny Astronaut mainline migration and render audit

- Rebuilt the Tiny Astronaut feature on current main after the canonical composition registry was introduced. Added `TinyAstronautCrystalCave` to both RemotionRoot and `schemas/composition-registry.json`; added a structured, frame-aligned production plan with seven acceptance criteria and seven criterion-to-shot mappings.
- Preserved the five-step visual storyboard, creative brief, five-frame still-preview script and iterative 3D visual-review record. CI renders the five actual composition stills on the GPU-less runner using software WebGL and validates the production plan/storyboard. The render workflow now uses `--concurrency=1 --gl=swangle` for custom 3D compositions while keeping ProjectVideo unchanged.
- Inspected the previous full MP4 from render run [#45059287954](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45059287954), artifact #14768559764. The MP4 is 20.000 s, 1920×1080/30 fps, H.264, with no audio stream. The original QA failed because the then-current policy treated intentional silence and a 2.87-second freeze finding at 3.0 s as hard errors. PR #146 has since made missing audio and freeze findings informational; black-video remains a hard error.
- Inspected the 1-fps contact sheet. The exterior-to-cave story beats are distinct, the crystal is readable and its final glow changes the cavern lighting. The landing pause appears intentional and will not be animated artificially just to satisfy a static-frame detector. This is sampled inspection, not full MP4 playback.
- Source inspection found a real defect in the previous MP4: between frames 270–299 the planetary astronaut layer and cave-approach layer were both rendered, producing a duplicate-looking astronaut during the scene handoff. Added `getAstronautLayerVisibility` with exclusive phase ranges (planet 90–269, cave approach 270–429, crystal awakening 430–599) and tests that verify every frame 0–599 has the intended number of active layers and the exact boundaries.
- No new render request has been created and no render has been triggered on main. The duplicate-layer correction, structured plan and current-main migration require exact-head CI and then a new frozen-candidate render before final creative acceptance.


## 2026-11-23 — Golden Hour mainline integration and QA-policy migration

- Rebuilt Golden Hour on top of current main after the composition-registry, production-state and media-QA changes. The video uses the already registered `ProjectVideo` composition; no new renderer or composition ID was introduced.
- Preserved the 20-second four-scene ProjectVideo source and its four original full-frame SVG illustrations. Added a structured production plan with four shots/five acceptance criteria and an asset manifest covering the SVGs plus the runtime score and transition whoosh WAVs.
- The original feature branch's render workflow stages `projects/sora/assets/audio/score.wav` and `projects/showcase-motion/assets/audio/transition-whoosh.wav` into the project. The current-main migration preserves that staging and adds CI checks for plan/schema validation, storyboard QA, ProjectVideo validation, audio preparation and strict asset evidence.
- Inspected prior render run [#45045569904](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45045569904): the MP4 was 20.10 s, 1920×1080/30 fps with AAC stereo. The old QA failed only on silence intervals of 2.83 s at 11.97 s and 4.09 s at 16.01 s. PR #146 now keeps silence findings informational; this does not imply the audio has been listened to or creatively accepted.
- Deliberately did not carry over the old branch's `render-request.json` edit. This migration does not trigger or claim a new production render. The next render, if requested, must use a new frozen candidate and a separate request-only commit.
- Latest migration head at this entry: workflows have been updated on `feat/golden-hour-mainline-v2`; exact-head CI and pull request are pending.


- **Golden Hour visual review:** sampled the previous MP4 at 1 fps (20 frames). The four environments are distinguishable and the man/dog motifs are visually consistent, but the people/dog are embedded in static SVG plates; motion comes mainly from camera transforms, particle systems and scene transitions. The plan now describes this accurately. No full video playback or audio listening was performed; creative acceptance remains pending.

## 2026-11-23 — Full-video playback evidence merged and final delivery gate in review

- Merged PR #155, `Require hash-bound playback evidence for full-video review`, as `bd5f2066de7aad81262191580ec117c9ed9eb714`. The post-merge main CI [#45224183986](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45224183986) passed.
- The local player/importer records playback against the selected MP4 hash and measured duration, including continuous played ranges, start/quarter/half/three-quarter/end checkpoints, 1× playback, visibility/focus and the native ended event. The importer does not approve the video. The session JSON remains editable telemetry, not signed evidence of reviewer identity.
- Opened PR #156, `Gate final video delivery on approved review and exact artifact evidence`. Its implementation-only head first reached `884832a83278fbf8b3e581993738f01330dd4b5a`; the same branch was then updated with the verified-state documentation.
- The PR adds a manual final-delivery workflow. It confirms the selected run is a successful execution of the Render video workflow, downloads the artifact from that exact run, checks the committed schema-v3 approval report, verifies the final MP4 hash against review/provenance, validates technical Media QA and contact-sheet duration, verifies each provenance-listed artifact hash, and accepts only ready or explicitly not-applicable asset evidence.
- Visual approval now requires an explicit audio decision. `listened` requires reviewer/time/rationale; `not-listened` requires a reason; `not-applicable` is only valid when Media QA shows no audio stream. The final receipt records the declared decision and limitations honestly.
- The gate writes `<outputName>.delivery.json` and uploads a separate final package only after validation. Render review artifact retention was increased to 30 days to provide an approval window.
- Exact-head push CI [#45228924930](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45228924930) and PR CI [#45228940745](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45228940745) passed: 331 tests, 0 failures, 0 skips, plus typecheck, project/storyboard checks and Studio build.
- Several early CI runs exposed strict optional-property typing, missing review-report fixtures and a stale error-message expectation; these were fixed. A symlinked-artifact regression test was added to ensure the report-copy step cannot overwrite another artifact file.
- After the documentation-only state refresh, final exact-head push CI [#45230032176](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45230032176) and PR CI [#45230048779](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45230048779) also passed all 331 tests with 0 failures and 0 skips.
- Merged PR #156 as `87d794b1f08306e9e585f6e784e85136d8e3cbef`. Post-merge main CI [#45230712726](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45230712726) passed.
- The manual workflow has not been dispatched because no new real approved render was part of this infrastructure change. Do not claim the final delivery path has been exercised with an actual production video until that end-to-end run is performed.
- No render request was modified and no production render was triggered by PR #156.


## 2026-11-23 — Custom Remotion asset-reference audit merged (PR #163)

- PR #163, **Tighten custom Remotion asset usage evidence**, merged into `main` as `f51ff459b1df2445b75cd140ce93e350ea37532f` (squash merge).
- Exact PR-head CI run [#45250261362](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45250261362) completed successfully: 52 workflow steps passed on commit `3493da553d7bbdcb182ca0d99286813b74575534`.
- The audit recognizes statically resolvable Remotion `staticFile()` references (named/namespace imports and local constants), imported media files, static `new URL()` media references, and JSX/JSON `src`/ `poster` values in the selected component's reachable local import graph.
- Arbitrary string literals used only as title/copy/labels no longer count as proof of required asset usage. Regression tests cover string-copy false positives, imported media files and JSON media fields.
- Scope remains limited: this is source/data-reference evidence, not proof that an asset is visible or semantically appropriate in rendered pixels. Custom Remotion shot-to-shot structural placement is now audited through PR #166's `shotComponents` contract; rendered-pixel visibility and semantic suitability remain unverified.
- No production video render was triggered.


## 2026-11-23 — Custom Remotion shot-level asset mapping merged (PR #166)

- PR #166, **Verify custom Remotion assets in assigned shots**, merged into `main` as `3f1cd4617006181efbab3dd4776626b2e85d22fb` (squash merge).
- Exact-head CI run [#45255251121](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45255251121) completed successfully on head `be49ead78093ed3d8f7577f55312d006fa687df3`: all 53 workflow steps passed, including type-check, the full unit suite, example/project validations, Storyboard QA, the Stormlight shot-mapping fixture and global audio checks, and the Studio build.
- Added a manifest-level `shotComponents` schema v1 contract mapping every production-plan shot to reachable source-module paths in a custom Remotion composition. The audit checks each required visual asset only against the modules mapped to each assigned shot.
- Invalid/missing/unknown/unsafe/unreachable mappings block strict evidence. Legacy custom manifests without the contract remain explicitly `not-audited`. Required audio remains composition-wide/global.
- Updated the Director prompt, Asset Producer skill, production workflow docs, Stormlight Keeper manifest and CI.
- Evidence boundary remains: module-level source association does not prove visible pixels, semantic suitability, prominence or intended timing. Stormlight's existing standalone SVG studies remain reference-only; no false runtime usage claim was introduced.
- No production video render was triggered.


## 2026-11-23 — Production-state evidence files verified (PR #168)

- PR #168, **Verify production-state evidence files**, merged into `main` as `daa8980ad2a9342baf25413854caf53d96a967be` (squash merge).
- Exact-head CI run [#45256848775](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45256848775) completed successfully on head `3d21cf7e15aa164e33720b6e915d6b184fa2357e`: all 53 workflow steps passed, including TypeScript, the full test suite, production-state tests, project and asset-evidence validators, and the Studio build.
- Added opt-in `--verify-evidence-files --project-root projects/<slug>` validation. Each recorded stage evidence reference must resolve to a non-empty regular file within the specified project root.
- Rejects absolute paths, Windows separators, traversal, empty/dot path segments, directories, symbolic links and project roots outside the repository. Existing structural/reference-presence-only validation remains backward compatible; adoption remains opt-in.
- File existence is not content validation, provenance, freshness or creative approval. The state file still is not required by render preflight.
- No production render or `render-request.json` modification was performed.


## 2026-11-23 — Continuity snapshot synchronized (PR #169)

- PR #169 merged as `9e5bf07f6f71531ad41e2f82a04dfeeb4259bd39`.
- Exact-head CI [#45257516309](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45257516309) passed all 53 workflow steps, including type-check, full tests, project and asset-evidence validation, preview artifact generation and Studio build.
- Refreshed the project state and roadmap for PR #168's strict production-state evidence-file check, corrected the historical custom Remotion shot-mapping status, and recorded the PR #168 implementation baseline and PR #169 current-main documentation tip.
- No production video render was triggered.
