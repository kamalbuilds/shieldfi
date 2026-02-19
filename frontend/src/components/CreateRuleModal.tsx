'use client';

import { useState } from 'react';
import type { Rule, CreateRuleInput } from '@/types';

interface CreateRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rule: CreateRuleInput) => Promise<void>;
  editingRule?: Rule | null;
}

const RULE_TYPES: {
  value: Rule['ruleType'];
  label: string;
  help: string;
  placeholder: string;
}[] = [
  {
    value: 'VENUS_HEALTH_FACTOR',
    label: 'Venus Health Factor',
    help: 'Trigger protection when your Venus Protocol health factor drops below this value. Recommended: 1.3-1.5.',
    placeholder: '1.3',
  },
  {
    value: 'IL_THRESHOLD',
    label: 'Impermanent Loss Threshold',
    help: 'Trigger when impermanent loss on any LP position exceeds this percentage. Recommended: 3-5%.',
    placeholder: '5',
  },
  {
    value: 'PORTFOLIO_DROP',
    label: 'Portfolio Value Drop',
    help: 'Trigger when total portfolio value drops by this percentage from its peak. Recommended: 10-20%.',
    placeholder: '15',
  },
  {
    value: 'CONCENTRATION_LIMIT',
    label: 'Concentration Limit',
    help: 'Trigger when any single position exceeds this percentage of total portfolio. Recommended: 30-50%.',
    placeholder: '40',
  },
];

export default function CreateRuleModal({
  isOpen,
  onClose,
  onSubmit,
  editingRule,
}: CreateRuleModalProps) {
  const [ruleType, setRuleType] = useState<Rule['ruleType']>(
    editingRule?.ruleType || 'VENUS_HEALTH_FACTOR'
  );
  const [threshold, setThreshold] = useState(
    editingRule?.threshold?.toString() || ''
  );
  const [autoExecute, setAutoExecute] = useState(editingRule?.autoExecute ?? false);
  const [description, setDescription] = useState(editingRule?.description || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedType = RULE_TYPES.find((t) => t.value === ruleType)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const thresholdNum = parseFloat(threshold);
    if (isNaN(thresholdNum) || thresholdNum <= 0) {
      setError('Please enter a valid threshold value.');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description for this rule.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ruleType,
        threshold: thresholdNum,
        autoExecute,
        active: true,
        description: description.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-fade-in-up" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(6,8,15,0.98) 100%)', border: '1px solid rgba(148,163,184,0.1)' }}>
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
          <h2 className="text-lg font-bold text-white">
            {editingRule ? 'Edit Protection Rule' : 'Create Protection Rule'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800/50"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Rule Type
            </label>
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as Rule['ruleType'])}
              className="search-input w-full rounded-lg px-4 py-2.5 text-sm"
            >
              {RULE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-slate-500">{selectedType.help}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Threshold
            </label>
            <input
              type="number"
              step="any"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={selectedType.placeholder}
              className="search-input w-full rounded-lg px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Auto-execute
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Automatically execute protection when triggered
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoExecute(!autoExecute)}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ background: autoExecute ? 'linear-gradient(135deg, #0891b2, #7c3aed)' : 'rgba(51,65,85,0.5)' }}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    autoExecute ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {autoExecute && (
              <div className="mt-2 rounded-lg p-2.5" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <p className="text-[11px] text-amber-400">
                  Auto-execute will perform on-chain transactions automatically. Make sure you understand the implications.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this rule does..."
              rows={3}
              className="search-input w-full rounded-lg px-4 py-2.5 text-sm resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-2.5 text-sm rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 py-2.5 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Saving...'
                : editingRule
                ? 'Update Rule'
                : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
