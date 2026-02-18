'use client';

import type { VenusMarket, LPPosition } from '@/types';

interface VenusPositionCardProps {
  type: 'supply' | 'borrow';
  position: VenusMarket;
}

interface LPPositionCardProps {
  type: 'lp';
  position: LPPosition;
  onWithdraw?: (positionId: number) => void;
}

type PositionCardProps = VenusPositionCardProps | LPPositionCardProps;

function getILColor(il: number): string {
  if (il < 1) return '#10B981';
  if (il < 3) return '#F59E0B';
  if (il < 5) return '#F97316';
  return '#EF4444';
}

function getRiskDot(type: string, value: number): string {
  if (type === 'lp') {
    return getILColor(value);
  }
  return '#10B981';
}

export default function PositionCard(props: PositionCardProps) {
  if (props.type === 'lp') {
    const { position, onWithdraw } = props;
    const ilColor = getILColor(position.impermanentLoss);

    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-emerald-500/30 transition-all group">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getRiskDot('lp', position.impermanentLoss) }}
            />
            <div>
              <p className="text-white font-semibold">
                {position.token0Symbol}/{position.token1Symbol}
              </p>
              <p className="text-slate-400 text-xs">Fee: {position.fee / 10000}%</p>
            </div>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              position.inRange
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {position.inRange ? 'In Range' : 'Out of Range'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs">Value</p>
            <p className="text-white font-medium">${position.valueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Fees Earned</p>
            <p className="text-emerald-400 font-medium">${position.feesEarned.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">IL</p>
            <p className="font-medium" style={{ color: ilColor }}>
              {position.impermanentLoss.toFixed(2)}%
            </p>
          </div>
        </div>

        {onWithdraw && (
          <button
            onClick={() => onWithdraw(position.positionId)}
            className="mt-3 w-full py-2 text-sm font-medium rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          >
            Withdraw
          </button>
        )}
      </div>
    );
  }

  const { type, position } = props;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-emerald-500/30 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: '#10B981' }}
          />
          <span className="text-white font-semibold">{position.symbol}</span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            type === 'supply'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}
        >
          {type === 'supply' ? 'Supply' : 'Borrow'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
        <div>
          <p className="text-slate-400 text-xs">Amount</p>
          <p className="text-white font-medium">{Number(position.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">Value</p>
          <p className="text-white font-medium">${position.valueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-slate-400 text-xs">APY</p>
          <p className={`font-medium ${type === 'supply' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {position.apy.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}
