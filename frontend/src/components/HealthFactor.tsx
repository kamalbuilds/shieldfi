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

export default function HealthFactor({
  healthFactor,
  totalSupplyUSD,
  totalBorrowUSD,
  liquidationRisk,
}: HealthFactorProps) {
  const color = getHealthColor(healthFactor);
  const safetyPercentage = Math.min(((healthFactor - 1.0) / 2.0) * 100, 100);
  const isWarning = healthFactor < 1.5;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Health Factor</h3>
        <span
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{
            backgroundColor: `${color}20`,
            color,
          }}
        >
          {liquidationRisk}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span
          className="text-4xl font-bold tabular-nums"
          style={{ color }}
        >
          {healthFactor.toFixed(2)}
        </span>
        <span className="text-slate-500 text-sm">/ safe above 1.0</span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
          <span>Liquidation (1.0)</span>
          <span>Safe ({healthFactor.toFixed(2)})</span>
        </div>
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.max(safetyPercentage, 2)}%`,
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}60`,
            }}
          />
        </div>
      </div>

      {isWarning && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm font-medium">
            Warning: Health factor is below 1.5. Consider repaying debt or adding collateral.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-slate-400">Total Supply</p>
          <p className="text-white font-semibold">${totalSupplyUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-slate-400">Total Borrow</p>
          <p className="text-white font-semibold">${totalBorrowUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>
    </div>
  );
}
