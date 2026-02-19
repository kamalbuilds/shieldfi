'use client';

import { useState, useId } from 'react';

interface RiskBarProps {
  label: string;
  value: number;
  maxValue: number;
  explanation?: string;
}

function getBarColors(percentage: number): [string, string] {
  if (percentage <= 30) return ['#10b981', '#22d3ee'];
  if (percentage <= 60) return ['#f59e0b', '#eab308'];
  if (percentage <= 80) return ['#f97316', '#ef4444'];
  return ['#ef4444', '#dc2626'];
}

export default function RiskBar({ label, value, maxValue, explanation }: RiskBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const gradientId = useId();
  const percentage = Math.min((value / maxValue) * 100, 100);
  const [color1, color2] = getBarColors(percentage);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300 font-medium">{label}</span>
          {explanation && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-slate-600 group-hover:text-slate-400 transition-colors cursor-help">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <span className="text-sm font-semibold tabular-nums" style={{ color: color1 }}>
          {value}<span className="text-slate-600 font-normal">/{maxValue}</span>
        </span>
      </div>

      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(30,41,59,0.6)' }}>
        <svg width="100%" height="8" className="rounded-full overflow-hidden">
          <defs>
            <linearGradient id={`bar-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color1} />
              <stop offset="100%" stopColor={color2} />
            </linearGradient>
          </defs>
          <rect
            width={`${percentage}%`}
            height="8"
            rx="4"
            fill={`url(#bar-${gradientId})`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
      </div>

      {showTooltip && explanation && (
        <div className="absolute z-20 bottom-full mb-3 left-1/2 -translate-x-1/2 glass-card rounded-lg p-3 shadow-2xl w-72 animate-fade-in" style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.12)' }}>
          <p className="text-xs text-slate-300 leading-relaxed">{explanation}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 -mt-1" style={{ background: 'rgba(15,23,42,0.95)', borderRight: '1px solid rgba(148,163,184,0.12)', borderBottom: '1px solid rgba(148,163,184,0.12)' }} />
        </div>
      )}
    </div>
  );
}
