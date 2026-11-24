# Skill: Storyboard and Shot Design

## Mission

Translate the creative direction into a timed, shootable/editable sequence. A storyboard is an executable audiovisual plan: it must describe what the viewer sees happen, why the shot exists, how it develops over time, and how it connects to neighboring shots. A list of scene headings or cards is not a storyboard.

## Procedure

1. Calculate total frames from duration × FPS. Allocate every frame; account for transitions and overlaps so the timeline does not drift.
2. Break the film into narrative beats, then shots. Each shot must advance the message, reveal information, create emotion, demonstrate something, establish context or provide a deliberate pause.
3. For every shot define:
   - ID, timecode/frame range and duration.
   - Narrative purpose and viewer takeaway.
   - **Visual method** (real/user footage, generated video, still composite, 2D, motion graphics, diagram, typography, 3D, simulation or hybrid) and why it is the best fit.
   - Subject, environment and **concrete action/event**. Describe what happens, not only what is shown.
   - **Visual progression:** start state, development/change, end state. A static hold is valid only when intentionally motivated.
   - Shot size, subject placement, angle, camera position and movement.
   - Motion of subject/object/environment and the intended timing/easing when relevant.
   - Lighting, palette, depth and background.
   - On-screen text: exact copy (if needed), purpose, hierarchy and safe-area placement.
   - Transition in/out and its narrative, motion or compositional motivation.
   - Music, voice-over, ambience and sound effects with timing; include intentional silence when meaningful.
   - Required assets, provenance/rights and honest fallback.
4. Plan visual variety across the whole timeline. Explicitly inspect adjacent and distant shots for repeated framing, scale, layout, visual method, motion and transition patterns. Repetition may be intentional but must be justified.
5. Design transitions as part of the edit. Use hard cuts when they are stronger; do not add wipes merely to demonstrate an effect.
6. Reserve enough screen time for text to be read. Keep copy concise and establish hierarchy. Text should support the visual, not substitute for it.
7. Check that the final shot resolves the opening idea and that the video has a beginning, progression and ending.
8. Before production, run a slideshow-risk review: flag long static shots, repeated card layouts, headline-only scene changes, meaningless camera movement, generic effects and shots with no visible action/progression. Revise the weakest shots.

## Timing rules

- Durations must add up to the requested runtime, accounting for Remotion transition overlaps.
- Avoid uniform shot lengths unless the rhythm intentionally requires them.
- Establish a clear rhythm: hook, development, escalation/contrast, payoff where appropriate. Do not force this structure on every format.
- Avoid changing scene every few frames simply to make the video feel busy.
- For dialogue/voice-over, allow natural pauses and do not overload the frame with text. When narration is required, write the spoken script before locking shot durations; use the recorded/generated voice and word-level alignment as the master timeline. Map each spoken beat to a visual action, footage change, diagram build or intentional pause. Reject a storyboard made mostly of static title cards.

## Required output

A shot table or structured storyboard with: frame/time range, purpose, visual method, subject/action, start→development→end visual progression, framing/camera, motion, text, transition, audio, assets and fallback. Finish with total-runtime check, adjacent-shot variety review, slideshow-risk review and continuity review.

## Engine mapping

The current `ProjectVideo` supports 2D scenes, image/video layers, vector graphics, SVG path draw/morph, deterministic particles, keyframed transforms, scene transitions, captions and global audio tracks. It does not automatically turn natural-language camera directions into real camera animation or provide arbitrary 3D shots. Use a dedicated custom Remotion composition when the storyboard truly requires bespoke 3D or shader work; do not fake it with unsupported JSON properties. Select the method only after verifying its implementation and asset availability.
