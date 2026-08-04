'use client';

/**
 * CommitGraph — SVG lane-based commit graph.
 * Renders the real commit DAG: branch lanes with per-lane colors, merge rings,
 * and clickable commits. Right column shows message, author and relative time.
 */

import { useMemo } from 'react';

export interface GraphCommit {
  sha: string;
  message: string;
  authorName: string;
  authoredAt: string;
  parents: string[];
}

interface Props {
  commits: GraphCommit[];
  selectedSha?: string;
  onSelectCommit?: (sha: string) => void;
}

const LANE_WIDTH = 26;
const ROW_HEIGHT = 32;
const DOT_RADIUS = 7;

const LANE_COLORS = ['#2563eb', '#dc2626', '#d97706', '#16a34a', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

interface RowLayout {
  commit: GraphCommit;
  lane: number;
  parentSlots: { hash: string; lane: number }[];
  isMerge: boolean;
  laneCount: number;
}

function computeLayout(commits: GraphCommit[]): RowLayout[] {
  const known = new Set(commits.map((commit) => commit.sha));
  // lanes hold the commit hash expected next on that lane (newest → oldest walk)
  const lanes: (string | null)[] = [];
  const rows: RowLayout[] = [];

  for (const commit of commits) {
    let lane = lanes.indexOf(commit.sha);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(commit.sha);
    }

    const parentSlots: { hash: string; lane: number }[] = [];
    const firstParent = commit.parents[0];
    if (firstParent && known.has(firstParent)) {
      parentSlots.push({ hash: firstParent, lane });
      lanes[lane] = firstParent;
    } else {
      lanes[lane] = null;
    }

    for (const parent of commit.parents.slice(1)) {
      if (!known.has(parent)) continue;
      let free = lanes.findIndex((entry) => entry === null);
      if (free === -1) {
        free = lanes.length;
        lanes.push(null);
      }
      parentSlots.push({ hash: parent, lane: free });
      lanes[free] = parent;
    }

    rows.push({
      commit,
      lane,
      parentSlots,
      isMerge: commit.parents.length > 1,
      laneCount: lanes.length,
    });
  }

  return rows;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function CommitGraph({ commits, selectedSha, onSelectCommit }: Props) {
  const rows = useMemo(() => computeLayout(commits), [commits]);

  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">No commits to display.</p>;
  }

  const totalLanes = Math.max(...rows.map((row) => row.laneCount));
  const svgWidth = totalLanes * LANE_WIDTH;
  const svgHeight = rows.length * ROW_HEIGHT;

  return (
    <div className="space-y-3 overflow-x-auto">
      <div className="flex flex-wrap gap-4 text-xs text-gray-600" aria-label="Commit graph legend">
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" />Branch lane</span>
        <span className="inline-flex items-center gap-1"><span className="h-3.5 w-3.5 rounded-full border-2 border-gray-600" />Merge commit</span>
        <span>Colors repeat after {LANE_COLORS.length} lanes</span>
      </div>
      <div className="flex">
      <svg width={svgWidth} height={svgHeight} className="shrink-0" role="img" aria-label="Commit graph">
        <title>Commit graph. Rings mark merge commits; lines connect commits to their parents.</title>
        {/* Edges connect the actual commit node to the rendered parent node. */}
        {rows.map((row, index) => {
          const sourceX = row.lane * LANE_WIDTH + LANE_WIDTH / 2;
          const sourceY = index * ROW_HEIGHT + ROW_HEIGHT / 2;
          return row.commit.parents.flatMap((parent) => {
            const targetIndex = rows.findIndex((candidate) => candidate.commit.sha === parent);
            if (targetIndex < 0) return [];
            const targetRow = rows[targetIndex];
            const targetX = targetRow.lane * LANE_WIDTH + LANE_WIDTH / 2;
            const targetY = targetIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
            const midY = sourceY + ROW_HEIGHT / 2;
            return [
              <path
                key={`${row.commit.sha}-${parent}`}
                d={`M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${targetY - ROW_HEIGHT / 2}, ${targetX} ${targetY}`}
                fill="none"
                stroke={LANE_COLORS[targetRow.lane % LANE_COLORS.length]}
                strokeWidth={2}
                opacity={0.7}
              />,
            ];
          });
        })}
        {rows.map((row, index) => {
          const cx = row.lane * LANE_WIDTH + LANE_WIDTH / 2;
          const cy = index * ROW_HEIGHT + ROW_HEIGHT / 2;
          const color = LANE_COLORS[row.lane % LANE_COLORS.length];
          return (
            <g key={row.commit.sha}>
              {row.isMerge && (
                <circle cx={cx} cy={cy} r={DOT_RADIUS + 3} fill="none" stroke={color} strokeWidth={2} />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={DOT_RADIUS}
                fill={color}
                stroke={selectedSha === row.commit.sha ? '#000' : 'none'}
                strokeWidth={selectedSha === row.commit.sha ? 2 : 0}
                className="cursor-pointer hover:opacity-80"
                onClick={() => onSelectCommit?.(row.commit.sha)}
              >
                <title>
                  {row.commit.sha.slice(0, 12)} — {row.commit.message.split('\n')[0]} — {row.commit.authorName}
                </title>
              </circle>
            </g>
          );
        })}
      </svg>

      <div className="min-w-0 flex-1">
        {rows.map((row) => {
          const color = LANE_COLORS[row.lane % LANE_COLORS.length];
          return (
            <button
              key={row.commit.sha}
              onClick={() => onSelectCommit?.(row.commit.sha)}
              className={`flex w-full items-center gap-2 px-2 text-left hover:bg-gray-50 ${
                selectedSha === row.commit.sha ? 'bg-blue-50' : ''
              }`}
              style={{ height: ROW_HEIGHT }}
            >
              <span className="shrink-0 font-mono text-xs" style={{ color }}>
                {row.commit.sha.slice(0, 7)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{row.commit.message.split('\n')[0]}</span>
              <span className="hidden shrink-0 text-xs text-gray-500 sm:inline">{row.commit.authorName}</span>
              <span className="shrink-0 text-xs text-gray-400">{relativeTime(row.commit.authoredAt)}</span>
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
