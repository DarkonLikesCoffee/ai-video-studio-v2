# AI Video Studio — Project State

## Current verified snapshot — 2026-11-23

- **Main implementation:** `daa8980ad2a9342baf25413854caf53d96a967be` (PR #168); **current main after continuity refresh:** `9e5bf07f6f71531ad41e2f82a04dfeeb4259bd39` (PR #169). PR #168 exact-head CI [#45256848775](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45256848775) passed all 53 workflow steps on head `3d21cf7e15aa164e33720b6e915d6b184fa2357e`. PR #169 docs CI [#45257516309](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45257516309) passed all 53 steps. PR #166 custom shot-mapping CI [#45255251121](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45255251121) passed all 53 steps.
- **Production-state handoff:** PR #143 added `scripts/production-state.ts` with 11 ordered stages from `brief` through `delivered`. PR #168 adds opt-in `--verify-evidence-files --project-root projects/<slug>`: it resolves stage evidence references as non-empty regular files within the project root and rejects absolute/traversal paths, empty/dot segments, symlinks, directories and a project root outside the repository. It preserves the legacy structural/reference-presence mode; both modes remain opt-in. File existence is not proof of content quality, recency or creative approval. PR #168 exact-head CI [#45256848775](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45256848775) passed all 53 workflow steps.
- **Composition identity:** PR #144 is merged. `schemas/composition-registry.json` is the shared composition catalogue; render preflight enforces unique ID parity with RemotionRoot, selectability, composition/renderer metadata and plan/request agreement.
- **Audio and visual QA:** PR #150 added explicit audio QA modes. PR #151 added structured per-render visual-review reports; PR #152 validates findings, corrections, approval conditions and exact-artifact review evidence. PR #158 adds per-visual-asset preview and approval evidence; audio assets are correctly exempt from visual review.
- **Correction/re-render workflow:** visual-review history carries rejected findings and correction IDs forward, checks that fixes are in the frozen candidate, requires a changed MP4 hash and binds correction verification to the new render.
- **Render-path separation:** PR #154 introduced explicit `2d`, `3d` and `hybrid` rendering paths so SVG-only renders do not receive unnecessary WebGL flags.
- **Full-video playback evidence:** PR #155 merged as `bd5f2066de7aad81262191580ec117c9ed9eb714`. The local review player records MP4 hash, duration, playback coverage, checkpoints, playback rate, visibility/focus and native end-event evidence. The importer binds this telemetry to the report's current MP4. It is editable telemetry, not signed identity attestation.
- **Final delivery gate:** PR #156 merged as `87d794b1f08306e9e585f6e784e85136d8e3cbef`. It adds a manual release workflow, successful Render-run verification, a final package validator and a `.delivery.json` receipt. It requires an approved schema-v3 visual review, matching MP4/provenance hashes, passing Media QA, valid contact-sheet evidence, ready/not-applicable asset evidence and an explicit audio-review decision. The manual delivery workflow has not yet been run against a real approved render.
- **Composition-wide asset usage:** PR #159 merged as `b17722dc9293291cdeeceffd5b509220b0871c95`. Asset manifests can declare `required`, `optional` or `reference-only` reuse policies. Strict evidence checks exact, case-sensitive project-relative media/audio paths in ProjectVideo scene data or follows the selected custom Remotion component's local import graph. PR #163 merged as `f51ff459b1df2445b75cd140ce93e350ea37532f` tightens custom Remotion evidence: it recognizes statically resolvable Remotion `staticFile()` calls (including aliases/namespaces and local constants), local media imports, static `new URL()` media paths, and JSX/JSON `src`/`poster` media fields in reachable modules; unrelated text/title/label strings do not count. Exact-head CI #45250261362 passed all 52 steps. This remains static source/data-reference evidence, not proof of visible use in rendered pixels or semantic suitability.
- **Shot-level asset usage:** PR #161 merged as `9e321ca12d9ffd075dcf29ef48f012bbfc2391e5` and requires each required visual asset in every assigned ProjectVideo scene; `all` requires every planned shot. PR #166 merged as `3f1cd4617006181efbab3dd4776626b2e85d22fb` adds custom Remotion `shotComponents` schema v1: each production-plan shot maps to one or more repository-relative source modules reachable from the selected composition. Required visual assets are checked only against references in the mapped module(s) for every assigned shot; unknown/missing shot mappings, invalid/unsafe paths and unreachable modules produce blocking evidence errors. Legacy custom manifests without a map remain explicitly `not-audited`; required audio remains composition-wide and excluded from per-shot placement. This proves source/module association, not rendered-pixel visibility, semantic suitability, prominence or intended timing. PR #166 exact-head CI [#45255251121](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45255251121) passed all 53 workflow steps, including a real Stormlight Keeper six-shot module-map fixture and global audio checks. Golden Hour remains a real ProjectVideo fixture with six required assets: four visual assets verified in assigned scenes and two global audio assets.
- **Documentation/roadmap synchronization:** PR #160, PR #162, PR #164, PR #167 and PR #169 refreshed this snapshot. PR #169 records PR #168's strict evidence-file verifier, updates the current main reference and corrects the earlier shot-mapping status.
- **Open pull requests:** verify the live repository before relying on this line; this snapshot is refreshed independently from PR activity.
- **Reproducible installs:** the root `package-lock.json` remains npm lockfile v3. CI, GitHub Actions renders and CircleCI renders use `npm ci`.
- **Workflow control files retained:** `render-request.json` triggers video rendering and must only change through the frozen-candidate protocol. `circleci-status-request.json` triggers the CircleCI status workflow. Neither is disposable.
- **Product boundary:** the Creative Director remains a model-led, external-assistant workflow; the repository has no embedded autonomous LLM or automatic semantic video-understanding model. Validators enforce structural/evidence contracts, not artistic quality.

Older entries below are dated history. Their phrases such as “pending”, “in progress” or “current branch” describe the state at the time they were written, not today's live repository state.

## 2026-11-22 — Creative Director storytelling handoff strengthened (PR #123 merged)

- PR #123 merged as `12d037f9d0382c302d069e9aa9104a2a8d2b2c77`.
- The model-neutral storyboard handoff now requires comparison of distinct creative territories, an evolving visual grammar, and shot-level visual events that do not merely swap text, colors or backgrounds.
- Updated the Creative Director skill and production workflow guidance; added prompt-contract regression tests.
- PR CI [#45013634377](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45013634377) and post-merge main CI [#45013735955](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45013735955) completed successfully, including tests, typecheck, validation and Studio build.
- This was a planning/documentation/test change. No video render was requested, and it does not make the Director autonomous.

## 2026-11-21 — Explicit Director composition selection (PR #121; CI and representative render passed)

- Started clean development branch `feat/director-composition-selection-final` from the tested Director implementation. The PR excludes the temporary render request; the smoke render was run from a separate branch.
- Added a model-facing catalogue of the compositions registered in RemotionRoot, with purpose, strengths, limitations and selectability. Reference/test-only compositions cannot be selected for production.
- Added a required plan-level `renderStrategy`: renderer, whole-video composition ID, registered/to-be-built status, rationale, required capabilities and fallback. This is separate from per-shot `visualMethod`.
- Wired the catalogue into the model-neutral storyboard prompt; production-plan schema, importer and runtime validator now preserve and validate the decision.
- Added pre-render enforcement: the requested composition must exist in RemotionRoot and match the adjacent production plan's registered renderer/composition. Legacy projects without plans still receive composition-registration validation.
- Updated four example plans: NarratedSkyExplainer for the narrated sky example; ProjectVideo for legacy SORA and VALORANT examples with explicit rationale; ProductRevealFilm marked `to-be-built` for the generic 3D product sample.
- Added five explicit acceptance-criterion-to-shot mappings to the SORA production plan. This fixes a pre-existing evidence gap without weakening the strict asset-evidence gate.
- Updated the Creative Director and Remotion Producer skills, agent workflow, roadmap, project state and progress log. Only the composition catalogue/selection/enforcement slice is complete. The broader autonomous AI Production Director remains unfinished; ChatGPT or another external LLM still makes creative decisions.
- PR #121: https://github.com/DarkonLikesCoffee/ai-video-studio/pull/121. Current PR head before this documentation update: `dd90fe01cb3857e39e009e3d0dfcff257e0f5008`.
- CI runs #44920371134 and #44920356458 passed on that head: 254 tests passed, 0 failed, 0 skipped; Python narration tests, type-check, example plan/project validators, storyboard QA/preview/critic, audio checks and Studio build passed.
- Representative SORA render #44920489901 passed on the exact frozen project candidate `dd90fe01cb3857e39e009e3d0dfcff257e0f5008` using `ProjectVideo`. The frozen-candidate guard, render-request validator and new Director composition gate all passed. Strict asset evidence reported `ready`: 4 assets, all 5 criteria linked, no missing files/rights/provenance and no issues.
- Retrieved and inspected artifact #14712604149 (`director-composition-selection-sora-verified`). MP4: 1920×1080, 30fps, 360 frames/12.0s H.264; AAC stereo 48kHz, 12.1s container duration. Media QA passed with zero silence/frozen/black intervals, A/V duration drift 0.10s, start offset 0s, loudness -15.8 LUFS and true peak -7.9 dBFS.
- Visual inspection of a 1-second-per-frame contact sheet confirmed four distinct asset/shot designs, but also showed the repeated editorial title/eyebrow layout and relatively restrained within-scene movement of the legacy ProjectVideo renderer. This render verifies the selection and render path; it does not prove cinematic creative quality or that the broader Director now chooses custom compositions well.
- Audio was measured by Media QA but was not listened to in this inspection.
- The earlier failed smoke request stopped at the strict asset-evidence gate because SORA lacked `acceptanceCoverage`; no MP4 was produced by that attempt. The corrected, separate smoke request succeeded. Superseded PR #120 is closed; PR #121 later merged as `8475fef02486878d2096cf34e07deda672456b02`.


**Historical snapshot recorded:** 2026-11-21 (superseded by the current snapshot above).  
**Repository:** `DarkonLikesCoffee/ai-video-studio`  
**Default branch:** `main`  
**Main commit recorded in that historical snapshot:** `c148c3002f8364926ad7a71e870ea41411aa5c56`.  
**Development branch recorded in that historical snapshot:** `feat/director-composition-selection-final` — PR #121 was still open at that time; it has since merged.

PR #105 added the strict production asset-evidence gate and merged as `3f3dd846e59a02c0d0f9101ced794ee87357d2e3`. Its exact-head CI #44719701055 passed 233 tests with 0 skipped. Render v6 (#44719959584, artifact #14622220762) proved the gate reports `ready` for the benchmark: 6/6 acceptance criteria linked, 18 assets, and zero unresolved refs, missing files, unsafe paths, rights/provenance gaps or issues.

The current branch fixes the previously verified 60-second plan versus 47.899-second render mismatch. It expands the English narration to 169 words, adds a configurable hard duration check to Media QA, passes the production plan into render QA, and enables CI on `fix/**` and `feat/**` branches. Branch render v7 (#44750655444) completed successfully. Artifact #14636060983 (`valorant-immortal-decision-making-v7-duration-check`, 52.2 MB) includes the MP4, QA report, contact sheet, asset evidence and provenance manifest. QA passed at 59.30 s against the planned 60 s (±0.75 s), with no silence, freeze or black-frame findings; A/V duration drift is 0.033 s, start offset 0 s, loudness −16.0 LUFS and true peak −1.4 dBFS. The artifact digest is `sha256:16ea43dc11127c653ddde8d649073725d0b50b9af77c127a5d3264b1f59492e4`.

The v7 contact sheet was inspected at 5-second intervals (12 sampled frames). It shows the supplied gameplay clips across all six chapters, but large chapter headlines remain overlaid on gameplay. This is evidence of scene coverage, not full playback or listening; creative acceptance remains open pending a complete audio/video review and likely typography/pacing refinement.

> This is a snapshot. Always verify the live repository, open PRs and workflows before relying on it.

## 2026-11-20 — Render-request freeze gate (PR #115 merged)

PR #115 is closed/merged at `c148c3002f8364926ad7a71e870ea41411aa5c56`; its freeze gate is now in main. PR #116 is also recorded as merged by GitHub, but the live `main` ref was still `c148c3002f8364926ad7a71e870ea41411aa5c56` at the start of the next development session, so verify the branch ref before assuming its merge is present.

The render workflow now runs `scripts/render-candidate.mjs` before dependency installation and Remotion. A valid request must carry `candidateSha` equal to the exact remote branch tip before the request-only commit; the triggering push must modify only `render-request.json`. Full Git history is fetched and duplicate candidate SHAs / request IDs are rejected deterministically. Regression coverage is in `tests/render-candidate.test.ts`. The gate prevents development pushes and duplicate submissions from reaching Remotion; it does not itself judge creative quality, so the existing production-readiness checklist and project/media QA remain necessary.

## 1. Product vision

AI Video Studio should let someone describe a video in ordinary language and receive a finished, high-quality MP4 without manually editing it.

The system should act like a coordinated production team:
- Understand the prompt, audience, purpose, constraints and references.
- Develop the concept, script, visual direction and shot-by-shot storyboard.
- Find, generate or import suitable footage, images, illustrations, 3D elements and audio.
- Edit shots with purposeful camera movement, compositing, animation, transitions and pacing.
- Produce or source narration, music, ambience and synchronized sound effects.
- Render the project, inspect the real video and audio, identify defects, revise and render again.
- Deliver the final MP4 plus source/project files and asset credits.

It must support many topics and visual styles, not just a fixed set of templates or demos. A successful render is not the same as a successful video.

## 2. Architecture that exists

The repository is a TypeScript/Node project using npm workspaces. The rendering engine is based on Remotion, with FFmpeg for audio preparation/mastering and a separate Three.js/custom-composition path for selected showcase work. GitHub stores source and project files; GitHub Actions (and a CircleCI configuration) execute renders. The README says no separate web application is required for the prompt-driven workflow.

Main areas:
- `packages/`: shared video engine and project/render logic.
- `apps/`: application code.
- `projects/`: examples, showcase projects and recent video projects.
- `agent/skills/`: production playbooks for creative direction, storyboard, assets, Remotion, audio, visual QA and narrated video production.
- `docs/agent-production-workflow.md`: manual/agent-led production pipeline.
- `.claude/skills/video-engine/`: vendored video-engine skill and integration notes.
- `.github/workflows/`: CI and render automation.
- `render-request.json`: selects the current requested render; inspect before using because it is mutable.

## 3. Verified engine capabilities

The current README documents these `ProjectVideo` capabilities:
- Data-driven multi-scene projects (1–20 scenes) and 1080p/other configured dimensions and FPS.
- Local or remote image/video layers, multiple layers per scene, positioning, cropping/fit, opacity, rotation, trim and playback controls.
- Vector graphics (rectangles, ellipses, SVG paths and text), keyframed transforms, SVG path draw-on and constrained path morphing.
- Deterministic particle systems.
- Scene transitions (cut, fade, slides, zoom and wipes).
- Timed subtitle/caption cues.
- Global overlapping audio tracks for music, voice-over, SFX and ambience.
- Audio fades, automation, filters, EQ, compression, echo/reverb, panning, music ducking and loudness mastering.
- MP4/H.264 rendering and project validation.

Other implemented pieces documented in the repository:
- Kokoro ONNX narration adapter on the GitHub Actions render worker for Spanish and US English. Its generated speech alignment is used for word timings. It is not a general hosted TTS provider system and does not force-align arbitrary uploaded recordings.
- Openverse still-image discovery/download workflow for selected open licenses. Candidate results require human/agent review and are not automatically approved.
- Wikimedia Commons video discovery/download helper with license/provenance checks. Candidate results require review.
- NASA Image and Video Library asset-manifest workflow with HTTPS host/rendition/size checks and provenance records.
- Custom Remotion/Three.js showcase compositions and project-specific examples.

Treat README, source code, tests and current workflows as authoritative. Verify any specific limits or behavior in code before depending on them.

## 4. What is not yet a complete product capability

The repository is **not yet a fully autonomous prompt-to-video AI product**. In particular, do not claim these are solved:
- A persistent, generally available LLM director that reliably turns arbitrary prompts into production-ready projects without manual orchestration.
- Universal generative video/footage creation or automatic access to premium video-generation models.
- A general-purpose image/video/3D asset generation service with style/character consistency.
- A mature universal 3D scene-authoring system for arbitrary prompts and imported user models.
- A polished end-user workflow for importing, organizing and managing arbitrary personal assets.
- A provider-agnostic voice system with broad language/voice selection and reliable alignment for arbitrary recordings.
- Fully automatic semantic video/audio QA that can reliably judge any rendered video and autonomously repair it.
- A production-ready end-user web product for the entire workflow.
- Permanent hosted video delivery, publishing or distribution workflow.

Some related pieces exist as manual scripts, examples, playbooks or limited adapters. Do not confuse those with end-to-end product capabilities.

## 5. Recent merged visual strategy reports (PRs #81–#82)

- `npm run storyboard:strategy -- production-plan.json` creates a review-only Markdown report of visual-method counts, existing storyboard risk signals and shot-specific alternatives.
- Add `--json` to emit a versioned JSON envelope (`schemaVersion`, `reportType`, `planTitle`, `report`, `generatedBy`), with optional output file, for agent/workflow consumption.
- Alternatives are deterministic mappings from QA finding codes. They are prompts for creative revision, not semantic judgments or automatic plan edits.
- PR #81 and #82 CI passed; main CI for merge commit `25e94604` passed.

## 6. Historical end-to-end test: VALORANT explainer

Project: `projects/valorant-immortal-decision-making/`  
PR #50: https://github.com/DarkonLikesCoffee/ai-video-studio/pull/50  
Alignment fix PR #52: https://github.com/DarkonLikesCoffee/ai-video-studio/pull/52  
Successful render run: https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/44360142074  
Main CI: https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/44362063980  
Main render workflow: https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/44362064050

What was verified:
- The Kokoro narration alignment bug was fixed in PR #52; the earlier mismatch between written words and phoneme groups was resolved with regression coverage.
- The branch render completed and produced an MP4 artifact.
- The MP4 was retrieved and inspected. It is approximately 60.1 seconds, 1920×1080, 30 FPS, H.264 with AAC stereo audio, around 7.16 MB.
- The rendered project uses original tactical SVG/motion graphics and English narration. No authentic VALORANT gameplay footage was supplied; the diagrams are illustrative, not gameplay.

Creative QA result: **not accepted as a successful cinematic explainer**.
- It relies heavily on dark backgrounds, typography, reticles and relatively static tactical diagrams.
- It lacks the requested FPS perspective, real gameplay, player actions, gunfights, elimination and coordinated site-execute footage.
- Visual motion and shot variety are too limited; it feels closer to animated slides than a cinematic esports edit.
- The audio file contains long digital-silence intervals in the final section (measured intervals reported during inspection: approximately 46.85–50.07s, 51.22–56.03s and 57.22–60.10s). This needs a fresh source-level and render-level diagnosis before claiming it is fixed.
- This is evidence that the render pipeline can work; it is not evidence that the system can create cinematic videos from arbitrary prompts.

The next agent should use this project as a regression/quality case, not simply produce another similar SVG slideshow.

## 7. Verified current repository snapshot — 2026-11-20

- Main HEAD: `dd25e95c7853bc298f744e3eb6b5e891a66a9eba` (PR #104 merged; exact-head CI #44704302163 passed with 231 tests and 0 skipped; post-merge main CI #44717786935 passed with 231 tests and 0 skipped).
- PR #76 CI run #44516361047 passed; PR #77 CI run #44517012780 passed; post-merge main CI run #44517175453 passed.
- PRs #66–#77 are merged.
- A real MP4 from render run #44485488551 (artifact #14511125907) was retrieved and inspected with a contact sheet. Its bundled media-QA report passed with no detected silence, frozen video, black frames or audio/video duration drift beyond thresholds. See the new benchmark entry in `PROGRESS_LOG.md`.
- Recheck live branches, PRs, CI and commit SHAs before relying on this snapshot.

### Storyboard milestones on main

- **PR #66 — Story-first production guidance:** every shot requires a visual method, concrete action and start/development/end progression. Validator and examples were updated.
- **PR #67 — Storyboard risk CLI:** `storyboard:qa` produces deterministic, warning-only signals for long/static shots and repeated framing, visual method or camera movement.
- **PR #68 — Storyboard planning preview:** `storyboard:preview` creates standalone HTML shot cards with production-plan information. It is not a video animatic.
- **PR #69 — Expanded heuristic QA:** warnings for placeholder/vague descriptions and actions, incomplete progression, similar adjacent descriptions and text-heavy shots.
- **PR #70 — Shot-scale variety signals:** recognized framing labels and warning-only repeated/low shot-scale variety signals.
- **PR #71 — Storyboard critic:** `storyboard:critic` turns existing QA findings into prioritized revision suggestions. It is review-only; it does not mutate plans, use an AI provider, or approve creative quality.
- **PR #76 — Contact-sheet CLI:** `qa:contact-sheet` samples frames from an MP4 into a reviewable image grid; now used on a real benchmark artifact.

### Verified limitations

These features are deterministic and heuristic. They do not semantically understand the story, inspect motion continuously, listen to the audio, or guarantee cinematic quality. A contact sheet is a sparse visual sample, not full-video creative approval. Do not claim a persistent autonomous Production Director or automatic repair loop exists.

## 8. Immediate development direction

PR #105 strict asset-evidence validation is merged. Main CI #44749739555 passed. The v6 evidence report is `ready` (6/6 criteria, 18 assets, zero issues); v6 remained technically sound but exposed the separate 60s plan versus 47.899s render mismatch.

The duration contract slice is implemented and verified on `fix/benchmark-duration-contract-v2`. The 169-word benchmark narration produces a 59.30s MP4 for a 60s delivery target. Media QA enforces `delivery.durationSeconds` with configurable tolerance (render workflow currently uses ±0.75s), records the expected duration and tolerance in its report, and fails the job when the final container duration drifts outside that range. Regression tests cover a matching render, an old 47.899s render that must fail, and a render within tolerance. Branch CI #44750874075 passed 234 tests, 0 failed, 0 skipped, typecheck, project validation and build. Render v7 #44750655444 passed all relevant steps including mastering, Media QA, contact-sheet creation, provenance and artifact upload. Artifact #14636060983 is available until 2026-11-23; its manifest confirms the QA report and asset-evidence hashes.

The new asset report remains `ready`: 6/6 acceptance criteria linked, 18 assets, zero unresolved references, missing files, unsafe paths, missing rights/provenance, warnings or errors. The v7 Media QA report confirms 1920×1080 H.264/30fps, AAC stereo 96kHz, 59.30s, no silence/freeze/black intervals, −16.0 LUFS, −1.4 dBFS true peak, 0.033s A/V duration drift and 0s start offset.

**Still open:** The contact sheet sampled at 5-second intervals shows persistent large chapter-title overlays over gameplay. Do not mark creative acceptance complete based on a contact sheet: inspect full playback and audio, then refine title hierarchy/timing and visual pacing if necessary. No full playback/audio listening was performed in this pass.

Next priority: improve the benchmark's visual storytelling/readability based on the persistent chapter text, then render and review the actual MP4. Keep technical, asset-evidence and creative acceptance as separate gates. No open PR existed at the time the duration slice was validated; prepare a PR only after syncing this evidence and confirming PR CI.

## Resume checklist

Read `START_HERE.md`, this file, `ROADMAP.md`, `PROGRESS_LOG.md`, `AGENTS.md`, `README.md`, and relevant source/tests/skills. Verify live GitHub state before doing work. Prefer small end-to-end slices with tests and concrete validation evidence. Never claim a render or creative inspection without evidence.


## Media QA true-peak addition (merged)

The `scripts/media-qa.ts` report now extracts `True peak` from the FFmpeg EBU R128 log when present. It warns above -1.0 dBFS and fails above 0.0 dBFS. Both thresholds are configurable; absent readings are omitted. Unit tests cover safe, warning and over-limit readings. This is an additive audio QA improvement and does not claim audio listening or creative acceptance.


## Trailing-silence QA improvement (PR #75 merged)

Media QA is being extended to treat a final `silence_start` without a corresponding `silence_end` as silence through the probed media duration (EOF). This addresses a gap in the current log parser and is being regression-tested. PR #75 CI passed and the change was merged. The parser closes a final unmatched silence interval at the probed duration; regression tests cover long/short trailing silence and zero-length EOF cases.


## Contact-sheet review utility (PR #76 merged)

`npm run qa:contact-sheet -- video.mp4` generates a JPEG contact sheet using FFmpeg/FFprobe, sampling frames at a configurable interval and arranging them in a configurable grid. Options include `--interval`, `--columns`, `--width`, and `--output`. PR #76 CI passed and the feature is merged. Unit tests cover layout and option validation, but an actual MP4 contact sheet has not yet been generated and visually inspected in this work.


## 2026-11-19 — Render contact-sheet evidence integration (PR in progress)

GitHub Actions renders are being extended to generate a 5-second contact sheet and its JSON evidence report after media QA, and upload both alongside the MP4 and media-QA report. This provides a repeatable visual-review artifact for each GH Actions render. Sparse contact sheets do not replace continuous playback or audio listening. See PR for CI/merge status.


## 2026-11-19 — Render evidence automation merged (PR #84)

- PR #84 merged as `5cfcdc1d01067295ec2d76c2e7307905dbe678a6` after PR CI passed for head `58e68ccd8da334a481c2a825731338dbd6d7b2f5`.
- GitHub Actions render workflow now generates a 5-second contact sheet (4 columns, 320px thumbnails) and a JSON evidence report after Media QA, then uploads both with the MP4, credits and QA report.
- Post-merge main CI run #44524069933 is in progress; verify it before declaring main fully validated.
- No render has yet exercised the newly merged workflow. The existing VALORANT v4 artifact remains a benchmark only.
- Next development focus: investigate the traceable storyboard revision artifact and design the smallest integration that converts review findings into explicit, auditable revision edits without automatic approval or source-plan mutation.


## 2026-11-19 — Media QA true-peak fix merged (PR #86)

- PR #86 merged as `4ea4cbdeda0b1be480bfe0c3b52653ed23f7011d` after CI passed for head `4e6ce4db751ed8fd307a631c68efda0ada990512`.
- FFmpeg filter now enables EBU R128 true peak via `ebur128=peak=true:framelog=verbose`; parser accepts the actual `True peak:` / `Peak: -x dBFS` summary form.
- Exported `buildMediaQaAudioFilter()` and added regression coverage for the summary and configurable silence detection thresholds.
- Main CI run #44525255281 is in progress; verify it before considering main validated.
- PR #80 remains closed/unmerged; its implementation was selectively rebuilt into PR #86 on current main, without stale docs.
- Next creative development should focus on production director/revision workflow, not more QA infrastructure unless it directly improves creative output.


## 2026-11-19 — PR #88 merged; revision review workflow verified

- PR #88 `feat(storyboard): add revision selection and review workflow` merged as `5e7b019ce8487c7af067b4b8fe0ee1f9186f4fd3`.
- PR CI passed and post-merge main CI run #44526796903 passed.
- Revision artifacts support selecting/deselecting critique suggestions and generating a Markdown review without changing the source plan.
- Live verified main commit: `5e7b019ce8487c7af067b4b8fe0ee1f9186f4fd3`.
- No new video render was produced or inspected as part of PR #88.


## 2026-11-19 — PR #89 merged; safe AI revision import in progress

- PR #89 revision prompt handoff merged at `bd1b0b5c62dddfd9c246af0da54c93f26cc6ace4`; validate CI passed.
- The current follow-up implements a safe model-response import path. Imported edits are constrained to selected critique targets, existing shot IDs, unique per-shot edits and supported fields.
- Imported revisions are still reviewed and validated; apply writes to a separate revised plan. No automatic source-plan mutation and no render was produced.


## Storyboard narrative beats (PR #91 merged)

- Optional `narrativeBeat` shot labels are supported: hook, setup, context, development, escalation, reveal, payoff, CTA, transition and pause. Validator rejects unknown labels but does not require a tag on every shot.
- `npm run storyboard:beats` groups explicitly labeled shots, sums durations, lists unlabeled shots and generates review prompts for missing opening/development/payoff coverage when a sequence is sufficiently labeled.
- The report does not infer narrative meaning from shot text, force a formula, or approve creative quality. JSON output is available for future agent workflows.
- PR #90 safe revision import and PR #91 narrative beat review are merged. PR #91 CI run #44534929322 passed; no render was produced for these planning-tool changes.


## Creative brief contract (PR #93 merged)

- PR #93 merged as `d643e752b4430165121072185ef41e8ad5fc940c`; CI #44536804622 and post-merge main CI #44537158524 passed.
- Adds a version-1 creative brief schema and validator covering source prompt, objective, audience, response, delivery, thesis, emotional arc, visual language, story/motion/sound strategy, constraints, assumptions and measurable acceptance criteria.
- `npm run director:brief` validates a brief and prints or writes a Markdown summary. This is schema/contract groundwork; no LLM creates briefs yet.


## Verified render contact-sheet artifact — run #42 (2026-11-19)

- Render workflow run #42 completed successfully on branch `fix/render-contact-sheet-artifact-validation-2026-11-19`, commit `96846b5186558bb91a912ed1a0c82227cd06ec3c`. The earlier run #41 failed because the output name exceeded the request validator's 60-character limit; the same branch was corrected and rerun.
- Artifact #14532466761 contains the real MP4, technical media-QA JSON, contact-sheet JPG and contact-sheet timestamp/options JSON. The credits file was not emitted for this render (step skipped).
- MP4: H.264, 1920×1080, 30fps, 1,431 frames, 47.899s; AAC stereo 96kHz. QA passed with 0 findings, integrated loudness -16.0 LUFS, true peak -1.5 dBFS, no detected silence/frozen/black intervals, and A/V duration drift 0.199s.
- Contact-sheet report: 10 samples at 0, 5, 10, 15, 20, 25, 30, 35, 40 and 45 seconds; interval 5s, 4 columns, thumbnail width 320px. The actual contact-sheet image was retrieved and visually inspected. It shows recurring title/overlay composition in adjacent samples and gameplay imagery; sparse samples do not establish continuous motion, pacing or synchronization.
- Full video playback and audio listening were not performed. This is artifact packaging and sparse visual evidence, not creative acceptance.
- Run: https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/44527278383 ; artifact: https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/44527278383/artifacts/14532466761

## Production-plan schema/runtime contract alignment (merged)

- PR #96 merged as `98a972911052fa8a3381c4852e1f6f38c1d94398`; CI #44538121663 passed.
- The schema declares the runtime-required shot fields and optional narrativeBeat contract.

## Creative Brief → storyboard handoff (merged)

- PR #95 merged as `76b9b99fdd49c7f95ce35b01301170ab9658a4dd`. CI #44550178698 passed on exact head `6209942bdfa08cfeabac0c4f74849e59182db11b`; post-merge main CI #44554881017 passed.
- `director:storyboard-prompt` validates a brief and emits model-neutral storyboard instructions; it does not call an LLM or generate a storyboard.

## Creative Brief → production-plan import (PR #97 merged)

- PR #97 merged as `b05ff0b3674e9a96fd9fdd925bd73a7d9afa6354`; its required `validate` run #44556330379 passed. The CLI converts model-authored storyboard JSON into a validated production plan, checking delivery, frame-aligned contiguous timing and complete exact criterion-to-shot coverage with rationale.
- Optional `acceptanceCoverage` is schema/runtime validated; legacy plans without coverage remain valid. Free-form `engineApproach` is retained in bounded `implementationNotes`, while recognized enum values remain normalized.
- Initial CI run #44550086585 failed because the validator's strict enum check rejected five legacy `external-footage-with-3d-inset` values in the narrated-explainer plan. Those values are now preserved as `implementationNotes`, and a regression test validates the migrated example.
- The final PR diff was reviewed, including compatibility migration of legacy `engineApproach` notes and restoration of the storyboard handoff files; no render gate applies to this planning/import slice. Local tests/typecheck were not run outside CI. Post-merge main CI #44574582076 passed.
- Next step completed by PR #98: connect production-plan criteria to asset-manifest evidence; follow-up now adds first-stream start-offset diagnostics to media QA.


## Creative Brief → asset evidence report (merged)

- PR #98 merged: https://github.com/DarkonLikesCoffee/ai-video-studio/pull/98 as `73807bad31f133a0a2819cdd084286903f963645` (required CI #44608513408 passed; post-merge main CI succeeded).
- `director:asset-evidence` maps criterion→shot→manifest assets and checks local file/path safety, unresolved references and provenance/rights metadata. It remains report-only; asset links do not establish semantic relevance, and procedural shots may intentionally have no assets.
- This planning/report CLI requires no video render. No playback or audio listening was performed.

## 2026-11-20 — A/V stream start-offset diagnostics (PR #99 merged)

- PR #99 merged as `86a3549a3b0be0bcfe64f41f6e8f8237453113d8`; required validate CI #44646093493 passed on exact head `153d4b979544efbd150bb596cb7c58ffb5f5e340`. Post-merge main CI #44654418400 passed.
- Reports signed audio-minus-video first-stream `start_time` offset, with a configurable 0.5s default hard-failure threshold separate from duration drift. Missing timestamps are omitted rather than guessed.
- Regression tests cover aligned starts, late and early audio with equal stream durations, threshold configuration and missing timestamps. No render gate applies; no local test run, full playback or audio listening was performed.


## 2026-11-20 — PR #100 merged; integration test initially skipped

- PR #100 merged as `ad5746fbf07053116786b5d4c9c8c1a72137296a`; its required CI run #44654898138 passed and post-merge main CI #44662134081 passed.
- Log inspection showed `npm test` reported 216 passing and 1 skipped; subtest 57, “inspectMedia detects delayed audio in a real MP4…”, was skipped because FFmpeg setup ran after the test step. Therefore the test code was not actually exercised in CI on PR #100.
- PR #101 moves FFmpeg setup and version verification ahead of `npm test` and adds real MP4 silence fixtures to verify moderate silence is a warning and excessive silence is a hard error.
- Fixture recipes were manually tested with FFmpeg/FFprobe: the warning case measured 1.215667s of silence; the error case measured 2.516979s. Both used aligned audio/video streams and emitted no freeze/black findings. Repository integration tests await CI.
- No render gate applies to this test-only workflow correction. No full playback or audio listening was performed.


## 2026-11-20 — PR #101 merged; real-media integration tests executed

- PR #101 merged as `a299ab13321df1399b3f7176292fb04d838ff211`; PR CI #44662651944 passed on exact head `8f4b2526dfe041e67693e85e3ae6e63da42459fb`. The test log reported 219 passed, 0 failed, 0 skipped, confirming the FFmpeg-backed offset and silence integration tests ran after tool setup.
- Post-merge main CI #44669560240 passed on the merge commit.
- PR #102 adds generated MP4 regressions through the real `inspectMedia` pipeline for frozen-video and black-frame intervals, including warning/pass and excessive/error thresholds. Fixture generation recipes were manually verified with FFmpeg/FFprobe 7.1.5; repository tests are pending CI.
- No render gate applies to this QA-test-only slice. No full video playback or audio listening was performed.


## 2026-11-22 — Repository cleanup follow-up (PR pending)

- Created branch `chore/repository-cleanup-followup-2026-11-22` from live `main` for an evidence-based second cleanup pass.
- Audited root npm scripts, workspace package manifests, CI and render workflows, agent instructions, documentation index and current open PRs.
- Confirmed the 28 root npm scripts are still documented or referenced by CI/render or production/agent workflows; no safe script deletion was identified.
- Preserved production-critical render logic, render request triggers, VALORANT gameplay archive, active PR branches and all project assets.
- Added `docs/REPOSITORY_CLEANUP_FOLLOWUP.md` documenting findings and deferred work.
- No code, dependency, workflow, asset, or branch deletion was attempted. Local tests/build/render were not run in this connector-only session; PR CI is required.


## 2026-11-22 — Source-code cleanup: shared HTTP retry-delay helper (PR #126 merged)

- Created branch `chore/source-code-cleanup-2026-11-22` from post-PR #125 main commit `12983e7bd7c9c1ab186f0c64e8c149a5e74cc3c4`.
- Audited the complete recursive tree (186 tracked files) and traced candidate utility modules to their production imports and tests.
- Found duplicated Retry-After parsing and exponential-backoff calculations in the Wikimedia Commons and NASA asset downloaders.
- Extracted the pure calculation to `scripts/retry-delay.mjs`; kept both public wrappers and provider-specific delay policies intact.
- Added focused tests for numeric/date Retry-After handling, caps, backoff and invalid values.
- Confirmed the inspected core utility modules and EiffelTower component are referenced; no dead code was removed.
- PR CI #45018775059 and post-merge main CI #45018877315 passed. No production render was required for this internal helper refactor.


## 2026-11-22 — Type dependency metadata cleanup (PR #128 merged)

- Moved `@types/three` from runtime dependencies to development dependencies in `packages/video-engine/package.json`, consistent with the other `@types/*` packages.
- The `three` runtime dependency and all versions remain unchanged.
- PR CI #45019205207 and post-merge main CI #45019314801 passed. No package versions or runtime dependencies changed.


## 2026-11-22 — Reproducible npm workspace install (PR #131 pending)

- Added a root npm-generated `package-lock.json` (lockfile version 3; 403 package/workspace entries; 194,120 bytes), exported from the repository's Node 22 CI install rather than manually assembled.
- Switched GitHub Actions CI, GitHub Actions rendering and CircleCI rendering from `npm install` to `npm ci`.
- Added the lockfile to the CI npm-cache key, changed the README's clean setup command to `npm ci`, and documented dependency-change/lockfile rules in `docs/DEPENDENCY_MANAGEMENT.md` and `AGENTS.md`.
- No package manifest versions or dependency declarations were changed in this step. Dependency pruning and upgrades remain deferred.
- PR #131 CI run #45020610080 passed on the bootstrap-only source commit. A final full CI run using the committed lockfile and `npm ci` is required before merge.


## 2026-11-22 — Mandatory shot-differentiation gate (PR pending)

- Added a model-neutral `agent/skills/shot-differentiation/SKILL.md` contract to prevent text-only shot changes over a repeated scene/camera.
- The contract requires shot cards (subject, composition, visible event, camera, transition, story contribution), adjacent-shot comparisons, shot-to-code implementation traceability and pre-render rejection checks. It also defines repeated-scene/text-only variation as a major post-render QA failure.
- Linked the contract from Remotion Producer, Visual QA, shared production workflow, START_HERE and AGENTS so future assistants are required to load and apply it.
- This is process documentation, not an automated semantic vision detector or a guarantee. It does not retroactively repair videos or add autonomous AI capabilities.
