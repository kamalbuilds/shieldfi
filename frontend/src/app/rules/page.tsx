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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-slate-500">
            <path d="M12 2L3 7V12C3 17.55 6.84 22.74 12 24C17.16 22.74 21 17.55 21 12V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-slate-400">Connect your wallet to manage protection rules</p>
      </div>
    );
  }

  const activeRules = rules.filter((r) => r.active);
  const pausedRules = rules.filter((r) => !r.active);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Protection Rules</h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure automated protection for your DeFi positions
          </p>
        </div>
        <button
          onClick={() => {
            setEditingRule(null);
            setShowModal(true);
          }}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Create New Rule
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Total Rules</p>
          <p className="text-2xl font-bold text-white mt-1">{rules.length}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeRules.length}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Total Triggers</p>
          <p className="text-2xl font-bold text-white mt-1">
            {rules.reduce((sum, r) => sum + r.triggerCount, 0)}
          </p>
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl animate-shimmer" />
          ))}
        </div>
      )}

      {!loading && rules.length === 0 && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-slate-500">
              <path d="M12 2L3 7V12C3 17.55 6.84 22.74 12 24C17.16 22.74 21 17.55 21 12V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 12H16M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Protection Rules</h3>
          <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">
            Create your first protection rule to automatically safeguard your DeFi positions against liquidation, impermanent loss, and portfolio drops.
          </p>
          <button
            onClick={() => {
              setEditingRule(null);
              setShowModal(true);
            }}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors"
          >
            Create Your First Rule
          </button>
        </div>
      )}

      {/* Active Rules */}
      {activeRules.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Active Rules ({activeRules.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Paused Rules */}
      {pausedRules.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            Paused Rules ({pausedRules.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pausedRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={handleToggle}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rule History */}
      {rules.some((r) => r.triggerCount > 0) && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Rule Trigger History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Rule</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Threshold</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Triggers</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Last Triggered</th>
                </tr>
              </thead>
              <tbody>
                {rules
                  .filter((r) => r.triggerCount > 0)
                  .sort((a, b) => b.lastTriggeredAt - a.lastTriggeredAt)
                  .map((rule) => (
                    <tr key={rule.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="py-3 px-4 text-white">{rule.description}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {rule.ruleType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white font-mono">{rule.threshold}</td>
                      <td className="py-3 px-4 text-white">{rule.triggerCount}</td>
                      <td className="py-3 px-4 text-slate-400">
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
        onClose={() => {
          setShowModal(false);
          setEditingRule(null);
        }}
        onSubmit={handleCreate}
        editingRule={editingRule}
      />
    </div>
  );
}
