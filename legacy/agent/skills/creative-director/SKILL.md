# Skill: Creative Director

## Mission

Turn a vague request into a distinctive, coherent creative concept that can be produced with the tools in this repository. Think like a director and creative strategist, not a template filler. The goal is to tell a story visually—not to decorate information with motion.

## Inputs

- User brief and any supplied references/assets.
- Required duration, aspect ratio, resolution, frame rate, platform and language, if specified.
- Brand/product facts and constraints. Never invent factual product claims.

## Procedure

1. Restate the communication goal in one sentence: what should the audience understand, feel or do?
2. Identify audience, context, platform and viewing conditions.
3. Separate hard requirements from assumptions. Resolve only consequential ambiguities with the user.
4. Develop 2–3 genuinely different creative territories internally; select the strongest one against the brief. Do not burden the user with options unless they ask.
5. Compare at least three distinct creative territories internally (e.g. footage-led, graphic-led, 3D/procedural, hybrid), then choose one based on the brief—not familiarity or easiest implementation. Define one creative thesis, emotional arc, visual metaphor, visual system (palette, type, materials, lighting, composition), motion language, sound identity and narrative structure. Establish a visual grammar with one or two motifs and how they evolve or deliberately break.
6. Decide how the video should communicate: show an event, action, transformation, demonstration, comparison, visual metaphor, reveal, environment or human/subject behavior. Prefer showing over explanatory text when the concept can be visualized.
7. Select a production method for each planned beat/shot. Possible methods include real/user footage, generated video, still-image compositing, 2D animation, motion graphics, typography, diagram, Three.js/3D, simulation or hybrid. Choose based on the creative need and verified engine/provider capability—not familiarity or convenience.
8. Select ONE whole-video Remotion composition from `scripts/director-compositions.ts`. Read its purpose, strengths and limitations. Choose `ProjectVideo` only when its recurring fixed layout fits the concept; otherwise select a fitting registered custom composition or mark a new custom composition as `to-be-built`. Record renderer, composition ID, status, rationale, required capabilities and fallback in `renderStrategy`.
9. Check the concept against available assets, rights, costs and engine capabilities. If a shot requires unsupported capability, either choose an honest producible alternative or propose a small reusable extension. Do not fake unavailable camera/3D/physics capabilities with schema fields.
10. Make the visual concept concrete and producible. Identify the subject, action, environment, camera, composition, and what changes over time. Every shot must be a distinct visual event—not just an image with new text, color or background. A shot that merely says “show the concept” is not production-ready.
11. Write a concise creative brief and measurable acceptance criteria before storyboarding.

## Required output

- Working title and one-sentence concept.
- Audience and intended response.
- Narrative/emotional arc with beginning, development and payoff.
- Art direction: palette, typography, composition, texture/material, lighting and visual references described in words.
- Visual storytelling approach: what the audience sees happen; planned visual metaphors, demonstrations, comparisons, actions or reveals.
- Whole-video composition decision: selected renderer and composition ID, whether it is already registered or must be built, why it fits the concept, required capabilities and an honest fallback.
- Production-method strategy: which methods suit individual shots and why; key capability gaps.
- Motion direction: camera language, subject/object/environment motion, movement tempo, transitions and restraint.
- Sound direction: music character, sound effects, ambience, voice-over/dialogue if relevant.
- Platform/delivery specification.
- Assumptions, factual claims requiring verification, rights/asset constraints and costs.
- 3–6 acceptance criteria that can be checked in the final video.

## Direction rules

- Prefer one strong idea over a collage of unrelated effects.
- Every visual choice must support the message, mood or product.
- Every shot should have a purpose and visual development; avoid sequences where only the headline or background changes.
- Avoid generic AI-video clichés: random particles, meaningless HUD overlays, arbitrary glowing rings, repeated centered product shots, title cards used to hide weak footage.
- Avoid defaulting to text cards, static illustrations or diagrams for concepts that could be demonstrated visually.
- Avoid using the same framing, scale and screen position for consecutive shots unless repetition is intentional.
- Build contrast through shot size, camera angle, movement, negative space, pace, light and sound—not merely color changes or transition effects.
- Use effects selectively and with motivation. Never add zooms, glitches, whooshes or beat cuts at fixed intervals just to increase activity.
- Give the opening a clear hook and the ending a deliberate payoff.
- Do not invent testimonials, performance claims, specifications, awards or endorsements.
