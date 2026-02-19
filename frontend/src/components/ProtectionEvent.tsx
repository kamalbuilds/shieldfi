'use client';

import { useState } from 'react';
import type { ProtectionAction } from '@/types';

interface ProtectionEventProps {
  action: ProtectionAction;
}

const ACTION_CONFIG: Record<
  ProtectionAction['actionType'],
  { label: string; color: string; bgColor: string; icon: string }
> = {
  VENUS_REPAY: {
    label: 'Venus Repay',
    color: '#EF4444',
    bgColor: 'rgba(239,68,68,0.15)',
    icon: '\uD83D\uDEE1\uFE0F',
  },
  LP_WITHDRAW: {
    label: 'LP Withdraw',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.15)',
    icon: '\uD83D\uDCE4',
  },
  EMERGENCY_EXIT: {
    label: 'Emergency Exit',
    color: '#DC2626',
    bgColor: 'rgba(220,38,38,0.15)',
    icon: '\uD83D\uDEA8',
  },
  REBALANCE: {
    label: 'Rebalance',
    color: '#8B5CF6',
    bgColor: 'rgba(139,92,246,0.15)',
    icon: '\u2696\uFE0F',
  },
};

function getScoreColor(score: number): string {
  if (score <= 30) return '#10B981';
  if (score <= 60) return '#F59E0B';
  if (score <= 80) return '#F97316';
  return '#EF4444';
}

export default function ProtectionEvent({ action }: ProtectionEventProps) {
  const [expanded, setExpanded] = useState(false);
  const config = ACTION_CONFIG[action.actionType];
  const reduction = action.riskScoreBefore - action.riskScoreAfter;

  return (
    <div className="relative pl-8 pb-8 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-3 top-3 bottom-0 w-px bg-slate-800 last:hidden" />
      {/* Timeline dot */}
      <div
        className="absolute left-1 top-2 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs"
        style={{
          borderColor: config.color,
          backgroundColor: config.bgColor,
        }}
      >
        <span className="text-[10px]">{config.icon}</span>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ backgroundColor: config.bgColor, color: config.color }}
            >
              {config.label}
            </span>
            <span className="text-slate-400 text-xs">
              {action.tokenInvolved}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {new Date(action.timestamp * 1000).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="flex items-center gap-4 mt-3">
          {/* Risk score change */}
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-bold tabular-nums"
              style={{ color: getScoreColor(action.riskScoreBefore) }}
            >
              {action.riskScoreBefore}
            </span>
            <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
              <path d="M1 6H17M17 6L12 1M17 6L12 11" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span
              className="text-lg font-bold tabular-nums"
              style={{ color: getScoreColor(action.riskScoreAfter) }}
            >
              {action.riskScoreAfter}
            </span>
            <span className="text-emerald-400 text-xs font-medium ml-1">
              -{reduction} pts
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="text-sm">
            <span className="text-slate-400">Protected: </span>
            <span className="text-white font-semibold">
              ${action.amountProtected.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          {expanded ? 'Hide reasoning' : 'Show AI reasoning'}
        </button>

        {expanded && (
          <div className="mt-2 bg-slate-800/50 rounded-lg p-3">
            <p className="text-sm text-slate-300 leading-relaxed">{action.reasoning}</p>
          </div>
        )}

        {action.txHash && (
          <a
            href={`https://bscscan.com/tx/${action.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M5 1H2C1.44772 1 1 1.44772 1 2V10C1 10.5523 1.44772 11 2 11H10C10.5523 11 11 10.5523 11 10V7M7 1H11M11 1V5M11 1L5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            View on BSCScan
          </a>
        )}
      </div>
    </div>
  );
}
