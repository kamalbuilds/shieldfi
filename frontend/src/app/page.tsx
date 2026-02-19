'use client';

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import RiskGauge from '@/components/RiskGauge';
import HealthFactor from '@/components/HealthFactor';
import PositionCard from '@/components/PositionCard';
import RiskBar from '@/components/RiskBar';
import RuleCard from '@/components/RuleCard';
import CreateRuleModal from '@/components/CreateRuleModal';
import type { PositionScan, Rule, CreateRuleInput } from '@/types';
import * as api from '@/lib/api';

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

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [scan, setScan] = useState<PositionScan | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleScan = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError('');
    try {
      const [positions, userRules] = await Promise.all([
        api.scanPositions(address),
        api.getUserRules(address),
      ]);
      setScan(positions);
      setRules(userRules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan positions');
    } finally {
      setLoading(false);
    }
  }, [address]);

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

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
            <path
              d="M12 2L3 7V12C3 17.55 6.84 22.74 12 24C17.16 22.74 21 17.55 21 12V7L12 2Z"
              fill="currentColor"
              fillOpacity="0.2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to ShieldFi</h1>
          <p className="text-slate-400 max-w-md">
            Connect your wallet to monitor your DeFi positions and protect against liquidations, impermanent loss, and portfolio drops.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Monitor and protect your DeFi positions
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={loading}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M12 2L3 7V12C3 17.55 6.84 22.74 12 24C17.16 22.74 21 17.55 21 12V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Scan My Positions
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {!scan && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-slate-500">
              <path d="M21 21L16.5 16.5M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">
            Click &quot;Scan My Positions&quot; to analyze your DeFi portfolio
          </p>
        </div>
      )}

      {loading && (
        <div className="space-y-6">
          <div className="flex justify-center py-10">
            <div className="w-[220px] h-[220px] rounded-full animate-shimmer" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-48 rounded-xl animate-shimmer" />
            <div className="h-48 rounded-xl animate-shimmer" />
          </div>
        </div>
      )}

      {scan && !loading && (
        <>
          {/* Section 1: Unified Risk Score */}
          <section className="bg-slate-900/30 border border-slate-800 rounded-2xl p-8">
            <RiskGauge
              score={scan.riskScore.total}
              level={scan.riskScore.level}
              summary={
                scan.riskScore.recommendations.length > 0
                  ? scan.riskScore.recommendations[0]
                  : undefined
              }
            />
          </section>

          {/* Section 2: DeFi Positions Overview */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Venus Protocol */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Venus Protocol
              </h2>

              <HealthFactor
                healthFactor={scan.venus.healthFactor}
                totalSupplyUSD={scan.venus.totalSupplyUSD}
                totalBorrowUSD={scan.venus.totalBorrowUSD}
                liquidationRisk={scan.venus.liquidationRisk}
              />

              {scan.venus.supplies.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">
                    Supply Positions
                  </h3>
                  <div className="space-y-2">
                    {scan.venus.supplies.map((s) => (
                      <PositionCard key={s.vTokenAddress} type="supply" position={s} />
                    ))}
                  </div>
                </div>
              )}

              {scan.venus.borrows.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">
                    Borrow Positions
                  </h3>
                  <div className="space-y-2">
                    {scan.venus.borrows.map((b) => (
                      <PositionCard key={b.vTokenAddress} type="borrow" position={b} />
                    ))}
                  </div>
                </div>
              )}

              {scan.venus.supplies.length === 0 && scan.venus.borrows.length === 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                  <p className="text-slate-500 text-sm">No Venus Protocol positions found</p>
                </div>
              )}
            </div>

            {/* PancakeSwap LP */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                PancakeSwap LP Positions
              </h2>

              {scan.pancakeswap.length > 0 ? (
                <div className="space-y-3">
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
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                  <p className="text-slate-500 text-sm">No PancakeSwap LP positions found</p>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Risk Breakdown */}
          <section className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-5">Risk Breakdown</h2>
            <div className="space-y-4">
              <RiskBar
                label="Liquidation Proximity"
                value={scan.riskScore.breakdown.liquidationProximity}
                maxValue={30}
                explanation={RISK_EXPLANATIONS.liquidationProximity}
              />
              <RiskBar
                label="Impermanent Loss"
                value={scan.riskScore.breakdown.impermanentLoss}
                maxValue={25}
                explanation={RISK_EXPLANATIONS.impermanentLoss}
              />
              <RiskBar
                label="Concentration Risk"
                value={scan.riskScore.breakdown.concentrationRisk}
                maxValue={20}
                explanation={RISK_EXPLANATIONS.concentrationRisk}
              />
              <RiskBar
                label="Volatility Exposure"
                value={scan.riskScore.breakdown.volatilityExposure}
                maxValue={15}
                explanation={RISK_EXPLANATIONS.volatilityExposure}
              />
              <RiskBar
                label="Liquidity Risk"
                value={scan.riskScore.breakdown.liquidityRisk}
                maxValue={10}
                explanation={RISK_EXPLANATIONS.liquidityRisk}
              />
            </div>
          </section>

          {/* Section 4: Active Protection Rules */}
          <section className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Active Protection Rules</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                + Add New Rule
              </button>
            </div>

            {rules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rules.map((rule) => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onToggle={handleToggleRule}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm mb-3">
                  No protection rules configured yet
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Create your first rule
                </button>
              </div>
            )}
          </section>
        </>
      )}

      <CreateRuleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateRule}
      />
    </div>
  );
}
