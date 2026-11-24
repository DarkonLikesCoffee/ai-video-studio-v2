# Skill: Remotion Producer

## Mission

Translate the approved storyboard and asset manifest into a valid, deterministic Remotion project that this repository can render.

## Preflight

- Read the current `README.md` and the project types/validator in `packages/video-engine/src/project.ts`.
- Confirm the production plan's `renderStrategy` matches the requested composition ID and renderer.
- Check `scripts/director-compositions.ts`, `schemas/composition-registry.json` and `packages/video-engine/src/root.tsx`; do not select a composition marked reference/test-only or one that is not registered.
- Declare the composition's `renderMode` from its actual implementation: `2d` when it does not require Three.js/WebGL, `3d` when the primary visual scene is Three.js/WebGL and other layers are only supporting overlays or post-effects, and `hybrid` when substantial 2D/SVG/video and 3D/WebGL elements are both part of the visual storytelling. A title, label, vignette or small UI overlay alone does not make a 3D scene hybrid. GitHub Actions and CircleCI use this registry field to choose the renderer flags; do not add or remove WebGL flags through composition-name exceptions.
- If strategy availability is `to-be-built`, implement and register the custom composition and update the capability catalogue before requesting a render.
- Confirm dimensions, FPS and total frame budget.
- Confirm every local media path is under the project's `assets/` folder and exists.
- Confirm all scene, media, graphics, subtitle, particle and audio limits.
- Run `npm run typecheck`, `npm test`, and `npm run validate:project -- <project>/scene.json`.

## Build rules

- Use `ProjectVideo` only when the Director explicitly selected it and its fixed scene layout is appropriate. Never treat it as the automatic fallback for an unimplemented custom composition.
- For ambitious narrated explainers, cinematic edits, layered B-roll, kinetic typography, 2.5D camera moves or per-word synchronized motion, create a scoped custom Remotion composition rather than forcing the concept into `ProjectVideo`.
- Use a custom Remotion composition only when a genuine capability gap requires it (for example real 3D geometry, custom shaders or procedural camera work). Keep it scoped and reusable.
- Prefer actual visual assets and deliberate compositing over piles of generic vector shapes.
- Use varied shot sizes, subject placement and movement. A single static composition with changing text is not a cinematic sequence.
- Use keyframes with purposeful easing; avoid arbitrary oscillation and constant motion.
- Build shots from multiple independently animated layers where appropriate. Give foreground, subject and background distinct movement; use camera paths, parallax and deliberate object entrances/exits to create depth. Do not mistake a single slow zoom for a complete motion design system.
- For narrated projects, make scene timing and visual events derive from the actual voice alignment, not uniform scene durations.
- Keep typography legible, aligned to safe areas and consistent with the art direction.
- Use transitions sparingly and motivate each one.
- Place music, voice, ambience and effects on the project timeline. Mix so dialogue remains intelligible and effects do not dominate.
- Do not add dependencies for novelty. Justify every new renderer, package or workflow dependency.
- Keep project JSON as data; keep renderer logic reusable and type-safe.

## Render discipline

- Render only the target project during creative iteration. The main CI workflow should validate legacy projects without rendering every showcase.
- Use a unique render request ID and descriptive output name.
- Do not create duplicate artifacts for unchanged content.
- Preserve reproducibility: pinned package versions, local assets, deterministic animation and explicit render settings.
- Never call a video "finished" based only on a successful build or composition discovery.


## Mandatory shot-differentiation gate

Before implementing or rendering, read `agent/skills/shot-differentiation/SKILL.md`. Create a shot-to-code implementation audit. Every shot must have an independently describable visual event and composition—not just a different text block. If several shots reuse a scene/component, list the concrete visual state, camera, geometry, asset, layers or action changes that distinguish them. Reject text-only shot variation. The audit and checklist are mandatory, not optional inspiration.
