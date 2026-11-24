# Skill: Visual QA and Iteration

## Mission

Judge the actual rendered video as an editor, cinematographer, motion designer and audience member. Passing CI is necessary but insufficient.

## Technical inspection

- Confirm MP4 exists and can be decoded from beginning to end.
- Check resolution, FPS, frame count, duration, video/audio codecs and audio stream presence.
- Check for missing media, black frames, corrupted frames, clipping, unexpected freeze frames and abrupt audio endings.
- Listen to the full audio or representative sections; inspect loudness/peaks when tools are available.

## Visual inspection

1. Extract a contact sheet at regular intervals (typically 1 frame per second for short videos).
2. Extract keyframes at every shot boundary and at the most important action/reveal moments.
3. Inspect the images. Do not infer visual quality from source code or render logs.
4. Watch the complete MP4 when playback is available. Contact sheets cannot reveal bad motion, timing, stutter or audio sync.
5. Evaluate:
   - Does the opening hook the intended audience?
   - Is the message clear without reading the production notes?
   - Does every shot change meaningfully over time?
   - Is there visual variety in scale, angle, depth, subject placement and movement?
   - Are subjects and products visible, coherent and consistent?
   - Are typography, contrast, safe areas and reading time correct?
   - Do cuts/transitions feel motivated and rhythmically intentional?
   - Is voice-over present when the brief calls for it, and does it match the script?
   - Do captions match the actual spoken words and remain synchronized throughout?
   - Does music duck under speech, and are important SFX audible and synchronized to their visual actions?
   - Does sound support the picture without masking speech?
   - Does the ending deliver a memorable payoff?
6. Compare against the creative brief and acceptance criteria, not personal taste alone.

## Issue triage

For each issue record: timestamp/frame, severity (blocker/major/minor), observable symptom, likely cause, proposed correction and how to verify the fix.

Fix blockers first, then major issues. Prefer a small number of high-impact corrections over random parameter tweaking. Change one coherent set of variables per iteration so improvements can be attributed.

## Acceptance gate

Do not mark a video complete unless:
- All technical checks pass.
- No unresolved blocker or major issue remains.
- The creative acceptance criteria are met.
- The actual rendered MP4 has been visually inspected.
- The final artifact is traceable to the exact source commit and render run.

If it fails, report that it failed and iterate. Never equate a green CI check with professional visual quality.


## Shot repetition is a major failure

Read `agent/skills/shot-differentiation/SKILL.md` and compare the actual MP4 contact sheet with the storyboard and shot-to-code audit. At every shot boundary, verify a meaningful change in visual subject, framing, scene, depth, action or medium. Repeated background + same object silhouette + same camera path with only copy changes is a major failure. Do not deliver; require targeted rebuild and a new frozen render candidate.


## Correction and re-render loop

The visual-review report is the durable review record. When a render is rejected:

1. Keep each finding open until the issue is fixed and rechecked on a later MP4.
2. Add a correction with a stable ID, the finding ID, a concrete description, repository-relative `targetPaths`, `status: "applied"`, and the full commit SHA in `appliedInCommit`. The correction commit must be an ancestor of the frozen candidate commit used by the next render.
3. Commit the reviewed report in the same project at `production/visual-review.json`. Set `visualReviewHistoryPath` in the next `render-request.json` to that file. The path must belong to the selected project.
4. The render workflow appends a new iteration only when the MP4 hash changes and every open finding has an applied correction included in the candidate. A failed check means the iteration must not be recorded.
5. Inspect the new MP4. Re-verify every correction against this exact artifact hash; do not carry verification forward from an older render. Add `verification.videoSha256`, reviewer, review timestamp and timestamps checked, set `verified: true` and `status: "verified"`, then mark the finding resolved when all its corrections have been verified.
6. Record `inspection.audioReview`: use `listened` with reviewer, timestamp and rationale when audio was heard; use `not-listened` with a reason when it was not; use `not-applicable` only when the MP4 has no audio stream. Run `npm run qa:visual-review-validate -- <report.json>`. Approval still requires full-video inspection and the acceptance gate above.

A subsequent render reopens previously resolved findings for re-checking and moves older correction verification into `verificationHistory`. This is intentional regression protection. Schema-version-1 reports can be used as the first, legacy iteration after their corrections are upgraded with stable IDs, target paths, applied status and commit SHAs; all new reports use schema version 3.

Example correction:

```json
{
  "id": "C-001",
  "findingId": "F-001",
  "description": "Replace the repeated skyline shot with a distinct low-angle tracking shot.",
  "targetPaths": ["projects/demo/src/Scene.tsx"],
  "status": "applied",
  "appliedInCommit": "<40-character correction commit SHA>",
  "verified": false
}
```

After inspecting the new MP4, verification must refer to its current `artifact.videoSha256`:

```json
{
  "videoSha256": "<current MP4 SHA-256>",
  "reviewer": "reviewer",
  "reviewedAt": "2026-11-23T12:00:00.000Z",
  "timestampsReviewedSeconds": [12.4, 18.2]
}
```


## Tracked full-video playback

Before approving a new render, use `tools/visual-review-player.html` with the exact MP4 downloaded from the render artifact:

1. Select the matching `<output-name>.mp4` and wait for its SHA-256 and duration to load.
2. Play from the beginning through the native `ended` event at 1× speed. Pausing/resuming is allowed. Do not seek, hide the tab or move focus away from the review window.
3. Export `visual-review-session.json` only after the player confirms continuous coverage and the five start/quarter/half/three-quarter/end checkpoints.
4. Import the session using `npm run qa:visual-review-session -- --report <report.json> --session <session.json> --reviewer <name>`.

The importer binds the session to the report's current MP4 SHA-256 and duration, then sets the inspection method and timestamps. It does not approve the video. Complete the substantive creative review, record findings and correction verification, explicitly set the final decision, and run `npm run qa:visual-review-validate -- <report.json>`.

The playback JSON is editable telemetry, not a signed or identity-verified attestation. Never describe it as cryptographic proof that a particular person watched the video. It establishes consistency with a full normal-speed playback session as recorded by the local player; visual-quality judgment remains a human responsibility.
