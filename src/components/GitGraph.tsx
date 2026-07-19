import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { computeLayout } from '../layout/layout';
import type { EngineState } from '../git/types';
import './GitGraph.css';

const LANE_COLORS = ['#6ee7f2', '#ff9f6b', '#c792ea', '#7ee787', '#f78fb3', '#f6d365', '#82aaff'];

function laneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length];
}

interface Props {
  state: EngineState;
}

export default function GitGraph({ state }: Props) {
  const layout = useMemo(() => computeLayout(state), [state]);

  return (
    <div className="git-graph-scroll">
      <svg
        className="git-graph-svg"
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
      >
        <g>
          <AnimatePresence>
            {layout.edges.map((e) => (
              <motion.line
                key={e.key}
                className="graph-edge"
                initial={{ x1: e.x2, y1: e.y2, x2: e.x2, y2: e.y2, opacity: 0 }}
                animate={{ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 170, damping: 22 }}
              />
            ))}
          </AnimatePresence>
        </g>

        <g>
          <AnimatePresence>
            {layout.nodes.map((n) => {
              const commit = state.commits[n.id];
              return (
                <motion.g
                  key={n.id}
                  initial={{ x: n.x, y: n.y, opacity: 0, scale: 0.3 }}
                  animate={{ x: n.x, y: n.y, opacity: n.reachable ? 1 : 0.35, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.3 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                >
                  <circle
                    r={commit.isMerge ? 20 : 18}
                    className={`commit-circle ${n.isHead ? 'commit-current' : ''} ${commit.isMerge ? 'commit-merge' : ''}`}
                    style={{ fill: laneColor(commit.lane) }}
                  />
                  <text className="commit-id" textAnchor="middle" dy="5">
                    {n.id.replace('C', '')}
                  </text>
                </motion.g>
              );
            })}
          </AnimatePresence>
        </g>

        <g>
          <AnimatePresence>
            {layout.branchLabels.map((b) => (
              <motion.g
                key={b.name}
                initial={{ x: b.x, y: b.y, opacity: 0 }}
                animate={{ x: b.x, y: b.y, opacity: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              >
                <rect
                  x={-44}
                  y={-13}
                  width={88}
                  height={24}
                  rx={6}
                  className={`branch-badge ${b.isCurrent ? 'branch-badge-current' : ''}`}
                />
                <text textAnchor="middle" dy="5" className="branch-badge-text">
                  {b.name}
                </text>
              </motion.g>
            ))}
          </AnimatePresence>
        </g>

        <motion.g
          animate={{ x: layout.head.x, y: layout.head.y }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        >
          <rect x={-24} y={-11} width={48} height={20} rx={5} className="head-badge" />
          <text textAnchor="middle" dy="4" className="head-badge-text">
            HEAD
          </text>
        </motion.g>
      </svg>
    </div>
  );
}
