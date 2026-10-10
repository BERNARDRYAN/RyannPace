import type { CSSProperties, ReactNode } from 'react';
import type { AspectRatio } from '@/types/poster';
import type { PosterData } from '@/components/canvas/PosterRenderer';
import { POSTER_DIMENSIONS } from '@/lib/poster-presets';
import { MONO, SANS, buildMetricCells, serialFor, withAlpha } from '@/lib/poster-helpers';
import { formatDateLong } from '@/lib/i18n';
import { formatPace, formatPosterTime } from '@/lib/format';
import { displayDistance, distanceLabel, paceParts } from '@/lib/units';
import { splitsFor } from '@/lib/splits';
import { RouteSvg } from '@/components/canvas/RouteSvg';
import { ElevationProfile } from '@/components/canvas/ElevationProfile';
import { SplitsChart } from '@/components/canvas/SplitsChart';
import { Barcode } from '@/components/canvas/Barcode';
import { QrStamp, posterQrUrl } from '@/components/canvas/QrStamp';
import { useLocaleStore, useT } from '@/store/useLocaleStore';

interface Tokens {
  pad: number;
  gap: number;
  radius: number;
  title: number;
  label: number;
  hero: number;
  value: number;
  tilePad: number;
  stamp: number;
  /** Row template for the tile grid: hero, two stat rows, visuals. */
  rows: string;
}

const TOKENS: Record<AspectRatio, Tokens> = {
  '9:16': { pad: 64, gap: 18, radius: 28, title: 58, label: 17, hero: 230, value: 76, tilePad: 30, stamp: 108, rows: 'auto auto auto 1fr' },
  '4:5': { pad: 54, gap: 14, radius: 24, title: 46, label: 15, hero: 170, value: 58, tilePad: 24, stamp: 96, rows: 'auto auto auto 1fr' },
  '1:1': { pad: 46, gap: 12, radius: 20, title: 40, label: 13, hero: 132, value: 46, tilePad: 20, stamp: 88, rows: 'auto auto auto 1fr' },
};

/**
 * Data-first stats card: clean tiles of big numbers, a small route and the
 * splits (or elevation). Easy to read at a glance in a feed.
 */
export function StatsTemplate({ metrics, config, rawPoints, routePoints }: PosterData) {
  const tx = useT();
  const locale = useLocaleStore((s) => s.locale);
  const { palette, aspectRatio, units } = config;
  const t = TOKENS[aspectRatio];
  const { width, height } = POSTER_DIMENSIONS[aspectRatio];
  const ink = palette.primaryText;
  const muted = palette.secondaryText;
  const tileBg = palette.cardBackground ?? palette.background;

  const cells = buildMetricCells(metrics, config.showHeartRate, units);
  const byKey = (k: string) => cells.find((c) => c.key === k);
  const pace = paceParts(metrics, units);
  const unit = distanceLabel(units);
  const fourth = byKey('heartRate') ?? byKey('energy');
  const splits = splitsFor(metrics, units);
  const showSplits = config.chart === 'splits' && splits.length >= 2;
  const hasChart = config.showElevationProfile && (showSplits || rawPoints.some((p) => typeof p.ele === 'number'));
  const serial = serialFor(metrics);
  const timeLabel = formatPosterTime(metrics.date);

  const label: CSSProperties = {
    fontFamily: MONO,
    fontSize: t.label,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: muted,
    lineHeight: 1.2,
  };

  const tile = (children: ReactNode, style?: CSSProperties) => (
    <div
      style={{
        background: tileBg,
        borderRadius: t.radius,
        padding: t.tilePad,
        boxShadow: `0 1px 0 ${withAlpha(ink, 0.06)}, 0 12px 30px -18px ${withAlpha('#000000', 0.35)}`,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      {children}
    </div>
  );

  const stat = (labelText: string, value: string, unitText?: string, size = t.value) =>
    tile(
      <>
        <div style={label}>{tx(labelText)}</div>
        <div
          style={{
            marginTop: t.gap,
            fontWeight: 800,
            fontSize: size,
            letterSpacing: '-0.04em',
            lineHeight: 0.95,
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
          {unitText && (
            <span style={{ fontSize: size * 0.34, fontWeight: 600, color: muted, marginLeft: 6, letterSpacing: 0 }}>{unitText}</span>
          )}
        </div>
      </>
    );

  return (
    <div style={{ position: 'relative', width, height, background: palette.background, overflow: 'hidden', fontFamily: SANS, color: ink }}>
      {config.customOverlayImage && (
        // eslint-disable-next-line @next/next/no-img-element -- must be a plain <img> so html-to-image can inline it
        <img
          src={config.customOverlayImage}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: config.overlayOpacity }}
        />
      )}

      <div style={{ position: 'relative', height: '100%', padding: t.pad, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: t.gap * 1.4 }}>
        {/* Header */}
        <header style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
          <div style={{ minWidth: 0 }}>
            <div style={label}>
              {formatDateLong(metrics.date, locale)}
              {timeLabel && <> · {timeLabel}</>}
            </div>
            <h1
              style={{
                margin: `${t.gap * 0.5}px 0 0`,
                fontWeight: 800,
                fontSize: t.title,
                lineHeight: 1.02,
                letterSpacing: '-0.03em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {metrics.activityTitle || tx('Untitled Run')}
            </h1>
            {metrics.locationName && <div style={{ ...label, marginTop: t.gap * 0.5, letterSpacing: '0.12em' }}>{metrics.locationName}</div>}
          </div>
          <span
            style={{
              flexShrink: 0,
              width: t.label * 1.6,
              height: t.label * 1.6,
              borderRadius: 999,
              background: palette.accent,
              boxShadow: `0 0 0 ${t.label * 0.5}px ${withAlpha(palette.accent, 0.2)}`,
              marginBottom: t.label * 0.4,
            }}
          />
        </header>

        {/* Tiles */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: t.rows,
            gap: t.gap,
          }}
        >
          {tile(
            <>
              <div style={label}>{tx('Distance')}</div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: t.hero,
                  lineHeight: 0.85,
                  letterSpacing: '-0.055em',
                  color: palette.accent,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  marginTop: t.gap,
                }}
              >
                {displayDistance(metrics.distanceKm, units).toFixed(2)}
                <span style={{ fontSize: t.hero * 0.28, color: muted, fontWeight: 700, marginLeft: 12, letterSpacing: 0 }}>{unit}</span>
              </div>
            </>,
            { gridColumn: '1 / -1' }
          )}
          {stat('Pace', formatPace(pace.minutes, pace.seconds), `/${unit}`)}
          {stat('Time', byKey('time')!.value)}
          {stat('Elev. Gain', byKey('elevation')!.value, byKey('elevation')!.unit)}
          {fourth ? stat(fourth.label, fourth.value, fourth.unit) : stat('Splits', String(splits.length || '—'))}

          {/* Visuals: route + chart */}
          {tile(
            <>
              <div style={label}>{tx('Route')}</div>
              <div style={{ position: 'relative', flex: 1, minHeight: 0, marginTop: t.gap }}>
                {config.showRoute && routePoints.length > 0 && (
                  <RouteSvg
                    points={routePoints}
                    routeColor={palette.routeColor}
                    accent={palette.accent}
                    strokeWidth={11}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                  />
                )}
              </div>
            </>,
            { gridColumn: hasChart ? 'auto' : '1 / -1' }
          )}
          {hasChart &&
            tile(
              <>
                <div style={label}>{tx(showSplits ? 'Splits' : 'Elevation')}</div>
                <div style={{ position: 'relative', flex: 1, minHeight: 0, marginTop: t.gap, lineHeight: 0 }}>
                  <div style={{ position: 'absolute', inset: 0 }}>
                    {showSplits ? (
                      <SplitsChart splits={splits} color={withAlpha(ink, 0.35)} highlight={palette.accent} width={600} height={300} fluid />
                    ) : (
                      <ElevationProfile points={rawPoints} color={palette.accent} width={600} height={300} strokeWidth={3} fluid />
                    )}
                  </div>
                </div>
              </>
            )}
        </div>

        {/* Footer */}
        <footer style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
          <div>
            {config.showWatermark && config.watermarkText.trim() && (
              <div style={{ fontWeight: 800, fontSize: t.title * 0.6, letterSpacing: '-0.02em' }}>{config.watermarkText}</div>
            )}
            <div style={{ ...label, marginTop: 6 }}>
              {serial}
              {metrics.gearBrand && <> · {metrics.gearBrand}</>}
            </div>
          </div>
          {config.stamp === 'barcode' ? (
            <Barcode seed={`${serial}|${metrics.activityTitle}`} color={ink} width={t.stamp * 2.2} height={t.stamp * 0.6} />
          ) : (
            <QrStamp
              value={posterQrUrl()}
              size={t.stamp}
              foreground={config.contrastMode === 'dark' ? palette.background : ink}
              background={config.contrastMode === 'dark' ? ink : tileBg}
              radius={6}
            />
          )}
        </footer>
      </div>
    </div>
  );
}
