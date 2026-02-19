'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import ProtectionEvent from '@/components/ProtectionEvent';
import type { ProtectionAction } from '@/types';
import * as api from '@/lib/api';

type ActionFilter = ProtectionAction['actionType'] | 'ALL';

function formatUSD(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(139,92,246,0.1))' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" />
          </svg>
        </div>
        <p className="text-sm text-slate-500">Connect your wallet to view protection history</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white tracking-tight">Protection History</h1>
        <p className="text-sm text-slate-500 mt-1">Timeline of all automated protection actions taken by ShieldFi</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="stat-card rounded-xl p-4">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Protected</p>
          <p className="text-2xl font-bold mt-2 tabular-nums" style={{ color: '#10b981' }}>
            {formatUSD(totalProtected)}
          </p>
        </div>
        <div className="stat-card rounded-xl p-4">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Actions Taken</p>
          <p className="text-2xl font-bold text-white mt-2 tabular-nums">{actions.length}</p>
        </div>
        <div className="stat-card rounded-xl p-4">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Avg Risk Reduction</p>
          <p className="text-2xl font-bold mt-2 tabular-nums" style={{ color: '#10b981' }}>
            -{avgRiskReduction.toFixed(1)} pts
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              filter === f.value
                ? 'text-white'
                : 'btn-secondary'
            }`}
            style={filter === f.value ? { background: 'linear-gradient(135deg, rgba(8,145,178,0.2), rgba(124,58,237,0.2))', border: '1px solid rgba(34,211,238,0.2)' } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl animate-skeleton" />
          ))}
        </div>
      )}

      {!loading && filteredActions.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(139,92,246,0.1))' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white mb-2">No Protection Actions Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {filter === 'ALL'
              ? 'ShieldFi has not taken any protection actions yet. Set up rules and monitor your positions to get started.'
              : `No ${filter.replace(/_/g, ' ').toLowerCase()} actions found. Try a different filter.`}
          </p>
        </div>
      )}

      {!loading && filteredActions.length > 0 && (
        <div className="glass-card rounded-2xl p-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
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
