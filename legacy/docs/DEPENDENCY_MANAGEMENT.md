# Dependency management

## Workspace setup

AI Video Studio is a private npm workspace with the root, `apps/studio` and `packages/video-engine` manifests. It requires Node.js 22 or newer.

From a fresh checkout, install the exact dependency tree committed in the root lockfile:

```bash
npm ci
```

Run this at the repository root. It installs the root development tools and dependencies for all configured workspaces. Do not run separate install commands from each workspace directory.

## Updating dependencies

When intentionally changing dependencies:

1. Decide which workspace owns the dependency. Keep runtime packages in `dependencies` and tools/type declarations used only during development or type-checking in `devDependencies`.
2. Use npm from the repository root with an explicit workspace selector when changing a workspace package. For example:

   ```bash
   npm install <package> --workspace @ai-video-studio/video-engine
   npm install --save-dev <package> --workspace @ai-video-studio/studio
   ```

3. Review the changed workspace manifest and the generated root `package-lock.json`. Commit both together. Never hand-edit the lockfile.
4. Verify the committed graph from a clean install:

   ```bash
   npm ci
   npm run typecheck
   npm test
   npm run build
   ```

Also run any affected production-plan/project validators and rendering-specific checks required by the change.

Use `npm install` only when intentionally changing the dependency graph or regenerating the lockfile. For ordinary local setup and every automated CI/render install, use `npm ci`.

## Automated installs

The GitHub Actions CI workflow, GitHub Actions render workflow and CircleCI render workflow all install from the root `package-lock.json` with `npm ci`. A change to any workspace manifest must therefore include a matching lockfile update; otherwise `npm ci` will fail rather than silently resolving a different dependency tree.

Python narration dependencies remain managed separately through `requirements-tts.txt` and are not part of the npm lockfile.

## Scope and safety

A lockfile makes dependency resolution repeatable; it does not prove every declared package is necessary or safe to remove. Perform dependency-pruning or version-upgrade work as a separate audited change with import/build/test/workflow evidence. Do not combine broad dependency upgrades with routine lockfile maintenance.
