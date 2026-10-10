interface SplitsChartProps {
  /** Seconds per unit for each split. */
  splits: number[];
  color: string;
  /** Fastest split color. */
  highlight: string;
  width: number;
  height: number;
  /** Bar width as a share of each slot; Minimal uses slim bars. */
  barRatio?: number;
  /** Stretch to fill the parent box (width/height then only set the drawing grid). */
  fluid?: boolean;
}

/** One bar per km/mile, taller = faster, the fastest split in the highlight color. */
export function SplitsChart({ splits, color, highlight, width, height, barRatio = 0.62, fluid }: SplitsChartProps) {
  if (splits.length < 2) return null;
  const speeds = splits.map((s) => 1 / s);
  const min = Math.min(...speeds);
  const max = Math.max(...speeds);
  const range = max - min || 1;
  const fastest = speeds.indexOf(max);
  const slot = width / splits.length;
  const barWidth = Math.max(2, slot * barRatio);

  return (
    <svg
      width={fluid ? '100%' : width}
      height={fluid ? '100%' : height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={fluid ? 'none' : undefined}
      aria-label="Splits"
    >
      {speeds.map((v, i) => {
        const h = height * (0.22 + 0.78 * ((v - min) / range));
        return (
          <rect
            key={i}
            x={i * slot + (slot - barWidth) / 2}
            y={height - h}
            width={barWidth}
            height={h}
            rx={Math.min(barWidth / 2, 3)}
            fill={i === fastest ? highlight : color}
            opacity={i === fastest ? 1 : 0.75}
          />
        );
      })}
    </svg>
  );
}
