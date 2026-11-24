# Repository documentation

Use this page to find the right document before adding another status or handoff file.

## Start here

- [START_HERE.md](../START_HERE.md) — required reading order and continuation procedure for a new session.
- [AGENTS.md](../AGENTS.md) — repository-wide operating, testing, branching and render-safety rules.
- [README.md](../README.md) — user/developer reference for the engine, schemas, commands, asset workflows and CI.

## Source of truth

| Document | Owns | Update policy |
|---|---|---|
| [PROJECT_STATE.md](../PROJECT_STATE.md) | Latest verified implementation state, open work, CI/render evidence and current limitations | Refresh the current snapshot when the live repository changes; keep older dated entries as history |
| [ROADMAP.md](../ROADMAP.md) | Intended priorities, milestones and acceptance criteria | Update checkboxes only when implementation and evidence justify them |
| [PROGRESS_LOG.md](../PROGRESS_LOG.md) | Chronological development history, decisions, failures and handoffs | Append new entries; do not rewrite old entries just to make them look current |

The current snapshot at the top of PROJECT_STATE.md takes precedence over older dated notes in the history and roadmap. A roadmap item is a plan, not proof of implementation.

## Development and dependency management

- [DEPENDENCY_MANAGEMENT.md](DEPENDENCY_MANAGEMENT.md) — reproducible npm workspace installs, lockfile updates and dependency-change verification.

## Production workflow and agent guidance

- [agent/README.md](../agent/README.md) — agent roles, skills and operating model.
- [docs/agent-production-workflow.md](agent-production-workflow.md) — end-to-end brief-to-delivery workflow and render freeze protocol.
- [production-state.md](production-state.md) — versioned stage/evidence handoff schema and validator for resumable agent-led video work.
- [final-delivery.md](final-delivery.md) — manual approved-artifact release workflow and delivery-manifest contract.
- [agent/skills/](../agent/skills/) — focused playbooks for creative direction, storyboard, assets, narration, audio and QA.
- [agent/EXTERNAL_SKILLS.md](../agent/EXTERNAL_SKILLS.md) — reviewed upstream skill references and license notes.
- [.claude/skills/video-engine/](../.claude/skills/video-engine/) — vendored video-engine skill and repository integration references.

## Repository layout

- apps/ — Studio application.
- packages/ — reusable engine and rendering code.
- projects/ — examples, benchmarks, production plans, source media and project assets.
- scripts/ — validation, planning, asset, narration, rendering and QA CLIs.
- schemas/ — machine-readable planning contracts.
- tests/ — unit and real-media integration tests.
- .github/workflows/ and .circleci/ — CI, GitHub Actions rendering and CircleCI status/render workflows.

## Workflow-sensitive files and cleanup guardrails

- render-request.json is a render trigger. The render workflow requires a separate request-only commit with a frozen candidateSha; do not move, delete, reformat or casually edit it.
- circleci-status-request.json triggers the CircleCI status workflow; change it only when intentionally checking a specific CircleCI pipeline.
- projects/valorant-immortal-decision-making/assets/valorant-gameplay-selected.zip is consumed by the render workflow. Keep it until a replacement storage path has been implemented and verified.
- Keep project assets and historical benchmark projects unless code references, project plans and render workflows have all been checked. File names alone are not evidence that an asset is unused.
- Avoid duplicating status documents. Update the current snapshot, append to the progress log, and put future work in the roadmap.