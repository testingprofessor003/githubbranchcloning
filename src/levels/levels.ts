import {
  branchContains,
  branchExists,
  commitCount,
  commitsAheadOf,
  hasMergeCommit,
  headIsAt,
} from '../git/helpers';
import type { Level } from './types';

export const levels: Level[] = [
  {
    id: 'intro-commits',
    title: '1. Commits & the graph',
    concept: 'Every `git commit` adds a new node pointing back at its parent.',
    paragraphs: [
      'The circles on the right are commits. Each new commit points backward at the commit it was made on top of — that arrow is its "parent" link.',
      'A branch (the colored tag) is nothing more than a movable label pointing at one commit. `HEAD` is a second label showing where you currently are.',
      'Run `git commit` a few times and watch `main` slide forward to the newest commit after each one.',
    ],
    hints: ['Try: git commit', 'Run it 3 times to build up some history.'],
    goalCheck: (state) => commitCount(state) >= 4,
    successMessage: 'Nice — main now points at your newest commit, and each old commit still remembers its parent.',
  },
  {
    id: 'branching-basics',
    title: '2. Branching',
    concept: '`git branch` creates a new label; `git checkout` moves HEAD to it.',
    paragraphs: [
      'Branches let you work on something without touching `main`. `git branch bugFix` creates a new label at your current commit — it does not move you there.',
      '`git checkout bugFix` moves HEAD onto that branch. From then on, new commits advance `bugFix` instead of `main`.',
      'Goal: create a branch named `bugFix`, switch to it, and make one commit on it.',
    ],
    hints: [
      'git branch bugFix',
      'git checkout bugFix   (or combine both: git checkout -b bugFix)',
      'git commit',
    ],
    goalCheck: (state) => branchExists(state, 'bugFix') && headIsAt(state, 'bugFix') && commitsAheadOf(state, 'bugFix', 'main') >= 1,
    successMessage: '`bugFix` is now one commit ahead of `main`, and they share all the history before that.',
  },
  {
    id: 'fast-forward-merge',
    title: '3. Fast-forward merge',
    concept: 'If `main` never moved, merging just slides its label forward.',
    paragraphs: [
      'Create `bugFix`, commit on it twice, then checkout `main` and run `git merge bugFix`.',
      'Because `main` has not gained any commits of its own since `bugFix` split off, git does not need a new commit at all — it just moves the `main` label up to match `bugFix`. This is called a "fast-forward" merge.',
      'Watch the graph: no new circle appears, only the `main` badge slides up to meet `bugFix`.',
    ],
    hints: [
      'git checkout -b bugFix',
      'git commit',
      'git commit',
      'git checkout main',
      'git merge bugFix',
    ],
    goalCheck: (state) =>
      branchExists(state, 'bugFix') &&
      state.branches.main === state.branches.bugFix &&
      headIsAt(state, 'main') &&
      !hasMergeCommit(state) &&
      commitCount(state) >= 3,
    successMessage: 'Fast-forwarded! `main` and `bugFix` now point at the exact same commit — no merge commit needed.',
  },
  {
    id: 'three-way-merge',
    title: '4. A true merge commit',
    concept: 'When both branches moved, git weaves them together with a new commit that has two parents.',
    paragraphs: [
      'This time, make a commit on `main` too before merging — so `main` and `bugFix` each have work the other lacks.',
      'When you merge in that situation, a fast-forward is impossible, so git creates a brand-new "merge commit" with two parent arrows: one back into `main`\'s history, one back into `bugFix`\'s.',
      'Sequence: branch off `bugFix` from `main`, commit on `bugFix`, checkout `main`, commit on `main`, then `git merge bugFix`.',
    ],
    hints: [
      'git checkout -b bugFix',
      'git commit',
      'git checkout main',
      'git commit',
      'git merge bugFix',
    ],
    goalCheck: (state) =>
      hasMergeCommit(state) && headIsAt(state, 'main') && branchContains(state, 'main', 'bugFix'),
    successMessage: 'That diamond shape is the signature of a real merge — one commit, two parents, both histories preserved.',
  },
  {
    id: 'parallel-features',
    title: '5. Two branches, one main',
    concept: 'Real projects merge several feature branches back into `main` over time.',
    paragraphs: [
      'Create two independent feature branches off `main` — call them `sidebar` and `navbar` — and commit on each.',
      'Then merge them both into `main`, one after another. Notice the second merge has to weave in commits from both the first merge AND the second branch.',
    ],
    hints: [
      'git checkout -b sidebar',
      'git commit',
      'git checkout main',
      'git checkout -b navbar',
      'git commit',
      'git checkout main',
      'git merge sidebar',
      'git merge navbar',
    ],
    goalCheck: (state) =>
      branchContains(state, 'main', 'sidebar') && branchContains(state, 'main', 'navbar') && headIsAt(state, 'main'),
    successMessage: 'Both feature branches are now reachable from `main` — this is what a healthy integration branch looks like.',
  },
  {
    id: 'rebase-vs-merge',
    title: '6. Bonus: rebase instead of merge',
    concept: '`git rebase` replays your commits onto a new base instead of joining histories with a merge commit.',
    paragraphs: [
      'Branch off `feature` from `main`, then diverge: commit on `main`, then commit on `feature`.',
      'Instead of merging, checkout `feature` and run `git rebase main`. Git detaches `feature`\'s unique commits, and re-creates them (as brand new commits!) directly on top of the current `main` tip — producing a straight line instead of a diamond.',
      'Compare this graph shape with level 4\'s merge commit: same intent, very different history shape.',
    ],
    hints: [
      'git checkout -b feature',
      'git checkout main',
      'git commit',
      'git checkout feature',
      'git commit',
      'git rebase main',
    ],
    goalCheck: (state) => branchExists(state, 'feature') && headIsAt(state, 'feature') && branchContains(state, 'feature', 'main') && !hasMergeCommit(state),
    successMessage: '`feature` now sits in a straight line on top of `main` — rebase rewrote its commits instead of merging them.',
  },
];
