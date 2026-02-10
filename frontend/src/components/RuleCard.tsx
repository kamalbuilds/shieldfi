'use client';

import type { Rule } from '@/types';

interface RuleCardProps {
  rule: Rule;
  onToggle: (ruleId: number) => void;
  onEdit?: (rule: Rule) => void;
  onDelete?: (ruleId: number) => void;
}

const RULE_TYPE_CONFIG: Record<Rule['ruleType'], { icon: string; label: string; color: string }> = {
  VENUS_HEALTH_FACTOR: { icon: '\u2764\uFE0F', label: 'Venus Health Factor', color: '#EF4444' },
  IL_THRESHOLD: { icon: '\uD83D\uDCC9', label: 'Impermanent Loss', color: '#F59E0B' },
  PORTFOLIO_DROP: { icon: '\uD83D\uDCB0', label: 'Portfolio Drop', color: '#F97316' },
  CONCENTRATION_LIMIT: { icon: '\uD83C\uDFAF', label: 'Concentration Limit', color: '#8B5CF6' },
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
      className={`bg-slate-900/50 border rounded-xl p-5 transition-all ${
        rule.active ? 'border-emerald-500/30 hover:border-emerald-500/50' : 'border-slate-800 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <p className="text-white font-semibold text-sm">{config.label}</p>
            <p className="text-slate-400 text-xs mt-0.5">{rule.description}</p>
          </div>
        </div>

        <button
          onClick={() => onToggle(rule.id)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            rule.active ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              rule.active ? 'translate-x-5.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div className="flex items-center gap-4 text-sm mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Threshold:</span>
          <span className="font-semibold" style={{ color: config.color }}>
            {rule.threshold}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Auto-execute:</span>
          <span className={rule.autoExecute ? 'text-emerald-400' : 'text-slate-500'}>
            {rule.autoExecute ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Triggered {rule.triggerCount}x | Last: {formatTimestamp(rule.lastTriggeredAt)}
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(rule)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(rule.id)}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
