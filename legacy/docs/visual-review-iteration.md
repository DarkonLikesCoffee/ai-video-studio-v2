# Visual review correction and re-render workflow

A render is not approved by generating its report or contact sheet. The review report records findings against one exact MP4 hash, then carries those findings through any correction renders.

## 1. Review the first render

The GitHub Actions render artifact contains:

- The MP4 and its SHA-256.
- The contact sheet and sampling report.
- A schema-version-2 `visual-review.json` with the frozen candidate SHA, source commit, request ID, workflow run and first render iteration.

Inspect the actual MP4. A contact sheet is sampling evidence only. Record each issue in `findings` with a stable ID, severity and status. To require correction, set the report status to `rejected` and `decision.approved` to `false`.

## 2. Apply and record corrections

For each open finding, add at least one correction. Corrections must identify the source files or assets changed and the commit that contains the fix:

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

Keep the finding open. A correction is not verified merely because the code changed or the render succeeded.

Commit the reviewed report into the project as `projects/<project>/production/visual-review.json`. Reference it from the next `render-request.json`:

```json
{
  "visualReviewHistoryPath": "projects/demo/production/visual-review.json"
}
```

This is an optional field. Its path must be `production/visual-review.json` inside the same project identified by `projectPath` or `productionPlanPath`.

## 3. Request a new render

Use the ordinary frozen-candidate render flow. The candidate commit must contain each correction's `appliedInCommit`. The workflow checks this using Git ancestry, not by trusting a descriptive note.

The report generator then:

- Rejects the loop if the new MP4 has the same SHA-256 as the rejected render.
- Rejects it if an open finding has no applied correction in the frozen candidate.
- Appends an iteration with the previous and new MP4 hashes, candidate SHA, workflow commit, request ID, run ID and correction IDs.
- Carries findings and corrections forward.
- Reopens prior resolved findings for regression checks.
- Resets prior correction verification for the new MP4, preserving old verification under `verificationHistory`.

If the prior report is rejected but the new frozen candidate does not contain the applied correction commit, report generation fails. Fix the request or candidate instead of bypassing this check.

## 4. Verify against the new MP4

Inspect the new MP4—not just the source diff or contact sheet. For each correction, record evidence in `verification`:

```json
{
  "videoSha256": "<current MP4 SHA-256>",
  "reviewer": "reviewer",
  "reviewedAt": "2026-11-23T12:00:00.000Z",
  "timestampsReviewedSeconds": [12.4, 18.2]
}
```

Set that correction's `verified` to `true` and `status` to `verified`. Its verification hash must equal the current report's `artifact.videoSha256`. Mark a finding resolved only after all corrections for it have been verified; otherwise leave it open.

Then run:

```bash
npm run qa:visual-review-validate -- render-output/review/<output-name>.visual-review.json
```

A report can only be approved after full-video inspection, a reviewer and timestamps are recorded, no blocker or open major findings remain, and all corrections are verified against the current MP4. Approval must also record `inspection.audioReview` as `listened` (with reviewer, time and rationale), `not-listened` (with a reason), or `not-applicable` (with a reason, only for a video without an audio stream). The [final delivery gate](final-delivery.md) checks this declaration against the actual Media QA report.

## Legacy report compatibility

Schema-version-1 review reports can be used as the history input for a first correction render after each correction has been upgraded with a stable id, targetPaths, applied status and appliedInCommit. The generator preserves that original artifact as a legacy first iteration and appends the new schema-version-2 iteration.
