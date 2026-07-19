import './Toolbar.css';

interface Props {
  onRun: (command: string) => void;
  onPrefill: (text: string) => void;
  onUndo: () => void;
  canUndo: boolean;
}

export default function Toolbar({ onRun, onPrefill, onUndo, canUndo }: Props) {
  return (
    <div className="toolbar">
      <button onClick={() => onRun('git commit')}>Commit</button>
      <button onClick={() => onPrefill('git branch ')}>Branch…</button>
      <button onClick={() => onPrefill('git checkout ')}>Checkout…</button>
      <button onClick={() => onPrefill('git checkout -b ')}>Checkout -b…</button>
      <button onClick={() => onPrefill('git merge ')}>Merge…</button>
      <button onClick={() => onPrefill('git rebase ')}>Rebase…</button>
      <button onClick={() => onRun('git log')}>Log</button>
      <button onClick={onUndo} disabled={!canUndo}>
        Undo
      </button>
    </div>
  );
}
