'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import RuleCard from '@/components/RuleCard';
import CreateRuleModal from '@/components/CreateRuleModal';
import type { Rule, CreateRuleInput } from '@/types';
import * as api from '@/lib/api';

export default function RulesPage() {
  const { address, isConnected } = useAccount();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  const fetchRules = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const data = await api.getUserRules(address);
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchRules();
    }
  }, [isConnected, address, fetchRules]);

  const handleToggle = useCallback(async (ruleId: number) => {
    try {
      await api.toggleRule(ruleId);
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r))
      );
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  }, []);

  const handleDelete = useCallback(async (ruleId: number) => {
    try {
      await api.deleteRule(ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  }, []);

  const handleCreate = useCallback(async (input: CreateRuleInput) => {
    const newRule = await api.createRule(input);
    setRules((prev) => [...prev, newRule]);
  }, []);

  const handleEdit = useCallback((rule: Rule) => {
    setEditingRule(rule);
    setShowModal(true);
  }, []);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(139,92,246,0.1))' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
            <path d="M12 2L3 7V12C3 17.55 6.84 22.74 12 24C17.16 22.74 21 17.55 21 12V7L12 2Z" />
          </svg>
        </div>
        <p className="text-sm text-slate-500">Connect your wallet to manage protection rules</p>
      </div>
    );
  }

  const activeRules = rules.filter((r) => r.active);
  const pausedRules = rules.filter((r) => !r.active);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Protection Rules</h1>
          <p className="text-sm text-slate-500 mt-1">Configure automated protection for your DeFi positions</p>
        </div>
        <button
          onClick={() => { setEditingRule(null); setShowModal(true); }}
          className="btn-primary px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Rule
        </button>
      </div>

      {error && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="stat-card rounded-xl p-4">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Rules</p>
          <p className="text-2xl font-bold text-white mt-2 tabular-nums">{rules.length}</p>
        </div>
        <div className="stat-card rounded-xl p-4">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold mt-2 tabular-nums" style={{ color: '#10b981' }}>{activeRules.length}</p>
        </div>
        <div className="stat-card rounded-xl p-4">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Triggers</p>
          <p className="text-2xl font-bold text-white mt-2 tabular-nums">
            {rules.reduce((sum, r) => sum + r.triggerCount, 0)}
          </p>
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl animate-skeleton" />
          ))}
        </div>
      )}

      {!loading && rules.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(139,92,246,0.1))' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 2L3 7V12C3 17.55 6.84 22.74 12 24C17.16 22.74 21 17.55 21 12V7L12 2Z" />
              <path d="M8 12H16M12 8V16" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white mb-2">No Protection Rules</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
            Create your first rule to automatically safeguard your DeFi positions.
          </p>
          <button
            onClick={() => { setEditingRule(null); setShowModal(true); }}
            className="btn-primary px-6 py-2.5 rounded-xl text-sm"
          >
            Create Your First Rule
          </button>
        </div>
      )}

      {activeRules.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active Rules ({activeRules.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeRules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} onToggle={handleToggle} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {pausedRules.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
            Paused Rules ({pausedRules.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pausedRules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} onToggle={handleToggle} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {rules.some((r) => r.triggerCount > 0) && (
        <div className="glass-card rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">Rule Trigger History</h2>
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Type</th>
                  <th>Threshold</th>
                  <th>Triggers</th>
                  <th>Last Triggered</th>
                </tr>
              </thead>
              <tbody>
                {rules
                  .filter((r) => r.triggerCount > 0)
                  .sort((a, b) => b.lastTriggeredAt - a.lastTriggeredAt)
                  .map((rule) => (
                    <tr key={rule.id}>
                      <td className="text-white">{rule.description}</td>
                      <td>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md surface-inset text-slate-300 uppercase tracking-wider">
                          {rule.ruleType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="text-white font-mono tabular-nums">{rule.threshold}</td>
                      <td className="text-white tabular-nums">{rule.triggerCount}</td>
                      <td className="text-slate-500">
                        {rule.lastTriggeredAt
                          ? new Date(rule.lastTriggeredAt * 1000).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Never'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateRuleModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingRule(null); }}
        onSubmit={handleCreate}
        editingRule={editingRule}
      />
    </div>
  );
}
