interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Top of the value range; data is normalized to [0, max]. Defaults to 100. */
  max?: number;
  className?: string;
}

/**
 * A hand-drawn, dependency-free sparkline. Renders the data as an inline SVG
 * polyline normalized into [0, max] across the width, with the baseline at the
 * bottom. Pure and SSR-safe — no browser APIs, no state. It carries no meaning
 * for assistive tech (the surrounding row text holds the numbers), so it is
 * marked aria-hidden. Empty or single-point data renders a flat baseline.
 */
export default function Sparkline({
  data,
  width = 120,
  height = 28,
  max = 100,
  className,
}: SparklineProps) {
  const safeMax = max > 0 ? max : 1;
  const n = data.length;

  // Map a value to a y in [0, height], baseline (value 0) at the bottom.
  const yOf = (value: number): number => {
    const clamped = Math.max(0, Math.min(safeMax, value));
    return height - (clamped / safeMax) * height;
  };

  let points: string;
  if (n === 0) {
    // Nothing to draw — a flat baseline.
    points = `0,${height} ${width},${height}`;
  } else if (n === 1) {
    const y = yOf(data[0] ?? 0);
    points = `0,${y} ${width},${y}`;
  } else {
    const stepX = width / (n - 1);
    points = data.map((v, i) => `${(i * stepX).toFixed(2)},${yOf(v).toFixed(2)}`).join(" ");
  }

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--zone, var(--fg-muted))"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
