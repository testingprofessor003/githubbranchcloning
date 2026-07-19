export interface SavedWorkflow {
  id: string;
  name: string;
  levelId: string | null; // null = sandbox
  commands: string[];
  savedAt: string;
}

const KEY = 'gitbranch-clone-saved-workflows';

export function loadWorkflows(): SavedWorkflow[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(list: SavedWorkflow[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function saveWorkflow(entry: Omit<SavedWorkflow, 'id' | 'savedAt'>): SavedWorkflow[] {
  const list = loadWorkflows();
  const saved: SavedWorkflow = {
    ...entry,
    id: `wf_${Math.random().toString(36).slice(2, 10)}`,
    savedAt: new Date().toISOString(),
  };
  const next = [saved, ...list];
  persist(next);
  return next;
}

export function deleteWorkflow(id: string): SavedWorkflow[] {
  const next = loadWorkflows().filter((w) => w.id !== id);
  persist(next);
  return next;
}
