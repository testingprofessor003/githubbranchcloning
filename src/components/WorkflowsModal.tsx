import { useState } from 'react';
import type { SavedWorkflow } from '../persistence/workflows';
import type { Level } from '../levels/types';
import './WorkflowsModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  workflows: SavedWorkflow[];
  levels: Level[];
  canSave: boolean;
  currentContextLabel: string;
  onSave: (name: string) => void;
  onLoad: (workflow: SavedWorkflow) => void;
  onDelete: (id: string) => void;
}

function levelLabel(levels: Level[], levelId: string | null): string {
  if (levelId === null) return 'Sandbox';
  return levels.find((l) => l.id === levelId)?.title ?? 'Unknown level';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function WorkflowsModal({
  open,
  onClose,
  workflows,
  levels,
  canSave,
  currentContextLabel,
  onSave,
  onLoad,
  onDelete,
}: Props) {
  const [name, setName] = useState('');

  if (!open) return null;

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
  }

  return (
    <div className="workflows-backdrop" onClick={onClose}>
      <div className="workflows-modal" onClick={(e) => e.stopPropagation()}>
        <div className="workflows-header">
          <h2>Saved workflows</h2>
          <button className="workflows-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="workflows-save-row">
          <input
            className="workflows-name-input"
            placeholder={`Name this attempt (${currentContextLabel})`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            disabled={!canSave}
          />
          <button className="workflows-save-btn" onClick={handleSave} disabled={!canSave || !name.trim()}>
            💾 Save current
          </button>
        </div>
        {!canSave && (
          <p className="workflows-hint">Run at least one command before saving this attempt.</p>
        )}

        <div className="workflows-list">
          {workflows.length === 0 && (
            <p className="workflows-empty">No saved workflows yet — your saved attempts will show up here.</p>
          )}
          {workflows.map((w) => (
            <div key={w.id} className="workflow-item">
              <div className="workflow-item-info">
                <div className="workflow-item-name">{w.name}</div>
                <div className="workflow-item-meta">
                  <span className="workflow-item-level">{levelLabel(levels, w.levelId)}</span>
                  <span> · {w.commands.length} command{w.commands.length === 1 ? '' : 's'}</span>
                  <span> · {formatDate(w.savedAt)}</span>
                </div>
              </div>
              <div className="workflow-item-actions">
                <button className="workflow-load-btn" onClick={() => onLoad(w)}>
                  Load
                </button>
                <button className="workflow-delete-btn" onClick={() => onDelete(w.id)} aria-label="Delete">
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
