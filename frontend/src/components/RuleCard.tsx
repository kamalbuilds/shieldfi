'use client';

import type { Rule } from '@/types';

interface RuleCardProps {
  rule: Rule;
  onToggle: (ruleId: number) => void;
  onEdit?: (rule: Rule) => void;
  onDelete?: (ruleId: number) => void;
}

const RULE_TYPE_CONFIG: Record<Rule['ruleType'], { label: string; color: string; icon: string }> = {
  VENUS_HEALTH_FACTOR: { label: 'Health Factor', color: '#ef4444', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  IL_THRESHOLD: { label: 'Impermanent Loss', color: '#f59e0b', icon: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6' },
  PORTFOLIO_DROP: { label: 'Portfolio Drop', color: '#f97316', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  CONCENTRATION_LIMIT: { label: 'Concentration', color: '#8b5cf6', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
};

function formatTimestamp(ts: number): string {
  if (!ts) return 'Never';
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RuleCard({ rule, onToggle, onEdit, onDelete }: RuleCardProps) {
  const config = RULE_TYPE_CONFIG[rule.ruleType];

  return (
    <div
      className={`glass-card rounded-xl p-4 transition-all duration-200 ${
        rule.active ? 'hover:scale-[1.01]' : 'opacity-50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${config.color}12`, border: `1px solid ${config.color}25` }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={config.icon} />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{config.label}</p>
            <p className="text-[11px] text-slate-500 truncate">{rule.description}</p>
          </div>
        </div>

        <button
          onClick={() => onToggle(rule.id)}
          className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
            rule.active ? '' : ''
          }`}
          style={{ background: rule.active ? 'linear-gradient(135deg, #0891b2, #7c3aed)' : 'rgba(51,65,85,0.5)' }}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
              rule.active ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs mb-3">
        <div className="surface-inset px-2 py-1 rounded">
          <span className="text-slate-500">Threshold </span>
          <span className="font-semibold tabular-nums" style={{ color: config.color }}>{rule.threshold}</span>
        </div>
        <div className="surface-inset px-2 py-1 rounded">
          <span className="text-slate-500">Auto </span>
          <span className={rule.autoExecute ? 'text-emerald-400' : 'text-slate-500'}>{rule.autoExecute ? 'ON' : 'OFF'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-600">
          {rule.triggerCount}x triggered | Last: {formatTimestamp(rule.lastTriggeredAt)}
        </span>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(rule)}
              className="text-[11px] text-slate-500 hover:text-white px-2 py-1 rounded hover:bg-slate-800/50 transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(rule.id)}
              className="text-[11px] text-red-500/60 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/5 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
