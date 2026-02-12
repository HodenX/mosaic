interface PositionGaugeProps {
  ratio: number;
  min: number;
  max: number;
}

export default function PositionGauge({ ratio, min, max }: PositionGaugeProps) {
  const clampedRatio = Math.min(ratio, 100);

  const barColor =
    ratio < min
      ? "bg-yellow-500"
      : ratio > max
        ? "bg-red-500"
        : "bg-green-500";

  return (
    <div className="w-full">
      <div className="relative h-4 rounded-full bg-muted overflow-hidden">
        {/* filled bar */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor}`}
          style={{ width: `${clampedRatio}%` }}
        />
        {/* target range markers */}
        {min > 0 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-foreground/40"
            style={{ left: `${min}%` }}
          />
        )}
        {max < 100 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-foreground/40"
            style={{ left: `${max}%` }}
          />
        )}
      </div>
      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>0%</span>
        {min > 0 && <span style={{ marginLeft: `${min - 5}%` }}>下限 {min}%</span>}
        {max < 100 && <span style={{ marginLeft: "auto" }}>上限 {max}%</span>}
        <span>100%</span>
      </div>
    </div>
  );
}
