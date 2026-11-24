# Final video delivery gate

A render artifact is a review package, not a final delivery. The render workflow deliberately creates a pending-review visual-review report. Only the separate manual delivery workflow can publish an approved final package.

## Required inputs

The final gate downloads the render artifact from one exact GitHub Actions run and compares it with the approval report committed on main. It verifies:

- The approved schema-version-3 visual-review report passes the visual-review validator.
- Its output name, render run ID, source commit, request ID, latest iteration and SHA-256 all identify the downloaded MP4.
- The MP4 size, duration, dimensions, frame rate and codec agree with the passing Media QA report.
- The contact-sheet sample report covers the same duration.
- Every file listed in the render-provenance manifest exists and matches its recorded size and SHA-256; the manifest includes the MP4, Media QA, contact sheet and asset-evidence files.
- Asset evidence is ready, or explicitly not-applicable with a reason.
- The review report records full tracked playback and an explicit audio decision.

The gate verifies evidence consistency and required review decisions. It cannot prove a person's identity, prove that audio was actually listened to, or decide whether the video is artistically good.

## Review and approval

1. Complete the render and download the review artifact named exactly as the outputName. The artifact is retained for 30 days.
2. Inspect the actual MP4 against the brief and acceptance criteria. Use the contact sheet to find relevant moments, but do not treat it as a substitute for playback.
3. Complete the tracked playback session with tools/visual-review-player.html, then import it into the report with npm run qa:visual-review-session.
4. Record findings and corrections. Verify corrections against the current MP4 hash. Set the visual-review report to approved only when the acceptance criteria are met and the validator permits approval.
5. Record the audio decision inside inspection.audioReview before approval.

For audio that was listened to:

~~~json
{
  "audioReview": {
    "status": "listened",
    "reviewer": "reviewer",
    "reviewedAt": "2026-11-23T12:00:20.000Z",
    "rationale": "Listened to the complete soundtrack; speech, music and effects are clear and synchronized."
  }
}
~~~

When audio could not be listened to, record the limitation instead of implying it was reviewed:

~~~json
{
  "audioReview": {
    "status": "not-listened",
    "reason": "Audio playback was unavailable in the review environment."
  }
}
~~~

Use status not-applicable with a reason only when the MP4 has no audio stream. The final delivery gate cross-checks that decision against Media QA. A not-listened decision does not block delivery by itself, but the final manifest explicitly states that audio was not listened to and that technical measurements are not a substitute.

Commit the completed report on main at the project path projects/<slug>/production/visual-review.json. The report must refer to the exact MP4 hash and render run being delivered.

## Publish the final package

Run the manual workflow from the repository's Actions tab (Final video delivery → Run workflow) or use GitHub CLI:

~~~bash
gh workflow run final-delivery.yml \
  --ref main \
  -f render_run_id=123456789 \
  -f output_name=my-video \
  -f review_report_path=projects/my-video/production/visual-review.json
~~~

Replace the example run ID, output name and report path with the actual values. The output name must be exactly the artifact name uploaded by the render workflow.

The workflow downloads that artifact, validates it against the committed approval report and uploads my-video-final-delivery only when all checks pass. A failed gate does not publish a final artifact. The package contains the approved MP4, the approved review report, media QA, contact sheet, asset evidence, render provenance, optional credits and my-video.delivery.json.

## Delivery manifest

The outputName.delivery.json file is the machine-readable release receipt. It records the render run and source/candidate commits, request and composition IDs, final MP4 hash and technical metadata, reviewer decision, audio-review status, QA summary, asset-evidence status, and file hashes for the delivered package.

The report always includes limitations: playback telemetry is editable rather than signed identity proof; audio listening is reviewer-provided evidence; and creative acceptance remains the reviewer's judgment. A successful final gate means the declared approval and artifact evidence are consistent—not that automated tooling has independently judged the video's artistic quality.
