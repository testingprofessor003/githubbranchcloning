# Testing Professor

An interactive, graphical way to learn Git **branching and merging** — an animated commit graph you drive with real git commands, built around a focused set of levels instead of trying to cover all of Git.

**🔗 Live demo: https://testingprofessor003.github.io/githubbranchcloning/**

![Testing Professor](src/assets/logo.png)

## What it does

- **Animated commit graph** — commits, branches, and `HEAD` are rendered as an SVG graph that smoothly animates as you run commands (powered by a small deterministic git engine + framer-motion)
- **A real command console** — type actual git commands (`git branch`, `git checkout -b`, `git merge`, `git rebase`, `git reset`, `git log`, …) or use the quick-action toolbar
- **6 progressive levels** — commits & the graph → branching → fast-forward merge → true (diamond-shaped) merge commit → parallel feature branches → rebase vs. merge, each with an explanation, hints, and automatic goal detection
- **Sandbox mode** — no goals, just a graph to experiment freely on
- **Save / load workflows** — name and save your current command history for any level (or sandbox) and reload it later to pick up where you left off

## Running locally

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser.

## Tech stack

React + TypeScript + Vite, with a hand-written git simulation engine (`src/git/`) and an SVG graph layout/animation layer (`src/layout/`, `src/components/GitGraph.tsx`).

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app and publishes it to GitHub Pages.
