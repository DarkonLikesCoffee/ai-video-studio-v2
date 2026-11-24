# Skill: Narrated Video Producer

## Mission

Produce explainers, educational videos, stories and short-form videos that feel like edited audiovisual pieces, not slide decks. The narration, edit, motion, footage, music, sound effects and captions form one coordinated timeline.

## Non-negotiable production model

1. **Narration is the clock.** Write and fact-check the spoken script first. Generate or import the voice track, then obtain word-level timestamps. Build the visual timeline around the actual speech; never squeeze or accelerate narration to fit arbitrary scene durations.
2. **A shot must change.** Every shot needs an observable action: subject movement, camera move, parallax, reveal, transformation, tracked graphic, footage edit, kinetic typography or a deliberate still hold. A slow zoom on a static illustration is not sufficient for a full shot.
3. **Use footage when footage is the right answer.** Source or generate shot-specific B-roll, environments, objects, people and details. Use diagrams and motion graphics to explain abstract ideas. Do not replace every visual with a centered title over an SVG.
4. **One visual language, varied shot grammar.** Define a style bible, then vary shot size, angle, depth, movement, pace, lighting and composition. Do not repeat the same framing and title layout shot after shot.
5. **Sound is edited, not pasted on.** Place voice, music, ambience, Foley and designed SFX deliberately. Duck music under speech. Tie important effects to exact visual events. Use silence and contrast where appropriate.
6. **Captions follow speech.** Prefer word- or phrase-level alignment from the actual voice recording. Keep captions readable, correctly timed, within safe areas and visually subordinate to the story. Use per-word highlighting only when it serves the format; the current built-in adapter can render active-word highlighting.
7. **Review the rendered artifact.** Inspect contact sheets and motion at shot boundaries, listen to the actual mix when playback is available, and rerender after meaningful corrections.
8. **No false capability claims.** Never say narration, footage, music or SFX were generated unless the corresponding asset exists and was verified.

## Workflow

### 1. Brief and script
- Establish audience, purpose, platform, language, runtime and aspect ratio.
- Write a spoken script with a strong hook, coherent progression and payoff.
- Separate narration from visual direction; only spoken words go to TTS or transcription.
- Fact-check claims and retain source notes for factual explainers.
- Estimate duration from the spoken script and natural delivery, not from a fixed slide count.

### 2. Voice and alignment
- Use one consistent voice for a series.
- For opt-in generated speech, use the built-in Kokoro ONNX render-worker adapter (Spanish and US English only in this first version). It runs on the CI worker without a hosted TTS API or API key. Do not install the model on the user's device.
- Produce a dry-run showing provider, voice, language, characters/minutes and estimated cost before any paid request. Never spend money or use a paid API without explicit user consent.
- Cache audio by a hash of provider, voice, model, language, exact spoken text and voice settings.
- Preserve the original recording and provenance. Verify generated/imported audio against the script using transcription where available.
- For Kokoro-generated narration, use its model-reported phoneme durations to derive word timings; fail rather than guessing if the mapping cannot be verified. This first adapter does not force-align arbitrary uploaded voice recordings. If only phrase-level timing is available, label it honestly and use phrase captions.

### 3. Visual direction and storyboard
- Create a style bible: palette, typography, texture, lighting, depth, camera language, motion language and caption treatment.
- Build a shot list with purpose, time range, subject/action, framing, camera path, layers, assets, on-screen text, transition and audio cues.
- Include a mix of live-action/B-roll, close details, environmental shots, diagrams, animated objects, typography and visual metaphors as appropriate to the topic.
- Plan motion continuously: foreground/background separation, parallax, camera curves, object lifecycle, staggered entrances, meaningful exits and motivated cuts.
- Reject repeated static title cards and decorative motion that adds no information.

### 4. Build and edit
- Use custom Remotion compositions/components for expressive scenes. ProjectVideo is a compatibility renderer for projects that fit its schema, not the creative ceiling of the studio.
- Keep scene state deterministic as a pure function of frame/time.
- Drive visual events from word/phrase timestamps where narration is present.
- Use actual media assets and compositing where they materially improve the result. Track asset origin, license and restrictions.
- Build caption data from verified alignment. Keep captions to short readable chunks, with deliberate line breaks, contrast, margins and per-platform safe areas.
- Create an SFX cue sheet with source, frame/time, duration, gain, fade and the action it supports. Avoid generic whooshes on every cut.
- Mix narration as the priority; sidechain or automate music ducking, leave headroom for effects, and master to the target platform.

### 5. Validate and review
- Validate script, assets, timing, caption coverage, overlaps, safe areas and cue-sheet references before rendering.
- Render a contact sheet covering the opening, middle, ending, every shot boundary and important motion peaks.
- Inspect actual video frames and compare adjacent shots for visual variety.
- Watch the full video when possible. Measure codec, resolution, FPS, duration, audio streams, loudness and true peak.
- Check narration against the script and captions against the spoken audio. Report if audio was measured but not actually listened to.
- Fix blockers and major issues before delivery. A successful CI run is not a quality pass.

## Acceptance criteria

A narrated video is not complete unless:
- The voice-over is present, intelligible and synchronized, or the brief explicitly requested no narration.
- Every shot has a purposeful visual action or a deliberate stillness.
- Consecutive shots are not repetitive slides.
- Captions are readable, synchronized and safe-area compliant.
- Music supports the narrative and sits below the voice; important SFX are audible and synchronized.
- The ending resolves the narrative.
- The final MP4 has been inspected, not merely rendered.
- Asset provenance, licenses, provider and cost status are recorded.

## Fallback policy

If the required language or voice is not supported by the built-in Kokoro adapter, do not silently substitute another voice or invent alignment. Continue with a supplied recording and honest phrase-level timing, or mark narration generation as blocked. Do not call paid APIs until the user has approved the quoted cost.
