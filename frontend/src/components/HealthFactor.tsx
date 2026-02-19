'use client';

interface HealthFactorProps {
  healthFactor: number;
  totalSupplyUSD: number;
  totalBorrowUSD: number;
  liquidationRisk: string;
}

function getHealthColor(hf: number): string {
  if (hf >= 2.0) return '#10B981';
  if (hf >= 1.5) return '#F59E0B';
  if (hf >= 1.2) return '#F97316';
  return '#EF4444';
}

function formatUSD(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function HealthFactor({
  healthFactor,
  totalSupplyUSD,
  totalBorrowUSD,
  liquidationRisk,
}: HealthFactorProps) {
  const color = getHealthColor(healthFactor);
  const safetyPercentage = Math.min(((healthFactor - 1.0) / 2.0) * 100, 100);
  const isWarning = healthFactor < 1.5;
  const ltv = totalSupplyUSD > 0 ? (totalBorrowUSD / totalSupplyUSD) * 100 : 0;

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Health Factor</span>
            {isWarning && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                AT RISK
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-3xl font-bold tabular-nums tracking-tight" style={{ color }}>
              {healthFactor >= 999 ? '---' : healthFactor.toFixed(2)}
            </span>
          </div>
        </div>

        <div
          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide"
          style={{ background: `${color}14`, color, border: `1px solid ${color}25` }}
        >
          {liquidationRisk === 'NONE' ? 'Safe' : liquidationRisk}
        </div>
      </div>

      {/* Safety bar */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] text-slate-500">Liquidation threshold</span>
          <span className="text-[11px] text-slate-400 tabular-nums">{Math.max(safetyPercentage, 0).toFixed(0)}% buffer</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(30,41,59,0.6)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.max(safetyPercentage, 2)}%`,
              background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="surface-inset rounded-lg p-3">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Supplied</p>
          <p className="text-sm font-semibold text-white mt-1 tabular-nums">{formatUSD(totalSupplyUSD)}</p>
        </div>
        <div className="surface-inset rounded-lg p-3">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Borrowed</p>
          <p className="text-sm font-semibold text-white mt-1 tabular-nums">{formatUSD(totalBorrowUSD)}</p>
        </div>
        <div className="surface-inset rounded-lg p-3">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">LTV</p>
          <p className="text-sm font-semibold text-white mt-1 tabular-nums">{ltv.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}
