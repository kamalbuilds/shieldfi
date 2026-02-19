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

function formatUSD(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getTokenColor(symbol: string): string {
  const colors: Record<string, string> = {
    BNB: '#f0b90b',
    WBNB: '#f0b90b',
    BTCB: '#f7931a',
    BTC: '#f7931a',
    ETH: '#627eea',
    WETH: '#627eea',
    USDT: '#26a17b',
    USDC: '#2775ca',
    BUSD: '#f0b90b',
    DAI: '#f5ac37',
    CAKE: '#d1884f',
    XRP: '#23292f',
    ADA: '#0d1e30',
    DOT: '#e6007a',
    LINK: '#2a5ada',
    UNI: '#ff007a',
    XVS: '#1db9a6',
  };
  const key = symbol.replace('v', '').toUpperCase();
  return colors[key] || '#64748b';
}

function TokenAvatar({ symbol, size = 'md' }: { symbol: string; size?: 'sm' | 'md' }) {
  const color = getTokenColor(symbol);
  const cleanSymbol = symbol.replace(/^v/, '');
  const dims = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';

  return (
    <div
      className={`token-avatar ${dims}`}
      style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
    >
      {cleanSymbol.slice(0, 3)}
    </div>
  );
}

function getILColor(il: number): string {
  if (il < 1) return '#10B981';
  if (il < 3) return '#F59E0B';
  if (il < 5) return '#F97316';
  return '#EF4444';
}

export default function PositionCard(props: PositionCardProps) {
  if (props.type === 'lp') {
    const { position, onWithdraw } = props;
    const ilColor = getILColor(position.impermanentLoss);

    return (
      <div className="glass-card rounded-xl p-4 transition-all duration-200 hover:scale-[1.01]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <TokenAvatar symbol={position.token0Symbol} size="sm" />
              <TokenAvatar symbol={position.token1Symbol} size="sm" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {position.token0Symbol}/{position.token1Symbol}
              </p>
              <p className="text-[11px] text-slate-500">{(position.fee / 10000).toFixed(2)}% fee tier</p>
            </div>
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider"
            style={
              position.inRange
                ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }
                : { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }
            }
          >
            {position.inRange ? 'In Range' : 'Out of Range'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="surface-inset rounded-lg p-2.5">
            <p className="text-[10px] text-slate-500 font-medium uppercase">Value</p>
            <p className="text-sm font-semibold text-white mt-0.5 tabular-nums">{formatUSD(position.valueUSD)}</p>
          </div>
          <div className="surface-inset rounded-lg p-2.5">
            <p className="text-[10px] text-slate-500 font-medium uppercase">Fees</p>
            <p className="text-sm font-semibold text-emerald-400 mt-0.5 tabular-nums">{formatUSD(position.feesEarned)}</p>
          </div>
          <div className="surface-inset rounded-lg p-2.5">
            <p className="text-[10px] text-slate-500 font-medium uppercase">IL</p>
            <p className="text-sm font-semibold mt-0.5 tabular-nums" style={{ color: ilColor }}>
              {position.impermanentLoss.toFixed(2)}%
            </p>
          </div>
        </div>

        {onWithdraw && (
          <button
            onClick={() => onWithdraw(position.positionId)}
            className="btn-secondary mt-3 w-full py-2 text-xs rounded-lg"
          >
            Withdraw Position
          </button>
        )}
      </div>
    );
  }

  const { type, position } = props;

  return (
    <div className="glass-card rounded-xl p-4 transition-all duration-200 hover:scale-[1.01]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TokenAvatar symbol={position.symbol} />
          <div>
            <span className="text-sm font-semibold text-white">{position.symbol}</span>
            <p className="text-[11px] text-slate-500 tabular-nums">
              {Number(position.balance).toLocaleString('en-US', { maximumFractionDigits: 4 })} tokens
            </p>
          </div>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider"
          style={
            type === 'supply'
              ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }
              : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }
          }
        >
          {type === 'supply' ? 'Supplying' : 'Borrowing'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="surface-inset rounded-lg p-2.5">
          <p className="text-[10px] text-slate-500 font-medium uppercase">Value</p>
          <p className="text-sm font-semibold text-white mt-0.5 tabular-nums">{formatUSD(position.valueUSD)}</p>
        </div>
        <div className="surface-inset rounded-lg p-2.5">
          <p className="text-[10px] text-slate-500 font-medium uppercase">APY</p>
          <p className={`text-sm font-semibold mt-0.5 tabular-nums ${type === 'supply' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {position.apy.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
}
