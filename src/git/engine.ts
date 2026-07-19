import type { CommandResult, CommitNode, EngineState } from './types';

export function initEngine(): EngineState {
  const rootId = 'C1';
  const root: CommitNode = { id: rootId, parents: [], order: 0, lane: 0 };
  return {
    commits: { [rootId]: root },
    branches: { main: rootId },
    branchLanes: { main: 0 },
    head: { type: 'branch', name: 'main' },
    nextCommitSeq: 2,
    nextOrder: 1,
  };
}

function cloneState(state: EngineState): EngineState {
  return {
    commits: { ...state.commits },
    branches: { ...state.branches },
    branchLanes: { ...state.branchLanes },
    head: { ...state.head },
    nextCommitSeq: state.nextCommitSeq,
    nextOrder: state.nextOrder,
  };
}

export function headCommitId(state: EngineState): string {
  if (state.head.type === 'branch') {
    const id = state.branches[state.head.name];
    if (!id) throw new Error(`branch ${state.head.name} has no commit`);
    return id;
  }
  return state.head.commitId;
}

export function currentBranchName(state: EngineState): string | null {
  return state.head.type === 'branch' ? state.head.name : null;
}

export function isAncestor(state: EngineState, ancestorId: string, ofId: string): boolean {
  if (ancestorId === ofId) return true;
  const seen = new Set<string>();
  const stack = [ofId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const node = state.commits[cur];
    if (!node) continue;
    for (const p of node.parents) {
      if (p === ancestorId) return true;
      stack.push(p);
    }
  }
  return false;
}

export function commitDistance(state: EngineState, fromId: string, toAncestorId: string): number {
  // number of first-parent hops from fromId back to toAncestorId, -1 if not found
  let cur: string | undefined = fromId;
  let dist = 0;
  const seen = new Set<string>();
  while (cur) {
    if (cur === toAncestorId) return dist;
    if (seen.has(cur)) return -1;
    seen.add(cur);
    const node: CommitNode | undefined = state.commits[cur];
    if (!node || node.parents.length === 0) return -1;
    cur = node.parents[0];
    dist++;
  }
  return -1;
}

export function reachableCommits(state: EngineState): Set<string> {
  const tips = [...Object.values(state.branches)];
  if (state.head.type === 'detached') tips.push(state.head.commitId);
  const seen = new Set<string>();
  const stack = [...tips];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const node = state.commits[cur];
    if (!node) continue;
    for (const p of node.parents) stack.push(p);
  }
  return seen;
}

function nextLane(state: EngineState): number {
  const used = Object.values(state.branchLanes);
  return used.length ? Math.max(...used) + 1 : 0;
}

function currentLane(state: EngineState): number {
  if (state.head.type === 'branch') {
    return state.branchLanes[state.head.name] ?? 0;
  }
  return state.head.lane;
}

function makeCommit(state: EngineState, parents: string[]): { state: EngineState; id: string } {
  const s = cloneState(state);
  const id = `C${s.nextCommitSeq}`;
  s.nextCommitSeq += 1;
  const node: CommitNode = {
    id,
    parents,
    order: s.nextOrder,
    lane: currentLane(s),
    isMerge: parents.length > 1,
  };
  s.nextOrder += 1;
  s.commits[id] = node;
  return { state: s, id };
}

function moveCurrentRef(state: EngineState, commitId: string): EngineState {
  const s = cloneState(state);
  if (s.head.type === 'branch') {
    s.branches[s.head.name] = commitId;
  } else {
    s.head = { type: 'detached', commitId, lane: s.head.lane };
  }
  return s;
}

export function resolveRef(state: EngineState, ref: string): string | null {
  if (ref === 'HEAD') return headCommitId(state);
  const tildeMatch = ref.match(/^(.+?)~(\d+)$/);
  if (tildeMatch) {
    const base = resolveRef(state, tildeMatch[1]);
    if (!base) return null;
    let n = parseInt(tildeMatch[2], 10);
    let cur: string | undefined = base;
    while (n > 0 && cur) {
      const node: CommitNode | undefined = state.commits[cur];
      if (!node || node.parents.length === 0) return null;
      cur = node.parents[0];
      n--;
    }
    return cur ?? null;
  }
  if (ref === 'HEAD^' ) {
    const base = headCommitId(state);
    const node = state.commits[base];
    return node.parents[0] ?? null;
  }
  if (state.branches[ref]) return state.branches[ref];
  if (state.commits[ref]) return ref;
  return null;
}

export interface RunOptions {
  onLog?: (msg: string) => void;
}

export function runCommand(state: EngineState, raw: string): CommandResult {
  const trimmed = raw.trim();
  if (!trimmed) return { state, ok: true, message: '' };
  let tokens = trimmed.split(/\s+/);
  if (tokens[0] === 'git') tokens = tokens.slice(1);
  const cmd = tokens[0];
  const args = tokens.slice(1);

  try {
    switch (cmd) {
      case 'commit':
        return doCommit(state, args);
      case 'branch':
        return doBranch(state, args);
      case 'checkout':
        return doCheckout(state, args);
      case 'switch':
        return doCheckout(state, args);
      case 'merge':
        return doMerge(state, args);
      case 'rebase':
        return doRebase(state, args);
      case 'reset':
        return doReset(state, args);
      case 'log':
        return doLog(state);
      case 'status':
        return doStatus(state);
      case 'help':
        return {
          state,
          ok: true,
          message:
            'Commands: git commit | git branch <name> | git branch -d <name> | git checkout <name|-b name> | git merge <name> | git rebase <name> | git reset <ref> | git log | git status',
        };
      default:
        return { state, ok: false, message: `git: '${cmd}' is not a recognized command. Type "help" for a list.` };
    }
  } catch (e) {
    return { state, ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

function doCommit(state: EngineState, _args: string[]): CommandResult {
  const parentId = headCommitId(state);
  const { state: s1, id } = makeCommit(state, [parentId]);
  const s2 = moveCurrentRef(s1, id);
  const where = s2.head.type === 'branch' ? `branch '${s2.head.name}'` : 'detached HEAD';
  return { state: s2, ok: true, message: `Created commit ${id} on ${where}.` };
}

function doBranch(state: EngineState, args: string[]): CommandResult {
  if (args.length === 0) {
    const list = Object.keys(state.branches)
      .sort()
      .map((b) => (currentBranchName(state) === b ? `* ${b}` : `  ${b}`))
      .join('\n');
    return { state, ok: true, message: list };
  }
  if (args[0] === '-d' || args[0] === '-D') {
    const name = args[1];
    if (!name) return { state, ok: false, message: 'branch name required' };
    if (!state.branches[name]) return { state, ok: false, message: `branch '${name}' not found` };
    if (currentBranchName(state) === name) {
      return { state, ok: false, message: `cannot delete branch '${name}' checked out` };
    }
    const s = cloneState(state);
    delete s.branches[name];
    delete s.branchLanes[name];
    return { state: s, ok: true, message: `Deleted branch ${name}.` };
  }
  const name = args[0];
  if (!/^[A-Za-z][A-Za-z0-9/_-]*$/.test(name)) {
    return { state, ok: false, message: `invalid branch name '${name}'` };
  }
  if (state.branches[name]) {
    return { state, ok: false, message: `branch '${name}' already exists` };
  }
  const s = cloneState(state);
  s.branches[name] = headCommitId(state);
  s.branchLanes[name] = nextLane(state);
  return { state: s, ok: true, message: `Created branch '${name}' at ${s.branches[name]}.` };
}

function doCheckout(state: EngineState, args: string[]): CommandResult {
  if (args.length === 0) return { state, ok: false, message: 'checkout requires a target' };
  if (args[0] === '-b') {
    const name = args[1];
    if (!name) return { state, ok: false, message: 'branch name required' };
    const branchResult = doBranch(state, [name]);
    if (!branchResult.ok) return branchResult;
    return doCheckout(branchResult.state, [name]);
  }
  const target = args[0];
  if (state.branches[target]) {
    const s = cloneState(state);
    s.head = { type: 'branch', name: target };
    return { state: s, ok: true, message: `Switched to branch '${target}'.` };
  }
  const commitId = resolveRef(state, target);
  if (!commitId) return { state, ok: false, message: `unknown revision '${target}'` };
  const s = cloneState(state);
  const existingLane = state.commits[commitId]?.lane ?? nextLane(state);
  s.head = { type: 'detached', commitId, lane: existingLane };
  return { state: s, ok: true, message: `Note: switching to '${target}'. HEAD is now detached at ${commitId}.` };
}

function doMerge(state: EngineState, args: string[]): CommandResult {
  const target = args[0];
  if (!target) return { state, ok: false, message: 'merge requires a branch name' };
  const targetId = resolveRef(state, target);
  if (!targetId) return { state, ok: false, message: `unknown revision '${target}'` };
  const currentId = headCommitId(state);

  if (currentId === targetId) {
    return { state, ok: true, message: 'Already up to date.' };
  }
  if (isAncestor(state, targetId, currentId)) {
    return { state, ok: true, message: `'${target}' is already an ancestor of HEAD. Nothing to do.` };
  }
  if (isAncestor(state, currentId, targetId)) {
    // fast-forward
    const s = moveCurrentRef(state, targetId);
    return { state: s, ok: true, message: `Fast-forward merge to ${targetId}.` };
  }
  const { state: s1, id } = makeCommit(state, [currentId, targetId]);
  const s2 = moveCurrentRef(s1, id);
  return { state: s2, ok: true, message: `Created merge commit ${id} joining HEAD and '${target}'.` };
}

function doRebase(state: EngineState, args: string[]): CommandResult {
  const target = args[0];
  if (!target) return { state, ok: false, message: 'rebase requires a branch name' };
  const targetId = resolveRef(state, target);
  if (!targetId) return { state, ok: false, message: `unknown revision '${target}'` };
  const currentId = headCommitId(state);

  if (isAncestor(state, currentId, targetId)) {
    return { state, ok: true, message: 'Current branch is already up to date.' };
  }
  if (isAncestor(state, targetId, currentId)) {
    return { state, ok: true, message: `'${target}' is already an ancestor of HEAD. Nothing to do.` };
  }

  // find commits unique to current branch (not reachable from target), oldest first
  const uniqueToCurrent: CommitNode[] = [];
  const seenFromTarget = new Set<string>();
  {
    const stack = [targetId];
    while (stack.length) {
      const cur = stack.pop()!;
      if (seenFromTarget.has(cur)) continue;
      seenFromTarget.add(cur);
      const node = state.commits[cur];
      if (node) for (const p of node.parents) stack.push(p);
    }
  }
  {
    const stack = [currentId];
    const seen = new Set<string>();
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur) || seenFromTarget.has(cur)) continue;
      seen.add(cur);
      const node = state.commits[cur];
      if (!node) continue;
      uniqueToCurrent.push(node);
      for (const p of node.parents) stack.push(p);
    }
  }
  uniqueToCurrent.sort((a, b) => a.order - b.order);

  let s = cloneState(state);
  let parent = targetId;
  for (const oldCommit of uniqueToCurrent) {
    const res = makeCommit(s, [parent]);
    s = res.state;
    parent = res.id;
    void oldCommit;
  }
  s = moveCurrentRef(s, parent);
  return { state: s, ok: true, message: `Rebased onto '${target}': replayed ${uniqueToCurrent.length} commit(s) as new commits.` };
}

function doReset(state: EngineState, args: string[]): CommandResult {
  const ref = args[args.length - 1];
  if (!ref) return { state, ok: false, message: 'reset requires a target ref' };
  if (state.head.type !== 'branch') {
    return { state, ok: false, message: 'cannot reset in detached HEAD (checkout a branch first)' };
  }
  const branchName = state.head.name;
  const id = resolveRef(state, ref);
  if (!id) return { state, ok: false, message: `unknown revision '${ref}'` };
  const s = cloneState(state);
  s.branches[branchName] = id;
  return { state: s, ok: true, message: `Reset '${branchName}' to ${id}.` };
}

function doLog(state: EngineState): CommandResult {
  const lines: string[] = [];
  let cur: string | undefined = headCommitId(state);
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const node: CommitNode = state.commits[cur];
    const branchesHere = Object.entries(state.branches)
      .filter(([, id]) => id === cur)
      .map(([name]) => name);
    const label = branchesHere.length ? ` (${branchesHere.join(', ')})` : '';
    lines.push(`${node.id}${label}`);
    cur = node.parents[0];
  }
  return { state, ok: true, message: lines.join('\n') };
}

function doStatus(state: EngineState): CommandResult {
  const where =
    state.head.type === 'branch' ? `On branch ${state.head.name}` : `HEAD detached at ${state.head.commitId}`;
  return { state, ok: true, message: where };
}
