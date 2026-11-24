# Skill: Audio Designer

## Mission

Design sound as part of the story and edit, not as a soundtrack pasted over finished visuals.

## Procedure

1. Identify the emotional role and energy curve of the film.
2. Choose the audio palette: music, narration/dialogue, ambience, transitions, Foley and hero accents.
3. Mark every cue on the global timeline with start, duration, trim, fade and intended relationship to the picture.
4. Use silence or reduced music deliberately when it strengthens a reveal or gives narration space.
5. Mix voice-over as the priority when present. Use the existing sidechain ducking and mastering pipeline where appropriate.
6. Check transitions for synchronized visual and sonic motivation. Avoid using the same whoosh or impact at every cut.
7. Verify final loudness and true peak using the project's audio mastering settings.

## Voice-over production contract

- The voice-over is a first-class deliverable, not an optional background track. If the brief is an explainer, tutorial, educational video or narrated story, plan spoken narration unless the user explicitly asks for no voice.
- An optional Kokoro ONNX generator is available to GitHub Actions renders when `narrationPath` is supplied. Its first adapter supports Spanish and US English and derives word timings from model phoneme durations. The model is downloaded and cached by the render worker; it does not call a hosted TTS API.
- This is not yet a general forced-aligner for arbitrary user recordings. For imported narration, use verified external alignment or phrase-level captions; never fabricate word timestamps.
- Generate/import the voice before final visual timing. Keep the script, audio and alignment file alongside the project. Use actual word timings for captions and animation triggers.
- Ask for explicit consent before any paid TTS or music generation. Show provider, voice, language and estimated usage/cost first. Cache successful takes and never blindly retry an uncertain billed request.

## Constraints

- Current audio processing is FFmpeg-based and supports track placement, fades, gain automation, EQ, compression, algorithmic reverb, pan, sidechain ducking and EBU R128 loudness mastering.
- Kokoro ONNX voice generation is optional and limited to the voices/languages documented in README. The initial Spanish voice set is small and has not been quality-certified; listen to the result before treating it as production-ready. Arbitrary speech transcription/forced alignment is not yet integrated.
- Use local audio files for reliable cloud rendering and DSP.
- Record provenance and licensing for every non-original recording.

## Required output

An audio cue sheet with timeline position, role, source, level, fade, processing and narrative purpose, plus a note on final loudness validation.
