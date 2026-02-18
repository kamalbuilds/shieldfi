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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">
            {editingRule ? 'Edit Protection Rule' : 'Create Protection Rule'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Rule Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Rule Type
            </label>
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as Rule['ruleType'])}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            >
              {RULE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-400">{selectedType.help}</p>
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Threshold
            </label>
            <input
              type="number"
              step="any"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={selectedType.placeholder}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-slate-500"
            />
          </div>

          {/* Auto-execute toggle */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-300">
                  Auto-execute
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automatically execute protection actions when triggered
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoExecute(!autoExecute)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoExecute ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    autoExecute ? 'translate-x-5.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {autoExecute && (
              <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">
                <p className="text-xs text-amber-400">
                  Warning: Auto-execute will perform on-chain transactions automatically. Ensure you understand the implications.
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this rule does..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors placeholder-slate-500 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
