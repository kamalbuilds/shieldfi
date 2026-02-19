'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import RiskGauge from '@/components/RiskGauge';
import HealthFactor from '@/components/HealthFactor';
import PositionCard from '@/components/PositionCard';
import RiskBar from '@/components/RiskBar';
import RuleCard from '@/components/RuleCard';
import CreateRuleModal from '@/components/CreateRuleModal';
import type { PositionScan, Rule, CreateRuleInput } from '@/types';
import * as api from '@/lib/api';

const DEMO_ADDRESS = '0x11ededebf63bef0ea2d2d071bdf88f71543ec6fb';

const RISK_EXPLANATIONS: Record<string, string> = {
  liquidationProximity:
    'Measures how close your Venus Protocol positions are to liquidation. Higher score means greater risk of being liquidated.',
  impermanentLoss:
    'Evaluates the impermanent loss across all your PancakeSwap LP positions. Higher score means more IL exposure.',
  concentrationRisk:
    'Assesses how concentrated your portfolio is in a single asset or protocol. Diversification lowers this score.',
  volatilityExposure:
    'Measures your exposure to volatile assets. Stablecoins lower this score, while meme tokens raise it.',
  liquidityRisk:
    'Evaluates the liquidity of your positions. Illiquid pools or low-volume tokens raise this score.',
};

function formatUSD(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getTokenColor(symbol: string): string {
  const colors: Record<string, string> = {
    BNB: '#f0b90b', WBNB: '#f0b90b', BTCB: '#f7931a', BTC: '#f7931a',
    ETH: '#627eea', WETH: '#627eea', USDT: '#26a17b', USDC: '#2775ca',
    BUSD: '#f0b90b', DAI: '#f5ac37', CAKE: '#d1884f', XRP: '#23292f',
    XVS: '#1db9a6', LINK: '#2a5ada', UNI: '#ff007a', DOT: '#e6007a',
  };
  return colors[symbol.toUpperCase()] || '#64748b';
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-skeleton ${className}`} />;
}

export default function Dashboard() {
  const [searchAddress, setSearchAddress] = useState(DEMO_ADDRESS);
  const [activeAddress, setActiveAddress] = useState('');
  const [scan, setScan] = useState<PositionScan | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const hasAutoScanned = useRef(false);

  const handleScan = useCallback(async (address: string) => {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError('Please enter a valid BSC address (0x...)');
      return;
    }
    setLoading(true);
    setError('');
    setActiveAddress(address);
    try {
      const [positions, userRules] = await Promise.allSettled([
        api.scanPositions(address),
        api.getUserRules(address),
      ]);
      if (positions.status === 'fulfilled') {
        setScan(positions.value);
      } else {
        throw positions.reason;
      }
      if (userRules.status === 'fulfilled') {
        setRules(userRules.value);
      } else {
        setRules([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan. Is the backend running at localhost:4022?');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-scan on mount
  useEffect(() => {
    if (!hasAutoScanned.current) {
      hasAutoScanned.current = true;
      handleScan(DEMO_ADDRESS);
    }
  }, [handleScan]);

  const handleToggleRule = useCallback(async (ruleId: number) => {
    try {
      await api.toggleRule(ruleId);
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r))
      );
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  }, []);

  const handleCreateRule = useCallback(
    async (input: CreateRuleInput) => {
      const newRule = await api.createRule(input);
      setRules((prev) => [...prev, newRule]);
    },
    []
  );

  const totalPortfolioValue = scan
    ? scan.venus.totalSupplyUSD +
      scan.pancakeswap.reduce((s, lp) => s + lp.valueUSD, 0) +
      scan.wallet.reduce((s, t) => s + t.valueUSD, 0)
    : 0;

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <section className="animate-fade-in-up">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Risk Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Enter any BSC address to analyze DeFi positions and risk exposure</p>
        </div>

        <div className="mt-4 flex gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleScan(searchAddress); }}
              placeholder="0x... Enter BSC wallet address"
              className="search-input w-full h-12 pl-11 pr-4 rounded-xl text-sm font-mono"
            />
          </div>
          <button
            onClick={() => handleScan(searchAddress)}
            disabled={loading}
            className="btn-primary h-12 px-6 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Scanning...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L3 7V12C3 17.55 6.84 22.74 12 24C17.16 22.74 21 17.55 21 12V7L12 2Z" />
                </svg>
                Analyze
              </>
            )}
          </button>
        </div>

        {activeAddress && !loading && scan && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Showing results for</span>
            <code className="font-mono text-slate-400 bg-slate-800/40 px-1.5 py-0.5 rounded">
              {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
            </code>
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-xl p-4 animate-fade-in" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div className="flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-24 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SkeletonBlock className="h-64 rounded-xl lg:col-span-1" />
            <SkeletonBlock className="h-64 rounded-xl lg:col-span-2" />
          </div>
          <SkeletonBlock className="h-48 rounded-xl" />
        </div>
      )}

      {/* Dashboard Content */}
      {scan && !loading && (
        <>
          {/* Top Stats Bar */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="stat-card rounded-xl p-4">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Portfolio Value</p>
              <p className="text-xl font-bold text-white mt-2 tabular-nums">{formatUSD(totalPortfolioValue)}</p>
              <p className="text-[11px] text-slate-600 mt-1">{scan.wallet.length} tokens tracked</p>
            </div>
            <div className="stat-card rounded-xl p-4">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Health Factor</p>
              <p className="text-xl font-bold mt-2 tabular-nums" style={{ color: scan.venus.healthFactor >= 2 ? '#10b981' : scan.venus.healthFactor >= 1.5 ? '#f59e0b' : '#ef4444' }}>
                {scan.venus.healthFactor >= 999 ? '---' : scan.venus.healthFactor.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-600 mt-1">Venus Protocol</p>
            </div>
            <div className="stat-card rounded-xl p-4">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Risk Score</p>
              <p className="text-xl font-bold mt-2 tabular-nums" style={{ color: scan.riskScore.total <= 30 ? '#10b981' : scan.riskScore.total <= 60 ? '#f59e0b' : '#ef4444' }}>
                {scan.riskScore.total}<span className="text-sm text-slate-600 font-normal">/100</span>
              </p>
              <p className="text-[11px] text-slate-600 mt-1">{scan.riskScore.level}</p>
            </div>
            <div className="stat-card rounded-xl p-4">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active Rules</p>
              <p className="text-xl font-bold text-white mt-2 tabular-nums">{rules.filter(r => r.active).length}</p>
              <p className="text-[11px] text-slate-600 mt-1">{rules.length} total configured</p>
            </div>
          </section>

          {/* Risk Gauge + Breakdown */}
          <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="lg:col-span-2 glass-card rounded-xl p-6">
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-5">Overall Risk Assessment</h2>
              <RiskGauge
                score={scan.riskScore.total}
                level={scan.riskScore.level}
                summary={
                  scan.riskScore.recommendations.length > 0
                    ? scan.riskScore.recommendations[0]
                    : undefined
                }
              />
            </div>

            <div className="lg:col-span-3 glass-card rounded-xl p-6">
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-5">Risk Breakdown</h2>
              <div className="space-y-5">
                <RiskBar label="Liquidation Proximity" value={scan.riskScore.breakdown.liquidationProximity} maxValue={30} explanation={RISK_EXPLANATIONS.liquidationProximity} />
                <RiskBar label="Impermanent Loss" value={scan.riskScore.breakdown.impermanentLoss} maxValue={25} explanation={RISK_EXPLANATIONS.impermanentLoss} />
                <RiskBar label="Concentration Risk" value={scan.riskScore.breakdown.concentrationRisk} maxValue={20} explanation={RISK_EXPLANATIONS.concentrationRisk} />
                <RiskBar label="Volatility Exposure" value={scan.riskScore.breakdown.volatilityExposure} maxValue={15} explanation={RISK_EXPLANATIONS.volatilityExposure} />
                <RiskBar label="Liquidity Risk" value={scan.riskScore.breakdown.liquidityRisk} maxValue={10} explanation={RISK_EXPLANATIONS.liquidityRisk} />
              </div>
            </div>
          </section>

          <div className="section-divider" />

          {/* DeFi Positions */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            {/* Venus Protocol */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="protocol-badge-venus px-3 py-1 rounded-lg text-xs font-semibold">Venus Protocol</div>
                {scan.venus.supplies.length + scan.venus.borrows.length > 0 && (
                  <span className="text-[11px] text-slate-500">
                    {scan.venus.supplies.length + scan.venus.borrows.length} positions
                  </span>
                )}
              </div>

              <HealthFactor
                healthFactor={scan.venus.healthFactor}
                totalSupplyUSD={scan.venus.totalSupplyUSD}
                totalBorrowUSD={scan.venus.totalBorrowUSD}
                liquidationRisk={scan.venus.liquidationRisk}
              />

              {scan.venus.supplies.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Supply Positions</h3>
                  <div className="space-y-2">
                    {scan.venus.supplies.map((s) => (
                      <PositionCard key={s.vTokenAddress} type="supply" position={s} />
                    ))}
                  </div>
                </div>
              )}

              {scan.venus.borrows.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Borrow Positions</h3>
                  <div className="space-y-2">
                    {scan.venus.borrows.map((b) => (
                      <PositionCard key={b.vTokenAddress} type="borrow" position={b} />
                    ))}
                  </div>
                </div>
              )}

              {scan.venus.supplies.length === 0 && scan.venus.borrows.length === 0 && (
                <div className="glass-card rounded-xl p-8 text-center">
                  <p className="text-sm text-slate-500">No Venus Protocol positions found for this address</p>
                </div>
              )}
            </div>

            {/* PancakeSwap LP */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="protocol-badge-pancake px-3 py-1 rounded-lg text-xs font-semibold">PancakeSwap LP</div>
                {scan.pancakeswap.length > 0 && (
                  <span className="text-[11px] text-slate-500">
                    {scan.pancakeswap.length} positions
                  </span>
                )}
              </div>

              {scan.pancakeswap.length > 0 ? (
                <div className="space-y-2">
                  {scan.pancakeswap.map((lp) => (
                    <PositionCard
                      key={lp.positionId}
                      type="lp"
                      position={lp}
                      onWithdraw={(id) => {
                        console.log('Withdraw LP position:', id);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="glass-card rounded-xl p-8 text-center">
                  <p className="text-sm text-slate-500">No PancakeSwap LP positions found for this address</p>
                </div>
              )}
            </div>
          </section>

          <div className="section-divider" />

          {/* Wallet Portfolio Table */}
          {scan.wallet.length > 0 && (
            <section className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Wallet Portfolio</h2>
                  <p className="text-lg font-bold text-white mt-1">
                    {formatUSD(scan.wallet.reduce((s, t) => s + t.valueUSD, 0))}
                    <span className="text-xs text-slate-500 font-normal ml-2">{scan.wallet.length} tokens</span>
                  </p>
                </div>
              </div>

              <div className="glass-card rounded-xl overflow-hidden">
                <table className="w-full data-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Balance</th>
                      <th className="text-right">Value</th>
                      <th className="text-right">Allocation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scan.wallet
                      .sort((a, b) => b.valueUSD - a.valueUSD)
                      .map((token) => {
                        const color = getTokenColor(token.symbol);
                        const walletTotal = scan.wallet.reduce((s, t) => s + t.valueUSD, 0);
                        const allocation = walletTotal > 0 ? (token.valueUSD / walletTotal) * 100 : 0;

                        return (
                          <tr key={token.address}>
                            <td>
                              <div className="flex items-center gap-3">
                                <div
                                  className="token-avatar w-7 h-7"
                                  style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
                                >
                                  {token.symbol.slice(0, 3)}
                                </div>
                                <div>
                                  <span className="text-white font-medium">{token.symbol}</span>
                                  <p className="text-[10px] text-slate-600 font-mono">{token.address.slice(0, 6)}...{token.address.slice(-4)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="tabular-nums text-slate-300">
                              {Number(token.balance).toLocaleString('en-US', { maximumFractionDigits: 4 })}
                            </td>
                            <td className="text-right tabular-nums text-white font-medium">
                              {formatUSD(token.valueUSD)}
                            </td>
                            <td className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(30,41,59,0.6)' }}>
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${Math.min(allocation, 100)}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{allocation.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="section-divider" />

          {/* Protection Rules */}
          <section className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Protection Rules</h2>
                <p className="text-sm text-slate-400 mt-1">Automated safeguards for your positions</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-secondary px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Add Rule
              </button>
            </div>

            {rules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onToggle={handleToggleRule}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-xl p-8 text-center">
                <p className="text-sm text-slate-500 mb-3">No protection rules configured</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-sm font-medium"
                  style={{ color: '#22d3ee' }}
                >
                  Create your first rule
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {/* Initial state (no scan yet and not loading) */}
      {!scan && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(139,92,246,0.1))' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#search-grad)" strokeWidth="1.5">
              <defs>
                <linearGradient id="search-grad" x1="3" y1="3" x2="21" y2="21">
                  <stop stopColor="#22d3ee" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">
            Enter an address above to analyze DeFi positions
          </p>
        </div>
      )}

      <CreateRuleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateRule}
      />
    </div>
  );
}
