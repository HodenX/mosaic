interface PositionGaugeProps {
  ratio: number;
  min: number;
  max: number;
}

export default function PositionGauge({ ratio, min, max }: PositionGaugeProps) {
  const clampedRatio = Math.min(ratio, 100);

  const barGradient =
    ratio < min
      ? "from-yellow-400 to-yellow-500"
      : ratio > max
        ? "from-red-400 to-red-500"
        : "from-emerald-400 to-emerald-500";

  return (
    <div className="w-full">
      <div className="relative h-3 rounded-full bg-muted/60 overflow-hidden">
        {/* filled bar with gradient */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 bg-gradient-to-r ${barGradient}`}
          style={{ width: `${clampedRatio}%` }}
        />
        {/* target range markers */}
        {min > 0 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-foreground/30"
            style={{ left: `${min}%` }}
          />
        )}
        {max < 100 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-foreground/30"
            style={{ left: `${max}%` }}
          />
        )}
      </div>
      <div className="relative mt-1.5 text-[11px] text-muted-foreground h-4">
        <span className="absolute left-0">0%</span>
        {min > 0 && (
          <span className="absolute -translate-x-1/2" style={{ left: `${min}%` }}>
            {min}%
          </span>
        )}
        {max < 100 && (
          <span className="absolute -translate-x-1/2" style={{ left: `${max}%` }}>
            {max}%
          </span>
        )}
        <span className="absolute right-0">100%</span>
      </div>
    </div>
  );
}
