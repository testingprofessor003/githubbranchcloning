import { headCommitId, isAncestor } from './engine';
import type { CommitNode, EngineState } from './types';

export function commitCount(state: EngineState): number {
  return Object.keys(state.commits).length;
}

export function branchExists(state: EngineState, name: string): boolean {
  return Boolean(state.branches[name]);
}

export function currentBranch(state: EngineState): string | null {
  return state.head.type === 'branch' ? state.head.name : null;
}

export function isDetached(state: EngineState): boolean {
  return state.head.type === 'detached';
}

export function branchContains(state: EngineState, branch: string, ancestorBranch: string): boolean {
  const tip = state.branches[branch];
  const anc = state.branches[ancestorBranch];
  if (!tip || !anc) return false;
  return isAncestor(state, anc, tip);
}

export function isMergeCommitAt(state: EngineState, branch: string): boolean {
  const tip = state.branches[branch];
  if (!tip) return false;
  return Boolean(state.commits[tip]?.isMerge);
}

export function hasMergeCommit(state: EngineState): boolean {
  return Object.values(state.commits).some((c) => c.isMerge);
}

export function mergeCommitCount(state: EngineState): number {
  return Object.values(state.commits).filter((c) => c.isMerge).length;
}

export function headIsAt(state: EngineState, branch: string): boolean {
  return currentBranch(state) === branch;
}

export function commitsAheadOf(state: EngineState, branch: string, base: string): number {
  const tip = state.branches[branch];
  const baseId = state.branches[base];
  if (!tip || !baseId) return -1;
  let count = 0;
  let cur: string | undefined = tip;
  const seen = new Set<string>();
  while (cur && cur !== baseId) {
    if (seen.has(cur)) return -1;
    seen.add(cur);
    const node: CommitNode | undefined = state.commits[cur];
    if (!node || node.parents.length === 0) return -1;
    cur = node.parents[0];
    count++;
  }
  return cur === baseId ? count : -1;
}

export function headCommit(state: EngineState): string {
  return headCommitId(state);
}
