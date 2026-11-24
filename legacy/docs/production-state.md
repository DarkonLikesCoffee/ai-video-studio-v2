# Machine-readable production state

Each new agent-led video project may keep a `production/production-state.json` file. This is a durable handoff record: a later assistant should resume from the checked-in state and evidence instead of inferring completed work from conversation history.

## Schema

```json
{
  "schemaVersion": 1,
  "projectId": "lighthouse-repair",
  "stage": "assets",
  "updatedAt": "2026-11-23T10:00:00.000Z",
  "evidence": {
    "brief": ["production/creative-brief.md"],
    "direction": ["production/creative-direction.md"],
    "storyboard": ["production/production-plan.json"],
    "assets": ["production/asset-manifest.json"]
  }
}
```

Stages are ordered: `brief`, `direction`, `storyboard`, `assets`, `build`, `render-ready`, `frozen`, `rendered`, `qa`, `accepted`, `delivered`.

Evidence references are repository-relative artifact paths or stable external evidence identifiers. This first version validates structure and presence only; it does not verify the referenced file contents or prove that a human/model inspected them. Do not treat a reference as proof of visual approval.

## Validation

Run:

```bash
npx tsx scripts/production-state.ts projects/<slug>/production/production-state.json <slug>
npx tsx scripts/production-state.ts projects/<slug>/production/production-state.json <slug> --require-evidence
```

The second form requires evidence for every stage up to and including the declared stage. For a handoff at `assets`, for example, brief, direction, storyboard and assets must all have evidence references.

For projects that want to verify the evidence files themselves, run:

```bash
npx tsx scripts/production-state.ts projects/<slug>/production/production-state.json <slug> --require-evidence --verify-evidence-files --project-root projects/<slug>
```

Strict file verification resolves each evidence reference relative to the project root and requires a non-empty regular file. It rejects absolute paths, traversal segments, directories, symbolic links and paths that escape the project. The supplied project root must itself be inside the repository root. References are still not proof that the contents are correct, current, reviewed or creatively approved.

This validator remains opt-in for projects adopting the state file. Existing projects without a state file remain compatible. The render workflow does not yet require this file; render-gate integration is a separate follow-up after migration rules and evidence semantics are agreed.
