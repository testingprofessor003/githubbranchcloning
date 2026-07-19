import { useEffect, useMemo, useState } from 'react';
import { initEngine, runCommand } from './git/engine';
import type { EngineState } from './git/types';
import { levels } from './levels/levels';
import GitGraph from './components/GitGraph';
import CommandBar, { type HistoryEntry } from './components/CommandBar';
import Toolbar from './components/Toolbar';
import LevelPanel from './components/LevelPanel';
import WorkflowsModal from './components/WorkflowsModal';
import { loadWorkflows, saveWorkflow, deleteWorkflow, type SavedWorkflow } from './persistence/workflows';
import './App.css';

const STORAGE_KEY = 'gitbranch-clone-completed-levels';

function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [engineState, setEngineState] = useState<EngineState>(() => initEngine());
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [appliedCommands, setAppliedCommands] = useState<string[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(() => loadCompleted());
  const [prefillText, setPrefillText] = useState<string | undefined>(undefined);
  const [prefillNonce, setPrefillNonce] = useState(0);
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>(() => loadWorkflows());
  const [showWorkflows, setShowWorkflows] = useState(false);

  const level = levels[currentIndex];

  const solved = useMemo(() => {
    if (sandboxMode) return false;
    return level.goalCheck(engineState);
  }, [sandboxMode, level, engineState]);

  useEffect(() => {
    if (solved && !completed.has(level.id)) {
      const next = new Set(completed);
      next.add(level.id);
      setCompleted(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);

  function resetToFresh() {
    setEngineState(initEngine());
    setHistory([]);
    setAppliedCommands([]);
  }

  function handleRun(command: string) {
    const result = runCommand(engineState, command);
    setHistory((h) => [...h, { command, message: result.message, ok: result.ok }]);
    if (result.ok) {
      setEngineState(result.state);
      setAppliedCommands((c) => [...c, command]);
    }
  }

  function handleUndo() {
    if (appliedCommands.length === 0) return;
    const undone = appliedCommands[appliedCommands.length - 1];
    const remaining = appliedCommands.slice(0, -1);
    let state = initEngine();
    for (const cmd of remaining) {
      const r = runCommand(state, cmd);
      state = r.state;
    }
    setEngineState(state);
    setAppliedCommands(remaining);
    setHistory((h) => [...h, { command: '(undo)', message: `Reverted "${undone}"`, ok: true }]);
  }

  function handleSelectLevel(i: number) {
    setCurrentIndex(i);
    resetToFresh();
  }

  function handleNextLevel() {
    if (currentIndex < levels.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetToFresh();
    }
  }

  function handleToggleSandbox() {
    setSandboxMode((s) => !s);
    resetToFresh();
  }

  function handlePrefill(text: string) {
    setPrefillText(text);
    setPrefillNonce((n) => n + 1);
  }

  function handleSaveWorkflow(name: string) {
    if (appliedCommands.length === 0) return;
    const next = saveWorkflow({
      name,
      levelId: sandboxMode ? null : level.id,
      commands: appliedCommands,
    });
    setSavedWorkflows(next);
  }

  function handleLoadWorkflow(workflow: SavedWorkflow) {
    const idx = workflow.levelId === null ? -1 : levels.findIndex((l) => l.id === workflow.levelId);
    setSandboxMode(idx === -1);
    if (idx !== -1) setCurrentIndex(idx);

    let state = initEngine();
    const replayedHistory: HistoryEntry[] = [];
    for (const cmd of workflow.commands) {
      const r = runCommand(state, cmd);
      state = r.state;
      replayedHistory.push({ command: cmd, message: r.message, ok: r.ok });
    }
    setEngineState(state);
    setHistory(replayedHistory);
    setAppliedCommands(workflow.commands);
    setShowWorkflows(false);
  }

  function handleDeleteWorkflow(id: string) {
    setSavedWorkflows(deleteWorkflow(id));
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <LevelPanel
          levels={levels}
          currentIndex={currentIndex}
          completed={completed}
          solved={solved}
          onSelectLevel={handleSelectLevel}
          onNextLevel={handleNextLevel}
          onResetLevel={resetToFresh}
          sandboxMode={sandboxMode}
          onToggleSandbox={handleToggleSandbox}
          savedCount={savedWorkflows.length}
          onOpenWorkflows={() => setShowWorkflows(true)}
        />
      </aside>
      <main className="app-main">
        <div className="graph-pane">
          <GitGraph state={engineState} />
        </div>
        <div className="console-pane">
          <Toolbar
            onRun={handleRun}
            onPrefill={handlePrefill}
            onUndo={handleUndo}
            canUndo={appliedCommands.length > 0}
          />
          <CommandBar history={history} onRun={handleRun} prefillText={prefillText} prefillNonce={prefillNonce} />
        </div>
      </main>
      <WorkflowsModal
        open={showWorkflows}
        onClose={() => setShowWorkflows(false)}
        workflows={savedWorkflows}
        levels={levels}
        canSave={appliedCommands.length > 0}
        currentContextLabel={sandboxMode ? 'Sandbox' : level.title}
        onSave={handleSaveWorkflow}
        onLoad={handleLoadWorkflow}
        onDelete={handleDeleteWorkflow}
      />
    </div>
  );
}
