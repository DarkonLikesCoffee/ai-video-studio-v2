# Integration notes for AI Video Studio

The upstream video-engine skill is vendored under this folder at commit cf35b05a9ecf3e878eff30c9ffaa8a911248d7c5 (MIT; see LICENSE). Keep its source and attribution intact. These notes define how to use it safely in this repository and take precedence over generic upstream assumptions.

## Existing project rules take precedence

- Follow `AGENTS.md` and `START_HERE.md`; use the shared workflow in `agent/README.md` and the production-specific playbooks under `agent/skills/`.
- Use this upstream skill as supplementary guidance for voice-first production methodology, scripts, alignment, timeline planning, sound design and QA.
- The current project uses Remotion 4 workspaces and GitHub Actions. Do not assume upstream CLI commands such as `npm run video` or `npm run saga` exist here.
- `ProjectVideo` is a limited compatibility renderer. For expressive motion design, write a custom Remotion composition in the existing video-engine workspace and register it with the current renderer.
- Existing project types and validation are in `packages/video-engine/src/project.ts`.

## Voice provider boundary

- This repository has an optional **Kokoro ONNX narration adapter** on the GitHub Actions render worker. Supplying a supported `narrationPath` requests generated narration and word alignment; the currently documented languages are Spanish and US English. See the root README and `agent/skills/narrated-video-producer/SKILL.md` for the current contract.
- Kokoro is a bounded local/model-on-worker adapter, not a general hosted voice-provider system and not a forced aligner for arbitrary uploaded recordings.
- Upstream examples mentioning ElevenLabs or Fish Audio do not mean those providers, API keys or paid plans are configured by this repository. Do not add or call a paid provider without a dry-run and explicit user approval.
- Use a user-supplied recording when appropriate, or the repository's supported Kokoro path. If narration is required but no valid supported voice source is available, report the blocker; do not silently substitute music-only output.
- Keep source audio, script/transcript, word or phrase alignment and provider/model metadata as separate project assets.

## Asset and rendering boundary

- Keep final render assets local under the project folder and record provenance/license.
- The render workflow can generate test audio fixtures and mix declared audio tracks. When `narrationPath` is supplied on the GitHub Actions provider path, the optional Kokoro adapter also generates narration and alignment before rendering.
- Do not commit secrets or provider credentials. Use GitHub Actions secrets only after the user explicitly configures them.
- Apply the repository's visual QA skill and inspect the actual MP4 before delivery.
