# Supplying gameplay footage

The ProjectVideo narration pipeline can now place reviewed local video clips behind a scene's existing vector overlays and captions. This is the preferred path for authentic gameplay when the project owner recorded the footage or has permission to use it.

## 1. Prepare clips

- Choose short clips that show the exact action described by a storyboard shot: opening pressure, a clean duel, reading utility/positions, an isolated peek, a coordinated execute, and a closing payoff.
- Prefer 16:9, 1080p, 30 or 60 FPS, MP4/H.264. Keep the original frame rate where practical.
- Trim each source to a useful moment. Remove loading screens, menus, long dead time and unrelated rounds.
- Hide or crop personal identifiers if you do not want them in the final video (player names, chat, friend lists, account IDs).
- Keep source audio muted by default; the edit uses its own narration, score and effects.
- Do not include clips you do not own or have permission to use. A clip being publicly viewable does not make it reusable.

## 2. Add files

Place selected clips under:

`projects/valorant-immortal-decision-making/assets/`

Use simple filenames with letters, numbers, dots, underscores or hyphens, for example `ranked-duel-01.mp4`. Keep clips small enough for the repository's configured asset delivery route. Do not commit large raw recordings; use short trimmed selects. If the clips are too large for normal Git hosting, do not silently switch to an unapproved paid storage service—choose a supported storage path first.

## 3. Assign clips to storyboard shots

Edit `production/asset-manifest.json` and add entries to its `assets` array. The shot IDs must match the scene/shot IDs in `production/production-plan.json`:

- `the-hook`
- `aim-isnt-everything`
- `read-the-round`
- `the-ego-peek`
- `the-better-play`
- `play-smarter`

Example for footage recorded by the project owner:

```json
{
  "path": "assets/ranked-duel-01.mp4",
  "file": "ranked-duel-01.mp4",
  "type": "user-provided-gameplay",
  "rightsBasis": "user-owned",
  "rightsNote": "Recorded by the project owner in their own ranked matches.",
  "shotIds": ["aim-isnt-everything"],
  "trimBeforeSecondsByShotId": {
    "aim-isnt-everything": 8.4
  },
  "provenance": "User-supplied gameplay recording; source file retained by the project owner."
}
```

For footage recorded by someone else, use `rightsBasis: "permission-granted"` and describe the permission in `rightsNote`. The renderer will not accept user-supplied footage without both an explicit rights basis and a meaningful note. Do not claim ownership unless it is true.

Licensed Commons/NASA assets keep their source page, creator, license and license URL. User-provided clips are recorded separately in the credits; they are not mislabeled as public-domain or Creative Commons.

## 4. Render behavior

When narration is applied, the footage is mapped to matching shot IDs and added as a muted full-frame background layer. Existing vector overlays, captions and typography remain on top. Scene duration is taken from the narration-retimed project, so footage stays aligned when the spoken duration changes.

If a shot has no selected clip, its original illustrative visual remains. The pipeline does not invent footage or substitute an unrelated clip.

## Privacy and publication

Check the whole clip before publishing. Crop or blur player names, chat, voice comms and other identifiers if needed. Confirm the game publisher's current fan-content rules and any third-party rights that appear in the recording. The rights note is a record of the user's assertion, not an independent legal verification.
