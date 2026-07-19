export interface CommitNode {
  id: string;
  parents: string[];
  order: number;
  lane: number;
  message?: string;
  isMerge?: boolean;
}

export type Head =
  | { type: 'branch'; name: string }
  | { type: 'detached'; commitId: string; lane: number };

export interface EngineState {
  commits: Record<string, CommitNode>;
  branches: Record<string, string>;
  branchLanes: Record<string, number>;
  head: Head;
  nextCommitSeq: number;
  nextOrder: number;
}

export interface CommandResult {
  state: EngineState;
  ok: boolean;
  message: string;
}
