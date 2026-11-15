import React from 'react';

interface ChartPoint {
  label: string;
  score: number;
}

export const ScoreTrendChart: React.FC<{ data: ChartPoint[]; height?: number }> = ({
  data,
  height = 190,
}) => {
  const width = 520;
  const padL = 36;
  const padR = 20;
  const padT = 18;
  const padB = 30;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const points = data.map((d, idx) => {
    const x = data.length <= 1 ? padL + innerW / 2 : padL + (idx / (data.length - 1)) * innerW;
    const y = padT + innerH - (Math.max(0, Math.min(100, d.score)) / 100) * innerH;
    return { ...d, x, y };
  });

  const linePath = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
      : '';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto overflow-visible"
      role="img"
      aria-label="Grafik perkembangan nilai per bab"
    >
      <defs>
        <linearGradient id="mvxTrendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {[0, 25, 50, 75, 100].map((tick) => {
        const y = padT + innerH - (tick / 100) * innerH;
        return (
          <g key={tick}>
            <line
              x1={padL}
              y1={y}
              x2={width - padR}
              y2={y}
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeDasharray={tick === 75 ? '4 4' : undefined}
              strokeWidth={tick === 75 ? 1.5 : 1}
            />
            <text
              x={padL - 8}
              y={y + 3}
              textAnchor="end"
              className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
            >
              {tick}
            </text>
          </g>
        );
      })}

      {areaPath && <path d={areaPath} fill="url(#mvxTrendGrad)" />}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke="#2563EB"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {points.map((p) => (
        <g key={p.label}>
          <circle
            cx={p.x}
            cy={p.y}
            r={5}
            className="fill-white dark:fill-slate-900 stroke-blue-600"
            strokeWidth={2.5}
          />
          <text
            x={p.x}
            y={p.y - 10}
            textAnchor="middle"
            className="fill-slate-900 dark:fill-slate-100 text-[11px] font-semibold font-mono"
          >
            {p.score}
          </text>
          <text
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400 text-[11px] font-medium"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

export const HorizontalBarBreakdown: React.FC<{
  items: { label: string; value: number; max?: number; color?: string }[];
}> = ({ items }) => {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const max = item.max ?? 100;
        const pct = Math.max(0, Math.min(100, Math.round((item.value / max) * 100)));
        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-3">
                {item.label}
              </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                {item.value}/{max}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  item.color || 'bg-blue-600'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
