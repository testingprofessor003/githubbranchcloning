import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import './CommandBar.css';

export interface HistoryEntry {
  command: string;
  message: string;
  ok: boolean;
}

interface Props {
  history: HistoryEntry[];
  onRun: (command: string) => void;
  prefillText?: string;
  prefillNonce?: number;
}

export default function CommandBar({ history, onRun, prefillText, prefillNonce }: Props) {
  const [value, setValue] = useState('');
  const [cursor, setCursor] = useState<number | null>(null);
  const pastCommands = useRef<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prefillText !== undefined) {
      setValue(prefillText);
      inputRef.current?.focus();
      const len = prefillText.length;
      requestAnimationFrame(() => inputRef.current?.setSelectionRange(len, len));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillNonce]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    pastCommands.current.push(trimmed);
    setCursor(null);
    onRun(trimmed);
    setValue('');
    requestAnimationFrame(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      submit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const cmds = pastCommands.current;
      if (!cmds.length) return;
      const next = cursor === null ? cmds.length - 1 : Math.max(0, cursor - 1);
      setCursor(next);
      setValue(cmds[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const cmds = pastCommands.current;
      if (cursor === null) return;
      const next = cursor + 1;
      if (next >= cmds.length) {
        setCursor(null);
        setValue('');
      } else {
        setCursor(next);
        setValue(cmds[next]);
      }
    }
  }

  return (
    <div className="command-bar">
      <div className="command-log">
        {history.map((h, i) => (
          <div key={i} className="command-entry">
            <div className="command-entry-input">
              <span className="prompt-glyph">$</span> {h.command}
            </div>
            {h.message && <div className={`command-entry-output ${h.ok ? '' : 'error'}`}>{h.message}</div>}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
      <div className="command-input-row">
        <span className="prompt-glyph">$</span>
        <input
          ref={inputRef}
          className="command-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="git checkout -b bugFix"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />
        <button className="command-run-btn" onClick={submit}>
          Run
        </button>
      </div>
    </div>
  );
}
