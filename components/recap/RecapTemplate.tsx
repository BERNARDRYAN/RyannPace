import { useMemo, type CSSProperties } from 'react';
import type { AspectRatio } from '@/types/poster';
import type { RecapRun } from '@/lib/recap';
import type { RecapConfig } from '@/store/useRecapStore';
import { POSTER_DIMENSIONS, buildRoute } from '@/lib/poster-presets';
import { MONO, SANS, SERIF } from '@/lib/poster-helpers';
import { bestGrid, formatHoursMinutes, periodLabel, summarizeRuns } from '@/lib/recap';
import { trimRouteEnds } from '@/lib/privacy';
import { formatPace } from '@/lib/format';
import { KM_PER_MILE, displayDistance, displayElevation, distanceLabel, elevationLabel } from '@/lib/units';
import { RouteSvg } from '@/components/canvas/RouteSvg';
import { QrStamp, posterQrUrl } from '@/components/canvas/QrStamp';
import { useLocaleStore, useT } from '@/store/useLocaleStore';
import { formatDateLong } from '@/lib/i18n';

interface Tokens {
  pad: number;
  label: number;
  title: number;
  total: number;
  stat: number;
  gap: number;
  qr: number;
  /** Height of the route grid as a share of content width, from this ratio's fixed sections. */
  gridAspect: number;
}

const TOKENS: Record<AspectRatio, Tokens> = {
  '9:16': { pad: 72, label: 17, title: 104, total: 230, stat: 52, gap: 34, qr: 104, gridAspect: 1.02 },
  '4:5': { pad: 60, label: 15, title: 78, total: 168, stat: 44, gap: 24, qr: 88, gridAspect: 0.62 },
  '1:1': { pad: 56, label: 14, title: 64, total: 132, stat: 38, gap: 20, qr: 76, gridAspect: 0.46 },
};

interface RecapTemplateProps {
  runs: RecapRun[];
  config: RecapConfig;
}

/**
 * Multi-run recap: period title, total distance, aggregate stats and a grid
 * of every route (small multiples), longest run in the accent color.
 */
export function RecapTemplate({ runs, config }: RecapTemplateProps) {
  const tx = useT();
  const locale = useLocaleStore((s) => s.locale);
  // Typed titles win; otherwise the period follows the runs and the language.
  const displayTitle = config.titleEdited ? config.title : periodLabel(runs, locale);
  const { palette, aspectRatio, units } = config;
  const t = TOKENS[aspectRatio];
  const { width, height } = POSTER_DIMENSIONS[aspectRatio];
  const contentWidth = width - t.pad * 2;
  const totals = summarizeRuns(runs);
  const unit = distanceLabel(units);
  const paceSeconds = Math.round(totals.paceSecondsPerKm * (units === 'mi' ? KM_PER_MILE : 1));

  const routes = useMemo(
    () =>
      runs.map((run) => ({
        id: run.id,
        points: buildRoute(config.privacyZone ? trimRouteEnds(run.points) : run.points).routePoints,
      })),
    [runs, config.privacyZone]
  );

  const label: CSSProperties = {
    fontFamily: MONO,
    fontSize: t.label,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: palette.secondaryText,
    lineHeight: 1.2,
  };

  const stats = [
    { label: tx('Runs'), value: String(totals.runs) },
    { label: tx('Time'), value: formatHoursMinutes(totals.movingSeconds) },
    {
      label: tx('Climb'),
      value: Math.round(displayElevation(totals.elevationGainMeters, units)).toLocaleString('en-US'),
      unit: elevationLabel(units),
    },
    {
      label: tx('Avg pace'),
      value: formatPace(Math.floor(paceSeconds / 60), paceSeconds % 60),
      unit: `/${unit}`,
    },
  ];

  const qrDark = config.contrastMode === 'dark';

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        background: palette.background,
        color: palette.primaryText,
        overflow: 'hidden',
        fontFamily: SANS,
      }}
    >
      <div
        style={{
          height: '100%',
          padding: t.pad,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header style={{ flexShrink: 0 }}>
          <div style={{ ...label, display: 'flex', justifyContent: 'space-between', color: palette.primaryText }}>
            <span style={{ fontWeight: 600 }}>{tx('RyannPace Recap')}</span>
            <span>
              {tx(totals.runs === 1 ? '{n} run' : '{n} runs', { n: totals.runs })}
            </span>
          </div>
          <div style={{ height: 3, background: palette.primaryText, marginTop: t.label }} />
          <h1
            style={{
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: t.title,
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              margin: `${t.gap * 0.8}px 0 0`,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              paddingBottom: t.title * 0.06,
            }}
          >
            {displayTitle}
          </h1>
        </header>

        <section style={{ flexShrink: 0, marginTop: t.gap * 0.6 }}>
          <div style={label}>{tx('Total distance')}</div>
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: t.total,
              lineHeight: 0.88,
              letterSpacing: '-0.055em',
              fontVariantNumeric: 'tabular-nums',
              marginLeft: -t.total * 0.04,
              whiteSpace: 'nowrap',
            }}
          >
            {displayDistance(totals.distanceKm, units).toFixed(totals.distanceKm >= 100 ? 0 : 1)}
            <span style={{ fontSize: t.total * 0.3, color: palette.accent, marginLeft: t.total * 0.06, letterSpacing: 0 }}>
              {unit}
            </span>
          </div>
        </section>

        <section
          style={{
            flexShrink: 0,
            marginTop: t.gap,
            borderTop: `2px solid ${palette.primaryText}`,
            display: 'grid',
            // Runs is short; time ("10h 14m") and pace need the room.
            gridTemplateColumns: 'minmax(0, 0.7fr) minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1.25fr)',
          }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              style={{
                padding: `${t.label}px ${t.label * 0.5}px 0 ${i === 0 ? 0 : t.label}px`,
                borderLeft: i === 0 ? 'none' : `1.5px solid ${palette.secondaryText}`,
                minWidth: 0,
              }}
            >
              <div style={label}>{s.label}</div>
              <div
                style={{
                  fontSize: t.stat,
                  fontWeight: 600,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  marginTop: t.label * 0.6,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {s.value}
                {s.unit && (
                  <span style={{ fontSize: t.stat * 0.4, color: palette.secondaryText, marginLeft: 4, fontWeight: 500 }}>
                    {s.unit}
                  </span>
                )}
              </div>
            </div>
          ))}
        </section>

        <RouteGrid
          routes={routes}
          longestId={totals.longest?.id ?? null}
          color={palette.routeColor}
          accent={palette.accent}
          width={contentWidth}
          height={Math.round(contentWidth * t.gridAspect)}
          marginTop={t.gap * 1.2}
          labelStyle={label}
          title={tx('Every route')}
        />

        <footer
          style={{
            flexShrink: 0,
            marginTop: t.gap,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: t.gap,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: t.label }}>
            <QrStamp
              value={posterQrUrl()}
              size={t.qr}
              foreground={qrDark ? palette.background : palette.primaryText}
              background={qrDark ? palette.primaryText : palette.background}
              radius={4}
            />
            {totals.longest && (
              <div style={{ ...label, fontSize: t.label - 2, maxWidth: contentWidth * 0.5 }}>
                <span style={{ color: palette.accent }}>■</span> {tx('Longest')} ·{' '}
                {displayDistance(totals.longest.distanceKm, units).toFixed(1)} {unit}
                <br />
                <span style={{ color: palette.primaryText }}>{totals.longest.name}</span>
                {totals.longest.date && <> · {formatDateLong(totals.longest.date, locale)}</>}
              </div>
            )}
          </div>
          {config.watermarkText.trim() && (
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: t.title * 0.48, lineHeight: 1 }}>
              {config.watermarkText}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

type GridRoute = { id: string; points: ReturnType<typeof buildRoute>['routePoints'] };

const GRID_GAP = 12;

/** Every route as a square cell, sized to the largest grid that fits width × height exactly. */
function RouteGrid({
  routes,
  longestId,
  color,
  accent,
  width,
  height,
  marginTop,
  labelStyle,
  title,
}: {
  routes: GridRoute[];
  longestId: string | null;
  color: string;
  accent: string;
  width: number;
  height: number;
  marginTop: number;
  labelStyle: CSSProperties;
  title: string;
}) {
  const count = Math.max(routes.length, 1);
  // Fit with gaps accounted for: shrink the box by the gaps, then size cells.
  let { cols, rows } = bestGrid(count, width, height);
  let cell = Math.min((width - GRID_GAP * (cols - 1)) / cols, (height - GRID_GAP * (rows - 1)) / rows);
  if (routes.length === 1) {
    cols = 1;
    rows = 1;
    cell = Math.min(width, height);
  }

  return (
    <section style={{ flex: 1, minHeight: 0, marginTop, display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...labelStyle, marginBottom: 14 }}>{title}</div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cell}px)`,
          gridAutoRows: `${cell}px`,
          gap: GRID_GAP,
          justifyContent: 'center',
          alignContent: 'center',
        }}
      >
        {routes.map((r) => {
          const longest = r.id === longestId && routes.length > 1;
          // Stroke is in route viewBox units (1000 wide), so scale it to stay ~2px on screen.
          const stroke = Math.max(8, (1000 / cell) * (longest ? 3 : 2));
          return (
            <div key={r.id} style={{ position: 'relative', width: cell, height: cell }}>
              <RouteSvg
                points={r.points}
                routeColor={longest ? accent : color}
                accent={accent}
                markers="dot"
                strokeWidth={stroke}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
