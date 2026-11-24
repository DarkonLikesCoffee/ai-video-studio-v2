# Skill: Shot Differentiation and Implementation Contract

## Purpose

Prevent videos that reuse one scene, camera, subject pose and motion while only changing text. Every planned shot must have a distinct visual purpose and an implemented visual event.

## Before implementation

For every shot, write a compact shot card with:

- **Visual subject:** what the viewer actually sees (not a headline or narration).
- **Composition:** shot scale, camera angle, subject placement, foreground/background and depth.
- **Visual event:** an observable action or state change that happens during the shot.
- **Camera event:** an intentional camera change, if any. Camera motion alone does not make the shot distinct.
- **Transition:** how this shot enters/leaves and why.
- **Connection:** what new information or emotion this shot contributes compared with the previous one.

Compare every adjacent pair. If the difference can be described only as “new text”, “different color”, “slightly zoomed” or “same object with a different label”, redesign the shot.

## Minimum shot variety

Use the brief, not a formula, to choose a sequence. When appropriate, vary:

- Wide/environmental establishing views vs macro/detail vs medium/hero framing.
- Subject orientation, silhouette and screen placement.
- Background, location, lighting setup, focal depth and foreground elements.
- Visual medium: real footage, photographic assets, 2D motion graphics, typography, product macro, 3D, diagram, texture or mixed-media.
- Subject action/state: reveal, assembly, interaction, transformation, movement through space, consequence or reaction.
- Editing rhythm: cut, match cut, motivated transition, split-screen or deliberate hold.

Do not force variety by random effects. Each shot must serve the story and preserve visual coherence.

## Implementation contract

Before rendering, produce a shot-to-code audit (in the production notes) mapping every storyboard shot to the exact component/function and source files that implement it. For each shot, list the implemented visual event and the frames where it is observable.

The audit must be based on the actual implementation—not merely copied storyboard wording. If multiple shots reuse a component, explain which concrete props, layers, geometry, camera state, asset, animation or composition changes make them visually distinct. Reusing a generic scene with only title/description props fails.

A shot that intentionally holds may do so for a readable hero frame, emotional beat or deliberate pause. Document why. Do not invent motion for a hold.

## Pre-render rejection checklist

Stop before rendering if any answer is “no”:

1. Can I describe the visual difference between every adjacent shot without mentioning text?
2. Does every shot have its own composition/framing or a meaningful visual state change?
3. Is every claimed action actually implemented in source code?
4. Does each shot's motion/event happen within its timeline and remain visible at its planned checkpoints?
5. Does the video use more than one camera move over the same unchanged scene as a substitute for editing, unless the brief intentionally calls for it?
6. Is the storyboard implemented rather than merely approximated by a shared template?
7. Have I checked the actual source and preview/contact sheet for repeated scene composition before requesting the final render?

If the project fails, revise it during BUILD. Do not render to discover a design failure.

## Post-render acceptance

Inspect the rendered MP4 at shot boundaries and regular intervals. Compare it to the shot-to-code audit. If the contact sheet shows the same background, object silhouette, camera path and layout recurring with only copy changes, mark visual variety as a **major failure** and block delivery. Fix the composition and render a new frozen candidate.

This checklist is model-neutral and applies to ChatGPT, Claude and any other assistant building projects in this repository.
