'use client';

import { useState } from 'react';

interface RiskBarProps {
  label: string;
  value: number;
  maxValue: number;
  explanation?: string;
}

function getBarColor(percentage: number): string {
  if (percentage <= 30) return '#10B981';
  if (percentage <= 60) return '#F59E0B';
  if (percentage <= 80) return '#F97316';
  return '#EF4444';
}

export default function RiskBar({ label, value, maxValue, explanation }: RiskBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const percentage = (value / maxValue) * 100;
  const color = getBarColor(percentage);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>
          {value}/{maxValue}
        </span>
      </div>
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}50`,
          }}
        />
      </div>

      {showTooltip && explanation && (
        <div className="absolute z-10 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl w-64">
          <p className="text-sm text-slate-300">{explanation}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-r border-b border-slate-700 transform rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}
