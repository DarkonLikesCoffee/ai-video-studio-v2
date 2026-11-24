# START HERE — AI Video Studio

This is the shared entry point for **any AI assistant, model, or new conversation** working in this repository. It is designed to be model/provider-neutral: ChatGPT, Claude, compatible local models, and other assistants should follow the same repository workflow.

## Product goal

Turn an ordinary video prompt into a compelling finished MP4. The goal is not merely a valid render or animated slides; it is purposeful visual storytelling, suitable footage/assets, real motion, strong editing, intentional sound and verified quality.

## Resume prompt

> Continue working in `DarkonLikesCoffee/ai-video-studio`. Read `AGENTS.md` and `START_HERE.md`, verify the live GitHub state, then load only the context relevant to the task. Continue from the highest-priority actionable roadmap item. Make routine implementation decisions autonomously, use a branch and PR, and report only work that has been tested and verified.

Repository: https://github.com/DarkonLikesCoffee/ai-video-studio

## Fast context-loading path

Do not consume the entire project history or every large reference file at the start of every conversation. Load context in this order:

1. **`AGENTS.md` and this file** — repository-wide rules and the continuation workflow.
2. **`PROJECT_STATE.md`** — read the current verified snapshot at the top, stopping at the marker that introduces older historical entries. Read older entries only when the task depends on that history.
3. **`ROADMAP.md`** — read the north-star, strategic direction, priority policy, release gate, and the specific milestone relevant to the task. Historical appendices are not required for routine work.
4. **`PROGRESS_LOG.md`** — read the latest two or three dated entries at the end. Search for an older topic, PR or failure only when relevant; do not read the entire log by default.
5. **`docs/README.md`** — use it as the documentation index. Read only the relevant sections of `README.md`, not the entire file by default.
6. **For video production:** read `agent/README.md`, `docs/agent-production-workflow.md`, then the relevant skill(s) under `agent/skills/`.
7. **For code changes:** inspect the implementation, schemas, tests and workflows that directly govern the selected change. Read additional skills or documentation only as needed.

### Which instructions are universal?

- `AGENTS.md`, this file, `agent/README.md`, `docs/agent-production-workflow.md` and `agent/skills/` are the shared, model-neutral repository guidance.
- `agent/skills/` contains the canonical cross-assistant playbooks. Any assistant that can read repository files can use them; they are not separate running agents.
- `.claude/skills/` is supplementary integration for Claude Code. Its project integration notes explain local differences. Do not assume upstream skill examples, commands or paid providers are installed or configured.
- The assistant currently interacting with the user supplies the creative reasoning. Repository scripts generate handoffs, validate artifacts, render deterministic projects and inspect media; they do not call an LLM or autonomously make creative decisions.

## Before changing anything

1. Check the live `main` head, current branch, open PRs, recent CI and render workflow runs. Check for conflicting in-progress work.
2. Compare the live code and workflows with the current `PROJECT_STATE.md` snapshot. Treat stale status text as a documentation issue, not as evidence of current implementation.
3. Select one high-priority, actionable slice. Prefer an end-to-end improvement to the actual video over more abstract infrastructure or one-off demos.
4. Follow the relevant model-neutral playbooks and verify every claimed engine capability in code.
5. Make changes on a feature, fix or docs branch and open a PR; never push directly to `main`.
6. Run relevant tests, type-checks, schema/project validations and CI. Do not weaken checks or hide failures to obtain a green result.
7. For video-producing changes, obey the render freeze protocol in `AGENTS.md`; inspect the exact rendered MP4 and its audio/visual evidence. A successful render or contact sheet alone is not creative acceptance.
8. Update `PROJECT_STATE.md`, `ROADMAP.md` and append to `PROGRESS_LOG.md` so another assistant can continue without the conversation history.

## Source-of-truth rules

- Code, tests, schemas and successful workflow outputs are authoritative for implemented capability.
- `README.md` documents engine behavior; inspect implementation when a specific capability matters.
- `PROJECT_STATE.md` is a snapshot of verified state at its last update, not a promise that it is still current.
- `ROADMAP.md` describes intended work, not evidence that a feature exists.
- A prompt, playbook, storyboard, fixture, mock or orchestration stub is not an autonomous AI capability.
- Distinguish **implemented**, **partially implemented**, **manual/model-led workflow**, **planned** and **not implemented**.
- Never invent a successful test, asset, license, render, visual inspection or user approval.
- Never incur paid API/model costs without explicit user consent. Do not expose credentials, tokens or private data in repository files.

## Non-negotiable quality principle

A technically valid MP4 can still be a bad video. Judge it against the original brief: story, shot variety, meaningful motion, editing rhythm, visual relevance, narration, sound, synchronization and ending. If it looks like a slideshow when the brief calls for a film, it has failed even if every automated test passes.


## Mandatory creative QA addition

For every video-production task, load `agent/skills/shot-differentiation/SKILL.md` in addition to the existing production skills. A shot is not distinct because its title, subtitle, color or text changes. Each shot needs a meaningful visual/compositional change and an implemented visual event. The assistant must map storyboard shots to the actual source implementation and verify the rendered frames. A repeated scene with copy changes is a major failure and blocks delivery.
