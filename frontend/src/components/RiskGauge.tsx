'use client';

import { useEffect, useState } from 'react';

interface RiskGaugeProps {
  score: number;
  level: 'SAFE' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';
  summary?: string;
}

function getColor(score: number): string {
  if (score <= 30) return '#10B981';
  if (score <= 60) return '#F59E0B';
  if (score <= 80) return '#F97316';
  return '#EF4444';
}

function getLevelLabel(level: string): string {
  switch (level) {
    case 'SAFE': return 'SAFE';
    case 'MODERATE': return 'MODERATE';
    case 'ELEVATED': return 'ELEVATED';
    case 'CRITICAL': return 'CRITICAL';
    default: return 'UNKNOWN';
  }
}

export default function RiskGauge({ score, level, summary }: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const color = getColor(score);
  const isCritical = level === 'CRITICAL';

  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * score);
      setAnimatedScore(start);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [score]);

  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`relative ${isCritical ? 'animate-pulse' : ''}`}>
        <svg width="220" height="220" viewBox="0 0 220 220" className="transform -rotate-90">
          <circle
            cx="110"
            cy="110"
            r="90"
            fill="none"
            stroke="#1e293b"
            strokeWidth="14"
          />
          <circle
            cx="110"
            cy="110"
            r="90"
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
            style={{
              filter: `drop-shadow(0 0 8px ${color}80)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-5xl font-bold tabular-nums"
            style={{ color }}
          >
            {animatedScore}
          </span>
          <span className="text-sm text-slate-400 mt-1">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <span
          className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold tracking-wider"
          style={{
            backgroundColor: `${color}20`,
            color,
            border: `1px solid ${color}40`,
          }}
        >
          {getLevelLabel(level)}
        </span>
        {summary && (
          <p className="text-slate-400 text-sm mt-3 max-w-md">{summary}</p>
        )}
      </div>
    </div>
  );
}
