# AI Video Studio — Agent Production System

This directory defines the operating procedure for an AI agent producing complete videos with this repository. It is an orchestration layer, not a replacement renderer or an autonomous model runtime.


## Model-neutral responsibility boundary

This workflow is intended for any assistant that can read and work with the repository; it does not depend on ChatGPT, Claude or a particular model provider.

- The assistant in the current conversation is the director and production decision-maker. It interprets the brief, chooses the visual approach, authors the storyboard, builds scenes and reviews the result.
- This repository does not contain an embedded general-purpose LLM director. The `director:*` and `storyboard:*` commands create structured handoffs, reports, validators or revision artifacts; they do not call an LLM or make creative judgments on their own.
- The rendering engine executes deterministic projects. It does not independently invent the story, source every asset, understand the finished video or autonomously repair weak scenes.
- `agent/skills/` is the canonical shared playbook library for all assistants. The vendored `.claude/skills/` files are optional Claude Code integration, not a dependency for other assistants.
- Upstream skill examples and provider names do not mean their CLIs, API keys or paid services are configured here. Follow this repository's implementation and integration notes, and obtain explicit consent before any paid service.

Do not claim autonomous behavior for a prompt, checklist, script handoff or deterministic validator. Be clear about which decisions the current assistant made and which checks the repository actually executed.

## Production pipeline

1. **Brief** — extract objective, audience, platform, duration, format, constraints and success criteria.
2. **Creative direction** — choose one coherent concept, visual language, narrative arc and emotional progression; decide what the audience will actually see happen.
3. **Composition selection** — choose one whole-video Remotion composition using the verified catalogue in `scripts/director-compositions.ts`. Record it in the production plan's `renderStrategy`, including renderer, registered/to-be-built status, rationale, required capabilities and fallback. This is distinct from per-shot visual methods.
4. **Storyboard** — plan every shot with purpose, concrete subject/action and visual progression, production method, duration, composition, camera/motion, transitions, text rationale and sound.
5. **Per-shot method selection** — choose from verified methods (footage, generated media, 2D, motion graphics, diagrams, typography, 3D, simulation or hybrid). The method is chosen to serve each shot, not applied uniformly.
6. **Asset production** — generate or source the required footage, images, illustrations, 3D elements, voice and sound; record provenance. For supported Spanish/US English narration, a Kokoro ONNX adapter can generate speech and phoneme-derived word timings on the render worker. Before build, run `npm run director:asset-evidence -- <production-plan.json> [asset-manifest.json] [report.json]` to connect criterion→shot mappings to manifest assignments and local/provenance/rights checks. Review incomplete mappings and missing files; the render workflow enforces `--strict` when a production plan and manifest exist and includes the report in its artifact. This report does not semantically verify assets or criteria.
7. **Build** — translate the approved plan into a valid `VideoProject` (`projects/<slug>/scene.json`) and local assets.
8. **Render** — submit a unique `render-request.json` and wait for the selected provider.
9. **Visual QA** — inspect the actual MP4, not only CI status; review a contact sheet, keyframes, motion, pacing, audio and technical metadata. Specifically check for slideshow-like repeated layouts, shots without meaningful action/progression, and generic/unmotivated effects.
10. **Iterate** — fix the highest-impact issues, rerender only the target project, and repeat until it passes.
11. **Deliver** — provide the MP4/artifact, a concise change log and known limitations.

## Pre-production storyboard review

Before full production, generate a lightweight HTML planning preview with `npm run storyboard:preview -- <production-plan.json> <output.html>`. It lays out the authored shots in timeline order and exposes their action, progression, visual method, framing, camera, transitions and audio cues. It is not a rendered or animated video and does not inspect assets or semantically approve the story. Use it as a review checkpoint, then revise the plan before asset production/rendering.

## Deterministic storyboard risk review

The `npm run storyboard:qa -- <production-plan.json>` command provides warning-only signals for long shots, static camera holds, repeated adjacent visual method/framing/camera movement, repeated recognized shot scale and low recognized shot-scale variety in longer sequences. It also flags vague descriptions/actions, missing progression markers, highly similar adjacent visuals and lengthy on-screen copy. Shot scale is inferred from common phrases (extreme close-up/macro/close-up/medium/wide); unknown framing text is excluded, and variety warnings require most shots to be recognizable. These transparent heuristics are not semantic QA or a creative verdict. Do not automatically fail or rewrite a plan from warnings alone.


## Production intelligence checklist

Before building scenes, the plan must answer:
- Which whole-video composition is selected, and why does its documented scope fit the entire brief?
- Is that composition actually registered and selectable, or does it still need to be built?
- What is the audience supposed to understand, feel or do?
- What is the creative thesis and narrative progression?
- What visually happens in each shot? What changes from its start to end?
- Why is this visual method selected for this shot?
- How do framing, camera, subject motion, timing and audio support the shot?
- How does this shot contrast with and connect to its neighbors?
- What capabilities or assets are missing, and how are they honestly handled?

Avoid producing a video by defaulting to title cards, static diagrams, a background image with text, or repeated layouts. Do not add movement or SFX indiscriminately. The production plan is not a renderable project; it must be translated into supported engine capabilities and validated.

## Skills

Use these skill files as focused playbooks. Apply all relevant skills; do not treat them as independent agents that can silently contradict one another.

- `skills/creative-director/SKILL.md`
- `skills/storyboard/SKILL.md`
- `skills/asset-producer/SKILL.md`
- `skills/remotion-producer/SKILL`
- `skills/audio-designer/SKILL.md`
- `skills/visual-qa/SKILL.md`
- `skills/narrated-video-producer/SKILL.md` — mandatory for explainers, educational videos, stories and short-form videos with narration.
- `EXTERNAL_SKILLS.md` — reviewed upstream skill references, installation guidance and license notes.
- `.claude/skills/video-engine/` — vendored MIT video-engine skill and repository-specific integration notes, automatically discoverable by Claude Code.

## Source of truth and boundaries

- `scripts/director-compositions.ts` is the model-facing catalogue of registered compositions, their strengths, limitations and selection status. Keep it synchronized with literal composition IDs in `packages/video-engine/src/root.tsx`.
- The production plan's `renderStrategy` selects one whole-video renderer/composition. The render workflow rejects a request if its composition differs from the linked plan or is not registered. A `to-be-built` choice must be implemented and registered before rendering.
- The existing Remotion project schema and validator in `packages/video-engine/src/project.ts` are authoritative for what `ProjectVideo` can render. `ProjectVideo` is a compatibility renderer, not the creative ceiling: use a custom Remotion composition when the brief needs richer camera work, kinetic typography, layered footage, complex motion or narration-synchronized scenes.
- Read `README.md` before building. Do not invent engine capabilities or silently add unsupported fields to `scene.json`.
- A storyboard is a production plan, not a renderable project. Keep it separate from `scene.json`.
- Keep source assets inside each project's `assets/` directory. Prefer local, reproducible assets over remote URLs.
- Request generated narration by adding a `narrationPath` pointing to a version-1 narration config under `projects/`. This adapter currently supports Spanish and US English; see the root README. Do not add an existing voice-over track to the same request.
- Never claim an asset was generated, licensed, downloaded, rendered or inspected unless that action actually succeeded.
- Do not use copyrighted characters, logos, music or footage as if they were cleared. Record source, creator, license/permission and any restrictions.
- Never expose API keys, tokens or private user data in project files, prompts, logs or artifacts.

## Autonomy and decision policy

Make ordinary creative and technical decisions without interrupting the user. Ask one concise question only when a missing requirement materially changes the deliverable (for example, the requested product/brand is unknown and must be depicted accurately). Otherwise state sensible assumptions in the brief and proceed.

Do not ask the user whether to merge a PR. Merge only after required tests pass and the final rendered video has been visually inspected and meets the acceptance criteria. If quality fails, revise and rerender.

## Quality principle

A successful render is not necessarily a successful video. CI proves reproducibility and technical validity; visual QA proves whether the result communicates, looks and sounds intentional. For narrated work, the voice track is the timing master: align the actual spoken audio first, then build shots, captions and SFX around it. Do not ship slide-like sequences, repeated static title cards or music-only output when narration is part of the brief. Optimize for the brief and audience, not for the number of effects, scenes or technologies used.

## Expanded deterministic storyboard quality review

The storyboard QA CLI includes warning-only signals for potentially vague visual/action descriptions, progression that lacks explicit Start/Development/End phases, highly similar adjacent visual descriptions and lengthy on-screen copy. Treat these as prompts to rewrite the weakest shots—not hard rules. The heuristics cannot understand narrative intent or judge rendered creative quality.

## Storyboard critique report

Use `npm run storyboard:critic -- <production-plan.json> [output.md]` to turn existing deterministic QA warnings into prioritized, specific revision suggestions. The critic is review-only: it never edits the source plan, does not call an AI model, and does not approve creative quality. Apply changes to a separate copy and rerun plan validation and storyboard QA.


## Traceable storyboard revision workflow

Use the versioned revision artifact rather than editing the source plan in place:
2. Run `npm run storyboard:revision -- init <production-plan.json> <revision.json>` to preserve source text/plan, SHA-256, and critic suggestions (unselected).
3. Review the artifact; explicitly mark suggestions selected and add concrete edits under `edits` with `shotId`, `changeNote`, and field updates. Do not treat selection as auto-application.
4. Run `npm run storyboard:revision -- validate <revision.json>` to store schema errors and QA warnings.
5. Run `npm run storyboard:revision -- apply <revision.json> <revised-plan.json>` to write a separate revised plan; the original remains untouched.
6. Run `npm run validate:plan -- <revised-plan.json>` and `npm run storyboard:qa -- <revised-plan.json>` before production.

The CLI verifies that the source file and embedded source text still match the recorded SHA-256 and that the preserved source object matches its text. A source change requires a fresh artifact. Validation errors are hard failures; heuristic warnings are review prompts only.
