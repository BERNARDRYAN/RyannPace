import { useId, useMemo } from 'react';
import type { CoordinatePoint } from '@/types/poster';
import { ROUTE_VIEWBOX } from '@/lib/poster-presets';

interface RouteSvgProps {
  points: CoordinatePoint[];
  routeColor: string;
  accent: string;
  /** Stroke width in ROUTE_VIEWBOX units (1000 wide). */
  strokeWidth?: number;
  /** Fades the route from a muted tone at the start to full color at the finish. */
  fadeFrom?: string;
  /** Neon look: soft wide under-strokes in the route color behind a bright core. */
  glow?: boolean;
  /**
   * Start/finish markers. `pin` = ring + glowing pin (editorial), `target` =
   * HUD crosshair (cyberpunk), `dot` = small quiet dots (minimal).
   */
  markers?: 'pin' | 'target' | 'dot';
  className?: string;
  style?: React.CSSProperties;
}

function svgSafeId(raw: string): string {
  return `rp${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

/**
 * The route polyline with a hollow start ring and a glowing finish pin.
 * Glows use radial gradients instead of SVG filters so they rasterize
 * identically in html-to-image across browsers.
 */
export function RouteSvg({
  points,
  routeColor,
  accent,
  strokeWidth = 6,
  fadeFrom,
  glow = false,
  markers = 'pin',
  className,
  style,
}: RouteSvgProps) {
  const id = svgSafeId(useId());

  const { pathData, start, finish, bounds } = useMemo(() => {
    if (points.length === 0) {
      return { pathData: '', start: null, finish: null, bounds: null };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const parts: string[] = [];
    points.forEach((p, i) => {
      parts.push(`${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`);
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    return {
      pathData: parts.join(''),
      start: points[0],
      finish: points[points.length - 1],
      bounds: { minX, maxX, minY, maxY },
    };
  }, [points]);

  const gradientVector = useMemo(() => {
    if (!start || !finish || !bounds) return null;
    // Orient the gradient from start to finish; fall back to a diagonal for loops.
    const dx = finish.x - start.x;
    const dy = finish.y - start.y;
    if (Math.hypot(dx, dy) > 80) {
      return { x1: start.x, y1: start.y, x2: finish.x, y2: finish.y };
    }
    return { x1: bounds.minX, y1: bounds.maxY, x2: bounds.maxX, y2: bounds.minY };
  }, [start, finish, bounds]);

  const strokeRef = fadeFrom && gradientVector ? `url(#${id}-stroke)` : routeColor;

  return (
    <svg
      viewBox={`0 0 ${ROUTE_VIEWBOX.width} ${ROUTE_VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ overflow: 'visible', ...style }}
      aria-label="Route map"
      role="img"
    >
      <defs>
        {fadeFrom && gradientVector && (
          <linearGradient
            id={`${id}-stroke`}
            gradientUnits="userSpaceOnUse"
            x1={gradientVector.x1}
            y1={gradientVector.y1}
            x2={gradientVector.x2}
            y2={gradientVector.y2}
          >
            <stop offset="0%" stopColor={fadeFrom} />
            <stop offset="100%" stopColor={routeColor} />
          </linearGradient>
        )}
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor={accent} stopOpacity={0.55} />
          <stop offset="45%" stopColor={accent} stopOpacity={0.18} />
          <stop offset="100%" stopColor={accent} stopOpacity={0} />
        </radialGradient>
      </defs>

      {glow && pathData && points.length > 1 && (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={pathData} stroke={routeColor} strokeOpacity={0.08} strokeWidth={strokeWidth * 9} />
          <path d={pathData} stroke={routeColor} strokeOpacity={0.16} strokeWidth={strokeWidth * 4.5} />
          <path d={pathData} stroke={routeColor} strokeOpacity={0.35} strokeWidth={strokeWidth * 2.2} />
        </g>
      )}

      {pathData && points.length > 1 && (
        <path
          d={pathData}
          fill="none"
          stroke={strokeRef}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {start && markers === 'pin' && (
        <g>
          <circle cx={start.x} cy={start.y} r={strokeWidth * 2.6} fill={routeColor} opacity={0.12} />
          <circle
            cx={start.x}
            cy={start.y}
            r={strokeWidth * 1.6}
            fill="none"
            stroke={routeColor}
            strokeWidth={strokeWidth * 0.6}
          />
        </g>
      )}

      {finish && points.length > 1 && markers === 'pin' && (
        <g>
          <circle cx={finish.x} cy={finish.y} r={strokeWidth * 9} fill={`url(#${id}-glow)`} />
          <circle cx={finish.x} cy={finish.y} r={strokeWidth * 2.2} fill={accent} />
          <circle cx={finish.x} cy={finish.y} r={strokeWidth * 0.8} fill={routeColor} />
        </g>
      )}

      {start && markers === 'target' && (
        <g fill="none" stroke={routeColor} strokeWidth={strokeWidth * 0.5}>
          <rect
            x={start.x - strokeWidth * 2}
            y={start.y - strokeWidth * 2}
            width={strokeWidth * 4}
            height={strokeWidth * 4}
          />
        </g>
      )}

      {finish && points.length > 1 && markers === 'target' && (
        <g>
          <circle cx={finish.x} cy={finish.y} r={strokeWidth * 10} fill={`url(#${id}-glow)`} />
          <g stroke={accent} strokeWidth={strokeWidth * 0.5} fill="none">
            <circle cx={finish.x} cy={finish.y} r={strokeWidth * 4} />
            <line x1={finish.x - strokeWidth * 7} y1={finish.y} x2={finish.x - strokeWidth * 2.5} y2={finish.y} />
            <line x1={finish.x + strokeWidth * 2.5} y1={finish.y} x2={finish.x + strokeWidth * 7} y2={finish.y} />
            <line x1={finish.x} y1={finish.y - strokeWidth * 7} x2={finish.x} y2={finish.y - strokeWidth * 2.5} />
            <line x1={finish.x} y1={finish.y + strokeWidth * 2.5} x2={finish.x} y2={finish.y + strokeWidth * 7} />
          </g>
          <circle cx={finish.x} cy={finish.y} r={strokeWidth * 1.3} fill={accent} />
        </g>
      )}

      {start && markers === 'dot' && (
        <circle
          cx={start.x}
          cy={start.y}
          r={strokeWidth * 2.2}
          fill="none"
          stroke={routeColor}
          strokeWidth={strokeWidth * 0.8}
        />
      )}

      {finish && points.length > 1 && markers === 'dot' && (
        <circle cx={finish.x} cy={finish.y} r={strokeWidth * 3.2} fill={accent} />
      )}
    </svg>
  );
}
