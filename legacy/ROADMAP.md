# AI Video Studio — Roadmap

## Current verified snapshot — 2026-11-23

The live implementation state is recorded in [PROJECT_STATE.md](PROJECT_STATE.md). Main implementation baseline is PR #168 merge `daa8980ad2a9342baf25413854caf53d96a967be`; current main after PR #169 documentation refresh is `9e5bf07f6f71531ad41e2f82a04dfeeb4259bd39`. PR #168 exact-head CI [#45256848775](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45256848775) passed all 53 workflow steps; PR #169 docs CI [#45257516309](https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/45257516309) also passed all 53 steps.

The current production foundation includes PR #144 composition identity, PR #150 audio QA modes, PRs #151–152 structured visual-review reporting/validation, PR #154 2D/3D render-path separation, PR #155 hash-bound full-video playback evidence, and PR #156 the final delivery gate. PR #158 adds visual-asset preview/approval evidence with audio exempt from visual review. PR #159 adds explicit asset reuse policies and a static composition-wide source/data reference check. PR #161 extends ProjectVideo verification to the specific scenes assigned to each required visual asset and adds a real Golden Hour CI fixture; global audio remains checked globally. PR #163 tightens custom Remotion source analysis so only statically resolvable media references in the selected component's reachable import graph count (Remotion `staticFile()`, local media imports, static `new URL()`, and JSX/JSON `src`/`poster` fields); arbitrary text strings no longer count. Its exact-head CI #45250261362 passed all 52 steps.

The asset-evidence gates now check provenance/rights, local file safety, visual preview/approval, composition-wide required asset references and ProjectVideo shot placement. Static source/data references do not prove semantic relevance or visible use in rendered pixels. PR #166 closes the structural shot-level mapping gap for custom Remotion using the versioned manifest-level `shotComponents` contract. Each plan shot maps to reachable source module(s); required visual asset references are checked within assigned modules, while global audio remains global. The Stormlight Keeper fixture covers all six plan shots and its two required audio assets. This still proves structural source/module association only, not visibility or semantic suitability in rendered pixels. The manual final-delivery workflow has not yet been exercised against a real approved render.

This roadmap describes intended work, not current implementation. Update checkboxes only when code and evidence demonstrate the capability.

## North-star outcome

A user describes a video in ordinary language and receives a polished, coherent, cinematic video with appropriate visuals, editing, narration, music and sound design. AI Video Studio should **visually tell a story**, not merely animate information. It must work across topics and styles, use user-provided assets when requested, and improve weak drafts before delivery.

> **Creative principle:** AI Video Studio should not decide how to animate information. It should decide how to visually tell a story, then use the appropriate production techniques to bring that story to life.

A successful render is not a successful video. Technical validity, narrative quality and creative acceptance are separate gates.

## Strategic direction

The current slideshow-like output is a production-intelligence problem, not simply a shortage of effects. PR #81 adds a deterministic report with shot-specific alternatives, but it is advisory and does not autonomously select or apply a revised strategy. Avoid treating every scene as a text card, still image, diagram or background with generic motion.

A production should have:
- A clear promise, narrative progression and intended audience.
- Creative direction and a visual language appropriate to the topic.
- A shot-by-shot plan where every shot has a purpose, action or visual development.
- Per-shot visual-method selection instead of one universal scene template.
- Purposeful camera, subject, object and environmental motion.
- Editing, transitions and audio motivated by what is happening.
- Review of the actual rendered video, followed by targeted improvements.

Visual methods are selectable production capabilities—not mandatory ingredients. A shot may use real footage, user footage, generated video, still imagery, 2D animation, motion graphics, typography, diagrams, 3D, simulations or a hybrid. Select the simplest method that can produce the intended result at the required quality. Do not substitute unrelated stills/diagrams for requested footage without clearly reporting it.

## P0 — Reliable production and quality gates

**Goal:** Stop accepting technically successful but creatively weak videos and fix defects that invalidate current output.

- [x] Add a deterministic storyboard-risk report with warnings for long shots, static camera holds, repeated adjacent framing, visual method and camera movement; warnings are transparent heuristics, not creative verdicts.
- [x] Enforce a frozen-candidate render gate: `candidateSha` must equal the previous remote branch tip, the trigger push may modify only `render-request.json`, and previous candidate SHAs / request IDs are deduplicated across fetched history. Implemented in `scripts/render-candidate.mjs` and `.github/workflows/render.yml`; PRs #115 and #116 are merged, and the gate is present on `main`. Regression tests, typecheck and build passed in CI runs #44801247196 and #44801549483. This verifies a frozen request boundary, not creative readiness.
- [ ] Diagnose and fix unexpected audio gaps/silence in current benchmark renders; maintain tests for missing, short, silent or misaligned audio tracks. **Partial implementation:** PR #86 enables EBU R128 peak measurement; silence/gap detection and trailing-EOF handling are tested (#75). PR #99 adds signed A/V start-offset diagnostics; PR #101 exact-head CI #44662651944 passed 219 tests with 0 skips and post-merge main CI #44669560240 passed. PR #102 exact-head CI #44669898766 passed 223 tests with 0 skips, including real-MP4 freeze and black-frame warning/error cases; post-merge main CI #44674647378 passed. PR #103 exact-head CI #44675048271 passed 226 tests with 0 skips and verified FFmpeg/FFprobe; post-merge main CI #44681010124 passed. Fresh render #44717916331 reported no silence intervals, but source-level diagnosis of earlier gaps and full audio listening remain pending.
- [ ] Maintain repeatable media QA: duration, resolution, FPS, codecs, streams, loudness/true peak, silence, black frames, freeze/static intervals, contact sheets for visual inspection, asset/caption coverage and synchronization. **Partial implementation:** render #42 artifact #14532466761 was inspected; CI exercises real MP4 delayed-audio, silence, freeze and black-frame severity. PR #102 exact-head CI #44669898766 passed 223 tests with 0 skips; PR #103 exact-head CI #44675048271 passed 226 tests with 0 skips and requires FFmpeg/FFprobe; post-merge main CI #44681010124 passed. Render #44717916331 v5 QA passed at 1920×1080/30 fps with no detected silence/freeze/black, −16.0 LUFS, −1.4 dBFS true peak and 0.123 s A/V duration drift; its 1-fps contact sheet was inspected. Full playback/audio listening and creative acceptance remain pending.
- [ ] Define measurable storyboard checks: shot duration, framing/shot-size and visual-method variety, meaningful action/progression, repeated composition, text dependence and static/slideshow-like patterns. **Partial implementation:** warning signals now cover long/static shots, repeated method/framing/camera movement, vague visual/action descriptions, missing progression markers, highly similar adjacent visuals and lengthy copy; broader coverage and rendered-video QA remain. Recent PR #70 also adds recognized shot-scale checks: repeated adjacent scale and low scale variety across longer sequences (with a 60% recognition threshold). These are still heuristic warnings; broader checks and real-video QA remain.
- [ ] Make render acceptance explicit: CI success is necessary, but creative acceptance requires inspection of the actual MP4 against the brief. **Technical duration gate implemented and verified:** v7 render #44750655444 is 59.30s against the 60s plan (±0.75s), and QA passed; the old v6 47.899s output is covered by a failing regression case. The 169-word narration is now aligned to the plan without time-stretching. **Creative acceptance remains open:** v7's 12-frame contact sheet at 5-second intervals shows persistent large chapter-title overlays over authentic gameplay. Full playback and audio listening are still required to judge motion, hierarchy, pacing and sound.
- [x] Preserve render provenance: source commit, project ID, request ID, workflow run, artifact ID and QA report. **Verified:** PR #104 merged as `dd25e95c7853bc298f744e3eb6b5e891a66a9eba`; exact-head CI #44704302163 and post-merge main CI #44717786935 each passed 231 tests, 0 skipped. Render #44717916331 produced artifact #14620562670 with manifest, source/request/run metadata, SHA-256 file evidence, Media QA/contact-sheet summaries and post-upload artifact ID/URL/digest; the manifest was inspected.
- [ ] Maintain a reusable end-to-end benchmark with real moving footage, graphics, narration, continuous music and SFX—not only abstract vector animation. **Partial evidence:** render #44750655444 v7 used user-owned VALORANT gameplay, motion graphics, generated narration and original score/SFX; the MP4 passed technical QA at 59.30 s against the 60 s plan (±0.75 s). Its 12-frame contact sheet still showed large chapter-title overlays over gameplay. Full playback and audio listening remain necessary for creative acceptance.
- [ ] Update benchmark documentation and project state to reflect current evidence; remove stale claims and distinguish capability readiness from an actually verified render.

**Exit criteria:** QA flags a deliberately weak/slideshow-like project; a benchmark passes technical checks and human-reviewed creative criteria; known audio defects are detected; the inspected artifact and evidence are traceable.

## P1 — AI Production Director and visual storytelling

**Goal:** Turn arbitrary prompts into a creative brief and deliberate audiovisual plan before production begins.

- [x] Define a version-1 editable creative-brief schema for objective, audience, desired response, creative thesis, emotional arc, visual language, storytelling/motion/sound, production strategy, constraints, assumptions and acceptance criteria. Script, shot plan, assets, audio cue sheet, sources and QA remain separate downstream artifacts.
- [ ] Implement a Director workflow that interprets the prompt and chooses a narrative approach, tone, pacing, style and visual storytelling strategy.
- [ ] Translate abstract concepts into concrete visual events, actions, demonstrations, comparisons, metaphors or reveals; avoid defaulting to explanatory text cards.
- [ ] Establish a narrative structure appropriate to the format (e.g. hook, development, optional midpoint re-engagement, payoff/CTA) rather than forcing a fixed formula on every video.
- [ ] Make every shot serve the story or explain why it is needed. Specify what the audience sees and what changes during the shot.
- [ ] Select a visual method for each shot: footage, generated media, 3D, motion graphics, diagram, typography, 2D animation, simulation or hybrid.
- [ ] Generate a coherent shot plan with duration, framing/shot size, camera position and motion, subject/action, visual progression, transition, overlay/text rationale and audio cues.
- [ ] Add validation for vague, repetitive, static or text-heavy shot plans and revise them before rendering.
- [ ] Include explicit confidence, assumptions and source fields; do not fabricate facts or claim unsupported capabilities.
- [ ] Keep model/provider integration swappable; avoid coupling the production schema to one AI vendor.
- [ ] Support save/resume from project artifacts so another model, agent or conversation can continue without re-planning everything.
- [x] Add the first optional, versioned `production-state.json` handoff envelope and structural validator (PR #143). This validates project identity, stage ordering labels and evidence-reference structure; it does not verify evidence contents or enforce a render gate, so full save/resume remains unfinished.

**Exit criteria:** An unfamiliar prompt produces a validated creative brief and executable shot plan with meaningful visual variety and a selected production method per shot, without hand-authoring every scene.

## P1 — Storyboard approval and production planning

**Goal:** Make the storyboard an executable plan, not a scene-title list.

- [x] Require every shot to include a selected visual method, concrete action and start/development/end visual progression in both the production-plan JSON Schema and runtime validator; keep example plans updated. The schema/runtime required-shot contract was merged in PR #96 and is regression-tested, including optional `narrativeBeat` enum support.
- [x] Generate a reviewable HTML storyboard planning preview from production plans before full production (timeline-ordered shot cards, visual method/action/progression, framing/camera/transition/audio cues; not an animated animatic).
- [x] Add a review-only storyboard critic report that converts deterministic QA findings into prioritized revision suggestions; it does not modify plans or approve creative quality.

- [ ] Include shot ID, duration, narrative purpose, visual action/progression, method, composition, camera, asset dependencies and audio cues.
- [ ] Support a review/approval checkpoint for expensive, complex or ambiguous production plans; do not make approval mandatory for every low-cost workflow unless configured.
- [ ] Validate timing and transitions as a complete sequence, including pacing, continuity, repeated visual grammar and shot-to-shot variety.
- [x] Provide a clear path to revise individual shots without regenerating the entire plan using a versioned, source-preserving revision artifact and separate revised-plan output.
- [x] Add a traceable revision artifact/workflow that records the source plan text/object and SHA-256, critic suggestions and selection state, explicit edits, and validation errors/warnings while preserving the original plan. Selection and edits are manual/agent-explicit; no silent auto-repair.
- [x] Export a model-neutral revision handoff prompt from selected suggestions, including only affected shot context and strict JSON edit-output instructions. This is prompt packaging, not an LLM integration.
- [x] Import model-returned revision JSON with strict checks for selected shot IDs, duplicate edits and supported fields; validate and apply only to a separate revised plan.
- [x] Support optional explicit narrative-beat labels and a review report that groups beat coverage/duration and flags gaps without inferring story meaning or enforcing a fixed arc.

**Exit criteria:** A reviewer can understand the intended video and approve or change its shot plan before expensive asset generation or rendering; the approved plan drives production.

## P1 — Expand reusable visual-production capabilities

**Goal:** Enable the Director to produce different kinds of visual sequences, not just animated slide compositions.

- [ ] Build reusable Remotion compositions and motion-graphics primitives for dynamic, layered visuals, data, maps, UI, typography and visual explanations.
- [ ] Expand purposeful camera motion: pan, tilt, dolly, orbit, tracking, zoom, framing changes and parallax/depth where supported and appropriate.
- [ ] Add subject/object/environment animation with explicit motion curves, keyframes and visual states.
- [ ] Improve compositing and layered scene support, including foreground/background separation, occlusion and depth effects when assets and tooling support them.
- [ ] Integrate Three.js scenes and imported 3D models as a selectable production method for shots that benefit from spatial environments, camera movement or object interaction.
- [ ] Evaluate Blender for shots requiring complex modelling, lighting, simulation, rendering or capabilities that are not economical in the current web/Remotion engine. Use it as an optional specialist renderer, not a blanket dependency.
- [ ] Support 2D character/rig animation and physical simulation only for projects where those techniques serve the brief.
- [ ] Make generated/custom Remotion compositions first-class; ProjectVideo remains a useful compatibility renderer, not the creative ceiling.
- [x] Add a versioned composition-capability registry and require every new production plan to make an explicit whole-video renderer/composition choice. Validate registered versus to-be-built status and enforce agreement between the plan and render request before Remotion runs. The AI decision remains model/agent-led; this is not an embedded autonomous LLM.
- [ ] Strengthen runtime composition identity enforcement so the shared capability catalogue and RemotionRoot contain exactly the same IDs, only selectable entries can render, and a custom composition without a props JSON can link its production plan explicitly. Draft PR #144 is implementing this; await exact-head CI and merge before checking this item.
- [ ] Benchmark visual capabilities on several unrelated topics and formats.

**Architecture policy:** Remotion is the current core composition/rendering path. Three.js, Blender, specialized animation tools and other renderers should be integrated selectively behind reusable interfaces. FFmpeg remains a post-processing, audio/video processing and export tool. Evaluate HyperFrames or other engines against concrete requirements before adopting; do not add technology merely because it appears in research.

**Exit criteria:** Multiple unrelated prompts produce visibly different, purposeful visual sequences using more than one visual method; a scene can contain real motion/action and is not limited to text cards, still images or generic vector animation.

## P2 — Asset acquisition and generation

**Goal:** Give every planned shot the appropriate media with review, rights and provenance.

- [x] Connect acceptance-criterion → shot mappings to asset-manifest entries and local build evidence. PR #105 merged the strict pre-render asset-evidence gate, report upload/provenance and corrected VALORANT benchmark shot/rights mapping. The report verifies links and metadata, not semantic suitability.

- [ ] Unify discovery of still images and moving footage, including Openverse, Wikimedia Commons, NASA where relevant, and user-provided assets.
- [ ] Build a complete asset review/selection manifest with source URL, creator, license, restrictions, attribution, media type, dimensions/duration, codec and hash. **Partial implementation:** PR #158 adds local visual preview/approval evidence (audio is exempt from visual review); PR #159 adds explicit reuse policies and exact composition-wide source-reference checks; PR #161 verifies required ProjectVideo visual assets in each assigned scene and adds a live Golden Hour CI fixture. Full media metadata/hash coverage, custom-Remotion shot mapping and rendered-pixel/semantic proof remain open.
- [ ] Add provider adapters for generated still/video media only after comparing quality, rights, latency, reliability, controllability and cost.
- [ ] Support user-provided image, video, audio and 3D assets with clear import/validation rules.
- [ ] Handle missing or unsuitable footage honestly; do not disguise diagrams or stills as real footage.
- [ ] Add visual consistency controls for recurring subjects, locations, palettes and art direction where selected providers support them.
- [ ] Keep asset selection connected to shot intent and approved creative direction; avoid sourcing media solely to fill a scene. **Partial implementation:** criterion→shot→asset evidence, `reusePolicy`, exact source-reference checks and ProjectVideo assigned-scene checks detect required assets omitted from the selected shot; they do not prove semantic relevance or visible use in rendered pixels. Custom Remotion shot-level mapping remains open.

**Exit criteria:** The system satisfies a mixed shot list with reviewed real footage, generated assets and user assets, with complete provenance and no silent substitutions.

## P2 — Cinematic editing, motion and temporal control

**Goal:** Develop a purposeful audiovisual edit rather than a collection of individually animated scenes.

- [ ] Build reusable editing primitives for shot grammar, camera movement, parallax/depth, match cuts, motivated transitions, speed changes, compositing, freeze frames and kinetic typography.
- [ ] Support transitions motivated by content, composition, motion or narrative—not a default transition on every scene boundary.
- [ ] Drive visual events from narration and audio beats when meaningful; do not force every cut to the beat.
- [ ] Support controlled emphasis (punch-ins, reframing, holds and speed changes) with pacing safeguards; effects must be motivated by the scene, not applied at fixed intervals.
- [ ] Build continuity-aware pacing and shot sequencing: contrast shot sizes, change visual method, maintain or intentionally break motion/composition continuity.
- [ ] Provide style definitions and reusable primitives without enforcing one rigid template per style.
- [ ] Add color grading as a configurable, shot/style-aware finishing stage. Avoid blanket filters that can damage the source or make every video look the same.
- [ ] Evaluate techniques such as tracking, morphing, slow motion, speed ramps and advanced interpolation as capability-specific work with benchmarks and explicit limitations.

**Exit criteria:** Several unrelated prompts produce intentionally edited, visually varied sequences with meaningful motion, transitions and pacing—not repeated slideshow grammar or indiscriminate effects.

## P2 — Professional audio and narration

**Goal:** Make audio an intentional part of storytelling and editing.

- [ ] Diagnose silence/gaps, clipping, loudness, true peak and synchronization automatically.
- [ ] Add a provider-neutral voice interface for supported providers/local engines, with voice/language selection and clear cost/consent gates.
- [ ] Add reliable forced alignment for arbitrary imported narration, with honest phrase-level fallback if word alignment is unavailable.
- [ ] Create sound-effect cueing tied to specific visual actions; avoid generic whooshes on every transition.
- [ ] Support continuous score, ambience, dynamic ducking, transitions, fades and platform-aware mastering.
- [ ] Make silence trimming context-aware and configurable; preserve dramatic, expressive and natural pauses. Never impose one universal silence-margin rule without listening/review.
- [ ] Add actual audio playback/listening to QA workflow where possible.

**Exit criteria:** Voice, music, ambience and SFX form a balanced, continuous mix synchronized with the edit; automated checks flag defects and the audio is reviewed where possible.

## P3 — Visual/audio QA, critique and iterative repair

**Goal:** The system evaluates its actual draft, identifies high-impact weaknesses and improves it before delivery.

- [ ] Generate contact sheets, shot-boundary frames and representative motion clips automatically.
- [ ] Use frame/video understanding to review continuity, relevance, composition, visual variety, repetition, motion, text dependence and brief compliance.
- [ ] Review narration/script/caption consistency and audio/video synchronization.
- [ ] Detect and diagnose slideshow-like output, including long static shots, repeated layouts, meaningless motion and scenes that do not visually advance.
- [ ] Convert QA findings into prioritized, specific and actionable edits—not vague scores alone.
- [ ] Re-render only affected scenes/sections when feasible and compare revisions.
- [ ] Keep an auditable record of inspected artifacts, evidence, corrections and remaining uncertainty.
- [ ] Use explicit acceptance criteria and avoid pretending automated vision/audio analysis is infallible.

**Exit criteria:** A weak draft is identified with evidence, corrected and re-rendered; the final delivery includes a truthful QA summary and unresolved limitations.

## P4 — End-to-end benchmark and capability validation

**Goal:** Prove the architecture works across different content types before scaling complexity.

- [ ] Maintain benchmark projects for distinct visual challenges (e.g. real footage/editing, 3D spatial explanation, motion-graphics explainer, screen/UI tutorial, character/action narrative).
- [ ] Define briefs and acceptance criteria before rendering each benchmark.
- [ ] Record the selected visual methods, engine paths, asset sources, cost/compute, render duration and QA outcomes.
- [ ] Compare versions and preserve failures as regression cases.
- [ ] Require a benchmark to demonstrate a new capability before declaring it production-ready.

**Exit criteria:** The system has verified examples across unrelated topics and visual formats, with measurable technical results and documented creative review.

## P5 — Usable end-to-end product

**Goal:** Make production easy to use without manually editing JSON or GitHub files.

- [ ] Provide a simple prompt and reference-input interface.
- [ ] Let users select style, duration, format, language, voice and audio preferences without overwhelming them.
- [ ] Support uploading and organizing personal assets.
- [ ] Show production progress, creative decisions, storyboard review, asset selection and render/QA status.
- [ ] Allow targeted revisions (“make this section faster”, “replace this shot”, “change narration voice”) without rebuilding everything.
- [ ] Deliver downloadable MP4 and editable project package with credits.

**Exit criteria:** A user can create, review and revise a video without directly editing repository files.

## Priority policy

1. Fix defects that invalidate current output.
2. Improve the actual audiovisual result with a tested end-to-end vertical slice.
3. Solve production intelligence and story/shot planning before adding superficial polish.
4. Build reusable visual, motion, editing and audio capabilities guided by benchmark needs.
5. Add QA and iteration that inspect the actual output.
6. Expand providers and product UI only when they advance the north-star outcome.
7. Adopt a new framework/tool only when it fills a verified capability gap or offers a substantial measured improvement.
8. Avoid adding more showcase templates unless they test a concrete capability or quality regression.
9. Prefer a small, working vertical slice over large architecture rewrites or speculative multi-agent complexity.
10. Do not spend money on paid services or APIs without explicit user approval.


## P9 — Approved final delivery

**Goal:** A successful render is a review package, not a delivered video. Publish a final package only after a reviewer has accepted the exact rendered MP4 and its provenance/QA evidence is consistent.

- [x] Add a separate manual release workflow that accepts one render run, output name and committed approval report; verify the selected run completed successfully in the Render video workflow.
- [x] Validate schema-v3 visual approval, tracked full playback, exact render run/request/source commit and MP4 SHA-256; compare MP4 size/duration/metadata against Media QA.
- [x] Verify contact-sheet evidence, asset-evidence status and every file hash recorded by the render-provenance manifest.
- [x] Require an explicit audio-review status: listened with reviewer/time/rationale, not-listened with a reason, or not-applicable only when the MP4 has no audio stream.
- [x] Produce a `.delivery.json` receipt and a separate final package with 30-day retention; retain the original render review package for the approval window.
- [ ] Merge PR #156 after exact-head CI passes. Then exercise the manual workflow with a real approved render and verify the resulting final artifact end-to-end.

**Current boundary:** the final-delivery implementation is on `main` and its CI fixtures verify package/evidence consistency. The manual release workflow has not been run against a real approved render, so a real-world release is not yet verified. Playback telemetry is not cryptographic identity proof, and reviewer-provided audio listening/creative acceptance cannot be independently established by the gate.

## Release gate for every video-producing milestone

Do not mark a milestone complete until:
- Typecheck, tests and project validation pass.
- The actual render succeeds from the intended source commit.
- The exact artifact is downloaded and verified.
- The video is inspected across its timeline or with sufficient representative motion review.
- Audio is listened to when possible; otherwise clearly state that only technical measurements were performed.
- The result is judged against the original brief and acceptance criteria.
- Any known defects and limitations are documented.
- Provenance and QA evidence are saved with the project.

## Current implementation focus — transition from rendering reliability to production intelligence

The recent work has established planning/evidence and technical QA foundations. Verify live code, CI, PRs, renders and artifacts before treating this snapshot as current.

- [x] Establish automated media diagnostics for rendered MP4s (metadata, silence, loudness, freeze and black-frame analysis) and attach reports to render artifacts.
- [x] Synchronize narrated visuals and timelines and add regression coverage for boundary/timing issues.
- [x] Add per-scene camera-motion capability and verify a fresh render, subject to the evidence recorded in project-state docs.
- [x] Integrate authorized local footage into the narrated ProjectVideo production path with rights metadata and separate credits.
- [ ] Verify and document the latest real render against its creative brief; do not equate motion diagnostics or technical synchronization with creative acceptance.
- [ ] Update the project-state, continuity and progress docs so stale benchmark/footage claims do not contradict verified current evidence.
- [ ] Continue the quality-first vertical slice with the Production Director → storyboard/shot plan → asset evidence → build → actual-video QA loop. PRs #97 and #98 are merged; PR #99 stream-offset diagnostics, PR #100 real MP4 offset integration, and PR #101 real silence integration are merged. PR #101 exact-head CI #44662651944 passed 219/219 tests and post-merge main CI #44669560240 passed. PR #102 merged as `5483728b441847a7e9cd1ac7b7f659dc71d81dd6`; exact-head CI #44669898766 passed 223 tests with 0 skipped, adding real-media freeze/black interval severity tests. Post-merge main CI #44674647378 passed. PR #103 enforces that CI cannot silently skip FFmpeg integration tests.
- [ ] Use the existing VALORANT project as a regression/creative-quality case, not as justification to repeat its diagram-heavy visual approach.
- [ ] Choose the first implementation task only after inspecting the current director, storyboard, production schema, render path and QA code. Favor a focused, testable improvement.

The largest gap is not basic rendering. It is the **production intelligence and audiovisual quality** between a user's prompt and the final edit.

## Render evidence workflow

- [x] Automatically attach a contact sheet and JSON evidence report to GitHub Actions render artifacts (PR #84 merged; verified by real render run #42, artifact #14532466761).
- [ ] Inspect actual render artifacts across motion and listen to audio; contact sheets alone are insufficient acceptance.


## Render-workflow contact-sheet evidence (run #42)

- PR #84's existing integration is verified by a real GitHub Actions render. Artifact #14532466761 includes the MP4, media-QA JSON, contact-sheet JPG and optional contact-sheet JSON report together; credits were skipped for this project.
- The contact sheet was retrieved and visually inspected: 10 samples from a 47.899s render, at 5-second intervals, 4-column layout, 320px thumbnails. It shows repeated text-overlay composition across adjacent samples. This limited inspection cannot establish continuous motion, audio quality, pacing or creative acceptance.
- Technical QA passed: 1920×1080 H.264, 30fps, AAC stereo 96kHz, 47.899s, -16.0 LUFS, -1.5 dBFS true peak, 0 detected findings and 0.199s A/V duration drift.
- The render workflow packaging/integration milestone is demonstrated; the broader P0 repeatable QA and human creative-acceptance checklist remains open.
- Run: https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/44527278383 ; artifact: https://github.com/DarkonLikesCoffee/ai-video-studio/actions/runs/44527278383/artifacts/14532466761

## Production-plan schema contract correction (completed)

- The JSON Schema was missing the validator-required `visualMethod`, `action`, and `visualProgression` shot fields, and it omitted optional `narrativeBeat` labels accepted by runtime validation. Because `shots.items.additionalProperties` is false, schema consumers could reject or fail to request fields that the CLI requires.
- PR #96 merged as `98a972911052fa8a3381c4852e1f6f38c1d94398`; CI run #44538121663 passed. The missing required fields, optional narrative-beat enum and schema/runtime contract regression test are integrated. No video render was needed for this schema-only correction.


## 2026-11-19 — PR #95 merged; production-plan import compatibility fix

- [x] PR #96 schema/runtime correction merged (`98a972911052fa8a3381c4852e1f6f38c1d94398`), CI #44538121663 passed.
- [x] PR #95 storyboard handoff merged as `76b9b99fdd49c7f95ce35b01301170ab9658a4dd`; PR CI #44550178698 passed on exact head `6209942bdfa08cfeabac0c4f74849e59182db11b`; post-merge main CI #44554881017 passed.
- [x] PR #97 converts model-authored storyboard JSON to validated production-plan JSON. Its initial CI #44550086585 exposed legacy free-form `engineApproach` values in the narrated-explainer sample. The five values are preserved as `implementationNotes`, and a regression test validates the migrated plan. PR #97 merged as `b05ff0b3674e9a96fd9fdd925bd73a7d9afa6354`; required CI #44556330379 and post-merge main CI #44574582076 passed.
- [x] PR #98 criterion-to-asset evidence report merged as `73807bad31f133a0a2819cdd084286903f963645`; required CI #44608513408 passed. It maps criterion→shot→manifest assets and checks file/path/provenance/rights evidence; it remains report-only and does not establish semantic relevance.


## 2026-11-20 — A/V stream start-offset diagnostics (PR #99 merged)

- PR #98 merged as `73807bad31f133a0a2819cdd084286903f963645`; its required `validate` CI #44608513408 passed and post-merge main CI completed.
- PR #99 merged as `86a3549a3b0be0bcfe64f41f6e8f8237453113d8` from exact head `153d4b979544efbd150bb596cb7c58ffb5f5e340`; required validate CI #44646093493 passed. Post-merge main CI #44654418400 passed.
- The report measures signed audio-minus-video first-stream `start_time` offsets. The default 0.5-second absolute threshold is a hard QA error and is configurable separately from duration drift. Missing/invalid timestamps are omitted rather than guessed.
- Regression tests cover clean alignment, late audio with equal durations, early audio, configurable tolerance and missing timestamp metadata. This is a technical synchronization diagnostic, not proof that narration/SFX align with picture events or creative acceptance. No fresh render, playback or listening was performed.

## 2026-11-20 — PR #100 merged; delayed-audio test skipped in CI

- PR #100 merged as `ad5746fbf07053116786b5d4c9c8c1a72137296a`; required CI #44654898138 passed and post-merge main CI #44662134081 passed.
- The CI test log showed 216 passing and 1 skipped. The real-MP4 delayed-audio test was skipped because FFmpeg/FFprobe setup was placed after `npm test`; the green CI run did not validate that integration case.
- The fixture recipe was manually verified: video start 0.000s, audio start 0.628s, stream-duration drift 0.021333s, and no silence/freeze/black findings.
- PR #101 fixes the workflow ordering and adds real-MP4 silence tests for a 1.2s warning and a 2.5s hard failure. No fresh render, full playback or listening was performed.


## 2026-11-20 — Real MP4 silence detection and CI gate correction (PR #101)

- Branch `test/media-qa-real-silence-fixtures` moves FFmpeg installation/version verification before the test step so FFmpeg-backed integration tests run rather than silently skip in CI.
- Adds two real-MP4 `inspectMedia` regressions: moderate silence should remain a warning/pass; excessive silence should produce a hard error/fail. Both assert aligned stream starts and low duration drift to isolate silence detection.
- FFmpeg/FFprobe fixture recipes were manually run in this environment: the warning fixture detected 1.215667s silence; the excessive fixture detected 2.516979s silence. Video checks emitted no freeze or black findings. The repository tests/typecheck are not run locally in this connector-only environment; CI is required.
- Test-only workflow changes require no render gate. No full playback or audio listening was performed.


## 2026-11-20 — Real MP4 freeze and black-frame QA integration (PR #102 merged)

- After PR #101 merged, exact-head CI #44662651944 passed with 219 tests, 0 failures and 0 skipped; post-merge main CI #44669560240 also passed.
- PR #102 adds four generated-MP4 integration cases through `inspectMedia`: short freeze (warning/pass), excessive freeze (error/fail), short black interval (warning/pass), and excessive black interval (error/fail). Tests assert only the intended finding, continuous audio, aligned stream starts and duration drift below the independent threshold.
- FFmpeg/FFprobe fixture recipes were manually executed on version 7.1.5: frozen intervals measured 2.0s and 3.0s; black intervals measured 0.8s and 1.4s. The repository tests were subsequently exercised by CI; PR #102 and its post-merge main validation passed.
- No video render, full playback or audio listening is applicable to these test-only changes.


## Repository maintenance follow-up — 2026-11-22

- [x] First documentation cleanup merged in PR #124.
- [x] Follow-up audit recorded in `docs/REPOSITORY_CLEANUP_FOLLOWUP.md`: the root scripts and production workflows remain in use, so no speculative removals were made.
- [ ] Complete a lockfile-backed dependency usage audit before changing package dependencies.
- [ ] Perform complete branch ancestry/PR protection analysis and prune safely deletable merged branches when branch-delete capability is available.
- [ ] Analyze source-level unused exports/dead code with a complete import/dynamic-load graph and test evidence.
- [ ] Consider CI modularization only if it preserves all validation gates and demonstrates a measurable benefit.


## Source-level cleanup — 2026-11-22

- [x] Identify and consolidate the duplicated Retry-After/backoff calculation used by NASA and Wikimedia Commons downloaders while preserving each provider's policy.
- [ ] Continue a full import/export and dynamic-reference audit before proposing any dead-code removal.
- [x] Commit an npm-generated workspace lockfile and switch CI/render installs to `npm ci`; verify a clean CI install before merging PR #131.
- [ ] Review cross-provider HTTP/download code for further safe shared abstractions only where tests can prove behavior preservation.


## Dependency metadata cleanup — 2026-11-22

- [x] Move the type-only `@types/three` package to `devDependencies`; preserve the `three` runtime dependency.
- [ ] Generate and commit a reproducible npm lockfile before performing dependency removal or version upgrades.
- [ ] Compare all declared dependencies against actual imports and build/runtime workflows before pruning any package.


## Reproducible npm workspace installs — 2026-11-22

- [x] Add the npm-generated root `package-lock.json` and use `npm ci` in GitHub Actions CI, GitHub Actions rendering and CircleCI rendering (PR #131; final lockfile-backed CI still pending).
- [x] Document clean installs, lockfile updates and dependency-change rules for contributors and agents.
- [x] Complete CI on the committed lockfile, including tests, type-check, project validations and Studio build (PR #131 run #45020893580 passed).
- [ ] Perform dependency-pruning/version-upgrade work separately, after tracing imports, build-time use, scripts, tests and dynamic loading.


## 2026-11-22 — Shot differentiation process gate (PR pending)

Added a shared model-neutral shot differentiation contract and wired it into the producer, visual-QA, agent workflow, startup guide and repository instructions. The gate specifically rejects repeated scene/camera/object composition where only text changes and requires shot-to-code traceability plus actual MP4 inspection. This is a process safeguard; automatic semantic video QA remains unimplemented.
