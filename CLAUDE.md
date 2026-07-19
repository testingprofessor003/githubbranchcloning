# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Testing Professor** — a React/TypeScript app that teaches Git branching and merging graphically: an animated SVG commit graph driven by a real (simulated) git command console, wrapped in a progressive set of levels plus a sandbox mode. Live demo: https://testingprofessor003.github.io/githubbranchcloning/

## Commands

```bash
npm install       # install dependencies
npm run dev       # start Vite dev server with HMR
npm run build     # tsc -b (typecheck) && vite build
npm run lint       # oxlint
npm run preview    # preview a production build locally
npx tsc -b --noEmit  # typecheck only, no build output
```

There is no test suite configured in this repo.

Deployment is automatic: pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes `dist/` to GitHub Pages. `vite.config.ts` sets `base: '/githubbranchcloning/'` to match the Pages project-site subpath — keep that in sync if the repo is ever renamed.

## Architecture

The app is a layered pipeline: **git engine → layout → React rendering**, with a **deterministic-replay** persistence strategy running through it.

### `src/git/` — the git simulation engine

`engine.ts` holds `EngineState` (commits, branches, branchLanes, head, counters) and is a pure, immutable state machine — every operation (`cloneState` + mutate the clone) returns a new state, never mutates in place. `runCommand(state, commandString)` parses a typed command (`git commit`, `git branch -b foo`, `git merge`, `git rebase`, `git reset`, `git log`, etc.) and returns `{ state, ok, message }`.

Key detail: a commit's **lane** (its horizontal column in the graph) is decided *here*, at commit-creation time (`currentLane`/`nextLane`), based on whichever branch was checked out when the commit was made — not recomputed later during layout. This is what keeps a branch's commits visually aligned in a stable column as the graph animates.

`rebase` deliberately leaves the pre-rebase commits in the `commits` map even though they become unreachable — `reachableCommits()` (BFS from all branch tips + HEAD) is used purely for *rendering* (dimming orphaned commits), not for engine correctness. This is an intentional teaching feature: it visualizes that rebase creates new commits rather than moving old ones.

`helpers.ts` provides read-only predicates over `EngineState` (`isAncestor`, `branchContains`, `commitsAheadOf`, `hasMergeCommit`, etc.) used by level goal-checking.

### `src/layout/layout.ts` — pure position computation

Takes an `EngineState` and returns pixel positions for commit nodes, edges, branch labels, and the HEAD marker (`ORIGIN_X/Y`, `COL_WIDTH`, `ROW_HEIGHT` control spacing). It has no state of its own and does not decide lanes — it only reads `commit.lane` and `commit.order` that the engine already assigned.

### `src/components/GitGraph.tsx` — animated rendering

Renders the layout as SVG using framer-motion (`motion.g`/`motion.line` with spring transitions, wrapped in `AnimatePresence` for mount/exit). Node/branch-label positions are driven by `x`/`y` motion props on `<g>` wrappers rather than native SVG `cx`/`cy`, so React's stable `key`s (commit id, branch name) are what make the animation "move" a node instead of recreating it.

### `src/levels/levels.ts` — level definitions

Each `Level` embeds a `goalCheck: (state: EngineState) => boolean` written directly against the helpers above — there's no generic/serializable goal-diffing system. When adding a level, write the predicate by hand using `src/git/helpers.ts`.

### `src/persistence/workflows.ts` and the Undo button — deterministic replay

Because the engine is a pure function of `initEngine()` + a command list, **neither saved workflows nor Undo store a full `EngineState` snapshot** — they store the list of successfully-applied command strings (`appliedCommands` in `App.tsx`) and reconstruct state by replaying `runCommand` from `initEngine()`. Follow this pattern for any new state-time-travel feature rather than serializing `EngineState` directly.

Two separate `localStorage` keys are used: `gitbranch-clone-completed-levels` (finished level ids) and `gitbranch-clone-saved-workflows` (named command-list snapshots, see `SavedWorkflow` in `workflows.ts`).

### `src/App.tsx` — top-level state owner

Owns `engineState`, `history` (display log), `appliedCommands` (the replay source of truth), `completed`, `sandboxMode`, and `savedWorkflows`. All command execution funnels through `handleRun` → `runCommand`. `CommandBar`'s toolbar-triggered prefill uses a `{prefillText, prefillNonce}` pair (not just text) so that inserting the *same* template twice in a row still refires the input-focus effect.
