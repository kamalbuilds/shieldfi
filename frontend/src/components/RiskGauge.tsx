'use client';

import { useEffect, useState, useId } from 'react';

interface RiskGaugeProps {
  score: number;
  level: 'SAFE' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';
  summary?: string;
}

const LEVEL_CONFIG = {
  SAFE: { label: 'Low Risk', colors: ['#10b981', '#22d3ee'], bg: 'rgba(16,185,129,0.08)' },
  MODERATE: { label: 'Moderate', colors: ['#f59e0b', '#eab308'], bg: 'rgba(245,158,11,0.08)' },
  ELEVATED: { label: 'Elevated', colors: ['#f97316', '#ef4444'], bg: 'rgba(249,115,22,0.08)' },
  CRITICAL: { label: 'Critical', colors: ['#ef4444', '#dc2626'], bg: 'rgba(239,68,68,0.08)' },
};

export default function RiskGauge({ score, level, summary }: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const gradientId = useId();
  const config = LEVEL_CONFIG[level];

  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [score]);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 degrees
  const strokeDashoffset = arcLength - (animatedScore / 100) * arcLength;

  return (
    <div className="flex items-center gap-8 flex-wrap justify-center lg:justify-start">
      {/* Gauge */}
      <div className="relative flex-shrink-0">
        <svg width="200" height="200" viewBox="0 0 200 200">
          <defs>
            <linearGradient id={`ring-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={config.colors[0]} />
              <stop offset="100%" stopColor={config.colors[1]} />
            </linearGradient>
            <filter id={`glow-${gradientId}`}>
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="rgba(30,41,59,0.5)"
            strokeWidth="10"
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeLinecap="round"
            transform="rotate(135 100 100)"
          />

          {/* Score ring */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={`url(#ring-${gradientId})`}
            strokeWidth="10"
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(135 100 100)"
            filter={`url(#glow-${gradientId})`}
            className="transition-all duration-300"
          />

          {/* Tick marks around the arc */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = 135 + (tick / 100) * 270;
            const rad = (angle * Math.PI) / 180;
            const innerR = radius - 18;
            const outerR = radius - 14;
            return (
              <line
                key={tick}
                x1={100 + innerR * Math.cos(rad)}
                y1={100 + innerR * Math.sin(rad)}
                x2={100 + outerR * Math.cos(rad)}
                y2={100 + outerR * Math.sin(rad)}
                stroke="rgba(100,116,139,0.3)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-4xl font-bold tabular-nums tracking-tight"
            style={{ color: config.colors[0] }}
          >
            {animatedScore}
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5">out of 100</span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-3 min-w-0">
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Risk Level</span>
          <div className="flex items-center gap-2 mt-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: config.colors[0], boxShadow: `0 0 8px ${config.colors[0]}60` }}
            />
            <span className="text-lg font-semibold text-white">{config.label}</span>
          </div>
        </div>

        {summary && (
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm">{summary}</p>
        )}

        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium w-fit"
          style={{ background: config.bg, color: config.colors[0] }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          {score <= 30 ? 'Your portfolio looks healthy' : score <= 60 ? 'Some risks detected' : score <= 80 ? 'Multiple risk factors present' : 'Immediate action recommended'}
        </div>
      </div>
    </div>
  );
}
