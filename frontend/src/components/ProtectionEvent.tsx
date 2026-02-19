'use client';

import { useState } from 'react';
import type { ProtectionAction } from '@/types';

interface ProtectionEventProps {
  action: ProtectionAction;
}

const ACTION_CONFIG: Record<
  ProtectionAction['actionType'],
  { label: string; color: string; icon: string }
> = {
  VENUS_REPAY: {
    label: 'Venus Repay',
    color: '#ef4444',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
  LP_WITHDRAW: {
    label: 'LP Withdraw',
    color: '#f59e0b',
    icon: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
  },
  EMERGENCY_EXIT: {
    label: 'Emergency Exit',
    color: '#dc2626',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
  REBALANCE: {
    label: 'Rebalance',
    color: '#8b5cf6',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  },
};

function getScoreColor(score: number): string {
  if (score <= 30) return '#10b981';
  if (score <= 60) return '#f59e0b';
  if (score <= 80) return '#f97316';
  return '#ef4444';
}

function formatUSD(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProtectionEvent({ action }: ProtectionEventProps) {
  const [expanded, setExpanded] = useState(false);
  const config = ACTION_CONFIG[action.actionType];
  const reduction = action.riskScoreBefore - action.riskScoreAfter;

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-3 top-6 bottom-0 w-px" style={{ background: 'rgba(148,163,184,0.06)' }} />

      {/* Timeline dot */}
      <div
        className="absolute left-0.5 top-2 w-6 h-6 rounded-lg flex items-center justify-center"
        style={{ background: `${config.color}15`, border: `1px solid ${config.color}25` }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={config.icon} />
        </svg>
      </div>

      <div className="glass-card rounded-xl p-4 transition-all duration-200 hover:scale-[1.005]">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider"
              style={{ background: `${config.color}10`, color: config.color, border: `1px solid ${config.color}20` }}
            >
              {config.label}
            </span>
            <span className="text-xs text-slate-500">{action.tokenInvolved}</span>
          </div>
          <span className="text-[11px] text-slate-600 tabular-nums">
            {new Date(action.timestamp * 1000).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tabular-nums" style={{ color: getScoreColor(action.riskScoreBefore) }}>
              {action.riskScoreBefore}
            </span>
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
              <path d="M1 5H13M13 5L9 1M13 5L9 9" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-base font-bold tabular-nums" style={{ color: getScoreColor(action.riskScoreAfter) }}>
              {action.riskScoreAfter}
            </span>
            <span className="text-[11px] font-medium ml-1" style={{ color: '#10b981' }}>
              -{reduction} pts
            </span>
          </div>

          <div className="h-3 w-px" style={{ background: 'rgba(148,163,184,0.1)' }} />

          <div className="text-xs">
            <span className="text-slate-500">Protected: </span>
            <span className="text-white font-semibold tabular-nums">{formatUSD(action.amountProtected)}</span>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-[11px] font-medium transition-colors"
          style={{ color: '#22d3ee' }}
        >
          {expanded ? 'Hide reasoning' : 'Show AI reasoning'}
        </button>

        {expanded && (
          <div className="mt-2 surface-inset rounded-lg p-3 animate-fade-in">
            <p className="text-xs text-slate-300 leading-relaxed">{action.reasoning}</p>
          </div>
        )}

        {action.txHash && (
          <a
            href={`https://bscscan.com/tx/${action.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-medium transition-colors"
            style={{ color: '#22d3ee' }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M5 1H2C1.44772 1 1 1.44772 1 2V10C1 10.5523 1.44772 11 2 11H10C10.5523 11 11 10.5523 11 10V7M7 1H11M11 1V5M11 1L5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            View on BSCScan
          </a>
        )}
      </div>
    </div>
  );
}
