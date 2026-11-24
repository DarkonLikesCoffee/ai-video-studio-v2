# External agent skills and production references

This repository keeps its own orchestration rules in agent/skills/. The following public projects are references or optional skill packs; they are not assumed to be installed or available at runtime.

## Recommended foundations

### Remotion official Agent Skills
- Repository: https://github.com/remotion-dev/skills
- Documentation: https://www.remotion.dev/docs/ai/skills
- Install in a compatible agent workspace: npx remotion skills add
- Official skills are not vendored here; install them separately when using Claude Code or another compatible agent.
- Use remotion-best-practices, remotion-create, remotion-markup, remotion-captions and remotion-render where relevant.
- The official documentation describes these as agent skills for Claude Code, Codex, Cursor and other compatible agents. This project does not vendor their source files.

### video-engine-skill
- Repository: https://github.com/ninjasweb/video-engine-skill
- License: MIT. If any source files are copied into this repository, retain the upstream copyright and license notice.
- Vendored in this repository at .claude/skills/video-engine/ from upstream commit cf35b05a9ecf3e878eff30c9ffaa8a911248d7c5.
- The upstream MIT license is included in that folder. Local integration constraints are documented in PROJECT-INTEGRATION.md.
- Valuable ideas: audio-first timing, word-level alignment, narration verification, provider-independent voice contracts, SFX cue sheets, caption timing, multi-video project layout and strict rendered-artifact QA.
- Its published pipeline uses ElevenLabs or Fish Audio as optional TTS providers and requires explicit consent before paid generation. Do not assume API keys or subscriptions exist.

### video-shotcraft
- Repository: https://github.com/syklayou-glitch/video-shotcraft
- License: Apache-2.0. Any copied or adapted source must retain required notices and identify modifications.
- Valuable ideas: reusable shot recipes, camera movement, depth-layer animation, rhythm-led editing, sound design and independent final review.
- Treat its recipes as a design library, not as a substitute for the project's brief, storyboard or quality review.

## Integration policy

- Prefer adopting workflow principles and installing upstream skills over copying large libraries blindly.
- Pin any dependency or vendored skill to a reviewed commit before relying on it in production.
- Keep a record of upstream name, URL, license, commit and local modifications for copied material.
- Verify current APIs, licensing and provider pricing before implementation.
- Never make a paid API request without explicit user consent.
