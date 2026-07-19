import { reachableCommits } from '../git/engine';
import type { EngineState } from '../git/types';

export const COL_WIDTH = 90;
export const ROW_HEIGHT = 86;
export const ORIGIN_X = 70;
export const ORIGIN_Y = 60;

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  reachable: boolean;
  isMerge: boolean;
  isHead: boolean;
}

export interface EdgePosition {
  key: string;
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface BranchLabelPosition {
  name: string;
  commitId: string;
  x: number;
  y: number;
  stackIndex: number;
  isCurrent: boolean;
}

export interface HeadMarkerPosition {
  x: number;
  y: number;
  attachedToBranch: boolean;
}

export interface GraphLayout {
  nodes: NodePosition[];
  edges: EdgePosition[];
  branchLabels: BranchLabelPosition[];
  head: HeadMarkerPosition;
  width: number;
  height: number;
}

function coordFor(lane: number, order: number): { x: number; y: number } {
  return { x: ORIGIN_X + lane * COL_WIDTH, y: ORIGIN_Y + order * ROW_HEIGHT };
}

export function computeLayout(state: EngineState): GraphLayout {
  const reachable = reachableCommits(state);
  const headId =
    state.head.type === 'branch' ? state.branches[state.head.name] : state.head.commitId;

  const nodes: NodePosition[] = Object.values(state.commits).map((c) => {
    const { x, y } = coordFor(c.lane, c.order);
    return {
      id: c.id,
      x,
      y,
      reachable: reachable.has(c.id),
      isMerge: Boolean(c.isMerge),
      isHead: c.id === headId,
    };
  });

  const edges: EdgePosition[] = [];
  for (const c of Object.values(state.commits)) {
    const { x: x1, y: y1 } = coordFor(c.lane, c.order);
    for (const p of c.parents) {
      const parent = state.commits[p];
      if (!parent) continue;
      const { x: x2, y: y2 } = coordFor(parent.lane, parent.order);
      edges.push({ key: `${p}->${c.id}`, fromId: c.id, toId: p, x1, y1, x2, y2 });
    }
  }

  const byCommit = new Map<string, string[]>();
  for (const name of Object.keys(state.branches).sort()) {
    const cid = state.branches[name];
    const list = byCommit.get(cid) ?? [];
    list.push(name);
    byCommit.set(cid, list);
  }
  const branchLabels: BranchLabelPosition[] = [];
  const currentBranch = state.head.type === 'branch' ? state.head.name : null;
  for (const [commitId, names] of byCommit.entries()) {
    const commit = state.commits[commitId];
    if (!commit) continue;
    const { x, y } = coordFor(commit.lane, commit.order);
    names.forEach((name, i) => {
      branchLabels.push({
        name,
        commitId,
        x,
        y: y + 34 + i * 26,
        stackIndex: i,
        isCurrent: name === currentBranch,
      });
    });
  }

  let head: HeadMarkerPosition;
  if (state.head.type === 'branch') {
    const headBranchName = state.head.name;
    const label = branchLabels.find((b) => b.name === headBranchName);
    if (label) {
      head = { x: label.x, y: label.y + 30, attachedToBranch: true };
    } else {
      head = { x: ORIGIN_X, y: ORIGIN_Y, attachedToBranch: true };
    }
  } else {
    const commit = state.commits[state.head.commitId];
    const { x, y } = commit ? coordFor(commit.lane, commit.order) : { x: ORIGIN_X, y: ORIGIN_Y };
    head = { x, y: y + 34, attachedToBranch: false };
  }

  const maxLane = Math.max(0, ...Object.values(state.commits).map((c) => c.lane));
  const maxOrder = Math.max(0, ...Object.values(state.commits).map((c) => c.order));
  const width = ORIGIN_X * 2 + maxLane * COL_WIDTH + 40;
  const height = ORIGIN_Y * 2 + maxOrder * ROW_HEIGHT + 60;

  return { nodes, edges, branchLabels, head, width, height };
}
