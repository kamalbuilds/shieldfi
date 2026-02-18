'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import ProtectionEvent from '@/components/ProtectionEvent';
import type { ProtectionAction } from '@/types';
import * as api from '@/lib/api';

type ActionFilter = ProtectionAction['actionType'] | 'ALL';

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const [actions, setActions] = useState<ProtectionAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ActionFilter>('ALL');

  const fetchHistory = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getProtectionHistory(address);
      setActions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchHistory();
    }
  }, [isConnected, address, fetchHistory]);

  const filteredActions =
    filter === 'ALL'
      ? actions
      : actions.filter((a) => a.actionType === filter);

  const totalProtected = actions.reduce((sum, a) => sum + a.amountProtected, 0);
  const avgRiskReduction =
    actions.length > 0
      ? actions.reduce((sum, a) => sum + (a.riskScoreBefore - a.riskScoreAfter), 0) /
        actions.length
      : 0;

  const FILTERS: { label: string; value: ActionFilter }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Venus Repay', value: 'VENUS_REPAY' },
    { label: 'LP Withdraw', value: 'LP_WITHDRAW' },
    { label: 'Emergency Exit', value: 'EMERGENCY_EXIT' },
    { label: 'Rebalance', value: 'REBALANCE' },
  ];

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-slate-500">
            <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-slate-400">Connect your wallet to view protection history</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Protection History</h1>
        <p className="text-slate-400 text-sm mt-1">
          Timeline of all automated protection actions taken by ShieldFi
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Total Protected</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            ${totalProtected.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Actions Taken</p>
          <p className="text-2xl font-bold text-white mt-1">{actions.length}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Avg Risk Reduction</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            -{avgRiskReduction.toFixed(1)} pts
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === f.value
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl animate-shimmer" />
          ))}
        </div>
      )}

      {!loading && filteredActions.length === 0 && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-slate-500">
              <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Protection Actions Yet</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {filter === 'ALL'
              ? 'ShieldFi has not taken any protection actions yet. Set up rules and monitor your positions to get started.'
              : `No ${filter.replace(/_/g, ' ').toLowerCase()} actions found. Try a different filter.`}
          </p>
        </div>
      )}

      {/* Timeline */}
      {!loading && filteredActions.length > 0 && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
          <div className="space-y-0">
            {filteredActions
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((action, index) => (
                <ProtectionEvent key={`${action.txHash}-${index}`} action={action} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
