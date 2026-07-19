import { useState } from 'react';
import type { Level } from '../levels/types';
import RichText from './RichText';
import logo from '../assets/logo.png';
import './LevelPanel.css';

interface Props {
  levels: Level[];
  currentIndex: number;
  completed: Set<string>;
  solved: boolean;
  onSelectLevel: (index: number) => void;
  onNextLevel: () => void;
  onResetLevel: () => void;
  sandboxMode: boolean;
  onToggleSandbox: () => void;
  savedCount: number;
  onOpenWorkflows: () => void;
}

export default function LevelPanel({
  levels,
  currentIndex,
  completed,
  solved,
  onSelectLevel,
  onNextLevel,
  onResetLevel,
  sandboxMode,
  onToggleSandbox,
  savedCount,
  onOpenWorkflows,
}: Props) {
  const [showHints, setShowHints] = useState(false);
  const level = levels[currentIndex];

  return (
    <div className="level-panel">
      <div className="level-panel-header">
        <div className="brand">
          <img src={logo} alt="Testing Professor" className="brand-logo" />
          <div>
            <h1>Testing Professor</h1>
            <p className="brand-subtitle">Learn Git branching &amp; merging</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="sandbox-toggle" onClick={onOpenWorkflows}>
            🗂 Saved{savedCount > 0 ? ` (${savedCount})` : ''}
          </button>
          <button className="sandbox-toggle" onClick={onToggleSandbox}>
            {sandboxMode ? '📘 Back to levels' : '🧪 Sandbox mode'}
          </button>
        </div>
      </div>

      {!sandboxMode && (
        <div className="level-list">
          {levels.map((l, i) => (
            <button
              key={l.id}
              className={`level-pill ${i === currentIndex ? 'active' : ''} ${completed.has(l.id) ? 'done' : ''}`}
              onClick={() => onSelectLevel(i)}
            >
              {completed.has(l.id) ? '✓' : i + 1}
            </button>
          ))}
        </div>
      )}

      {sandboxMode ? (
        <div className="level-body">
          <h2>Sandbox</h2>
          <p>
            No goal here — branch, commit, merge and rebase freely and watch the graph respond. Great for testing
            "what if I..." questions.
          </p>
          <div className="level-actions">
            <button className="reset-btn" onClick={onResetLevel}>
              Reset
            </button>
            <button className="reset-btn" onClick={onOpenWorkflows}>
              💾 Save / load…
            </button>
          </div>
        </div>
      ) : (
        <div className="level-body">
          <h2>{level.title}</h2>
          <p className="concept">
            <RichText text={level.concept} />
          </p>
          {level.paragraphs.map((p, i) => (
            <p key={i}>
              <RichText text={p} />
            </p>
          ))}

          <button className="hints-toggle" onClick={() => setShowHints((s) => !s)}>
            {showHints ? 'Hide hints' : 'Show hints'}
          </button>
          {showHints && (
            <ol className="hints-list">
              {level.hints.map((h, i) => (
                <li key={i}>
                  <code>{h}</code>
                </li>
              ))}
            </ol>
          )}

          <div className="level-actions">
            <button className="reset-btn" onClick={onResetLevel}>
              Reset level
            </button>
            <button className="reset-btn" onClick={onOpenWorkflows}>
              💾 Save / load…
            </button>
            {currentIndex < levels.length - 1 && (
              <button className="next-btn" disabled={!solved} onClick={onNextLevel}>
                Next level →
              </button>
            )}
          </div>

          {solved && (
            <div className="success-banner">
              <strong>Solved!</strong> <RichText text={level.successMessage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
