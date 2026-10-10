import type { CSSProperties } from 'react';
import type { AspectRatio } from '@/types/poster';
import type { PosterData } from '@/components/canvas/PosterRenderer';
import { POSTER_DIMENSIONS } from '@/lib/poster-presets';
import { MONO, SANS, buildMetricCells, dayOfYear, serialFor, withAlpha } from '@/lib/poster-helpers';
import { formatDateLong } from '@/lib/i18n';
import { formatPace } from '@/lib/format';
import { distanceLabel, paceParts } from '@/lib/units';
import { splitsFor } from '@/lib/splits';
import { RouteSvg } from '@/components/canvas/RouteSvg';
import { ElevationProfile } from '@/components/canvas/ElevationProfile';
import { SplitsChart } from '@/components/canvas/SplitsChart';
import { Barcode } from '@/components/canvas/Barcode';
import { QrStamp, posterQrUrl } from '@/components/canvas/QrStamp';
import { useLocaleStore, useT } from '@/store/useLocaleStore';

interface Tokens {
  outerX: number;
  outerY: number;
  radius: number;
  pad: number;
  band: number;
  bandText: number;
  label: number;
  number: number;
  title: number;
  gap: number;
  statValue: number;
  chart: number;
  tab: number;
  finisher: number;
  stamp: number;
}

const TOKENS: Record<AspectRatio, Tokens> = {
  '9:16': {
    outerX: 64,
    outerY: 110,
    radius: 30,
    pad: 56,
    band: 128,
    bandText: 26,
    label: 18,
    number: 430,
    title: 60,
    gap: 34,
    statValue: 56,
    chart: 90,
    tab: 150,
    finisher: 64,
    stamp: 112,
  },
  '4:5': {
    outerX: 56,
    outerY: 64,
    radius: 26,
    pad: 46,
    band: 104,
    bandText: 22,
    label: 16,
    number: 300,
    title: 48,
    gap: 22,
    statValue: 44,
    chart: 64,
    tab: 118,
    finisher: 52,
    stamp: 96,
  },
  '1:1': {
    outerX: 48,
    outerY: 48,
    radius: 22,
    pad: 40,
    band: 88,
    bandText: 20,
    label: 14,
    number: 210,
    title: 40,
    gap: 16,
    statValue: 38,
    chart: 50,
    tab: 100,
    finisher: 44,
    stamp: 88,
  },
};

/** A safety pin through the bib: a punched hole plus a brushed-metal pin. */
function SafetyPin({ style, surface, flip }: { style: CSSProperties; surface: string; flip?: boolean }) {
  return (
    <div style={{ position: 'absolute', width: 34, height: 34, ...style }}>
      <div
        style={{
          position: 'absolute',
          inset: 6,
          borderRadius: 999,
          background: surface,
          boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.45)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -18,
          top: 12,
          width: 74,
          height: 10,
          borderRadius: 6,
          background: 'linear-gradient(180deg, #F4F4F4 0%, #B9B9B9 55%, #8E8E8E 100%)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.35)',
          transform: `rotate(${flip ? 35 : -35}deg)`,
        }}
      />
    </div>
  );
}

/** Dashed tear line with half-circle notches cut into both edges of the bib. */
function TearLine({ color, surface, notch }: { color: string; surface: string; notch: number }) {
  return (
    <div style={{ position: 'relative', height: notch, flexShrink: 0 }}>
      <div style={{ position: 'absolute', left: notch * 0.7, right: notch * 0.7, top: '50%', borderTop: `3px dashed ${color}` }} />
      {[{ left: -notch / 2 }, { right: -notch / 2 }].map((pos, i) => (
        <span
          key={i}
          style={{ position: 'absolute', top: 0, width: notch, height: notch, borderRadius: 999, background: surface, ...pos }}
        />
      ))}
    </div>
  );
}

/**
 * Race-bib poster: the run as the number you'd pin to your shirt on race day.
 * Native 1080 px wide like every template.
 */
export function BibTemplate({ metrics, config, rawPoints, routePoints }: PosterData) {
  const tx = useT();
  const locale = useLocaleStore((s) => s.locale);
  const { palette, aspectRatio, units } = config;
  const t = TOKENS[aspectRatio];
  const { width, height } = POSTER_DIMENSIONS[aspectRatio];

  const bib = palette.cardBackground ?? '#F7F5EF';
  const surface = palette.background;
  const ink = palette.primaryText;
  const muted = palette.secondaryText;

  const cells = buildMetricCells(metrics, config.showHeartRate, units);
  const pace = paceParts(metrics, units);
  const unit = distanceLabel(units);
  // Stat tiles: distance, time, pace, then heart rate / energy / climb.
  const tiles = [
    cells.find((c) => c.key === 'distance')!,
    cells.find((c) => c.key === 'time')!,
    { key: 'pace', label: 'Pace', value: formatPace(pace.minutes, pace.seconds), unit: `/${unit}` },
    cells.find((c) => c.key === 'heartRate' || c.key === 'energy') ?? cells.find((c) => c.key === 'elevation')!,
  ];

  const bibNumber = String(dayOfYear(metrics.date)).padStart(3, '0');
  const serial = serialFor(metrics);
  const splits = splitsFor(metrics, units);
  const showSplits = config.chart === 'splits' && splits.length >= 2;
  const hasChart = config.showElevationProfile && (showSplits || rawPoints.some((p) => typeof p.ele === 'number'));
  const eventName = (config.showWatermark && config.watermarkText.trim()) || 'RyannPace';

  const label: CSSProperties = {
    fontFamily: MONO,
    fontSize: t.label,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: muted,
    lineHeight: 1.2,
  };

  const innerWidth = width - t.outerX * 2 - t.pad * 2;
  const routeBoxWidth = Math.round(innerWidth * 0.46);

  return (
    <div style={{ position: 'relative', width, height, background: surface, overflow: 'hidden', fontFamily: SANS }}>
      {config.customOverlayImage && (
        // eslint-disable-next-line @next/next/no-img-element -- must be a plain <img> so html-to-image can inline it
        <img
          src={config.customOverlayImage}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: config.overlayOpacity,
          }}
        />
      )}

      {/* The bib */}
      <div
        style={{
          position: 'absolute',
          left: t.outerX,
          right: t.outerX,
          top: t.outerY,
          bottom: t.outerY,
          background: bib,
          borderRadius: t.radius,
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.55)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: ink,
        }}
      >
        {/* Event band */}
        <div
          style={{
            height: t.band,
            flexShrink: 0,
            background: palette.accent,
            color: bib,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `0 ${t.pad + 30}px`,
            fontFamily: MONO,
            fontSize: t.bandText,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ fontWeight: 700, fontFamily: SANS, fontSize: t.bandText * 1.25, letterSpacing: '0.04em' }}>
            {eventName} · {tx('Run')}
          </span>
          <span style={{ textAlign: 'right', lineHeight: 1.3 }}>{formatDateLong(metrics.date, locale)}</span>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: `${t.gap}px ${t.pad}px 0` }}>
          {/* Bib number */}
          <div style={{ ...label, textAlign: 'center' }}>{tx('Bib No.')}</div>
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: t.number,
              lineHeight: 0.84,
              letterSpacing: '-0.05em',
              textAlign: 'center',
              color: ink,
              fontVariantNumeric: 'tabular-nums',
              marginTop: t.gap * 0.4,
            }}
          >
            {bibNumber}
          </div>
          <div
            style={{
              marginTop: t.gap * 0.7,
              textAlign: 'center',
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: t.title,
              lineHeight: 1,
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {metrics.activityTitle || tx('Untitled Run')}
          </div>
          {metrics.locationName && (
            <div style={{ ...label, textAlign: 'center', marginTop: t.gap * 0.4 }}>{metrics.locationName}</div>
          )}

          <div style={{ margin: `${t.gap}px -${t.pad}px` }}>
            <TearLine color={withAlpha(muted, 0.6)} surface={surface} notch={36} />
          </div>

          {/* Route + stats */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: t.gap }}>
            <div
              style={{
                width: routeBoxWidth,
                flexShrink: 0,
                border: `2px solid ${withAlpha(ink, 0.14)}`,
                borderRadius: 18,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                {config.showRoute && routePoints.length > 0 && (
                  <RouteSvg
                    points={routePoints}
                    routeColor={palette.routeColor}
                    accent={palette.accent === bib ? ink : palette.accent}
                    strokeWidth={9}
                    style={{ position: 'absolute', inset: 18, width: 'calc(100% - 36px)', height: 'calc(100% - 36px)' }}
                  />
                )}
              </div>
              {hasChart && (
                <div style={{ lineHeight: 0, flexShrink: 0 }}>
                  {showSplits ? (
                    <SplitsChart splits={splits} color={withAlpha(ink, 0.55)} highlight={palette.accent} width={routeBoxWidth} height={t.chart} />
                  ) : (
                    <ElevationProfile points={rawPoints} color={ink} width={routeBoxWidth} height={t.chart} />
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: '1fr 1fr',
                gap: t.gap * 0.6,
              }}
            >
              {tiles.map((tile) => (
                <div
                  key={tile.key}
                  style={{
                    background: withAlpha(ink, 0.05),
                    borderRadius: 16,
                    padding: `${t.label}px ${t.label * 1.1}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minWidth: 0,
                  }}
                >
                  <div style={label}>{tx(tile.label)}</div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: t.statValue,
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {tile.value}
                    {tile.unit && (
                      <span style={{ fontSize: t.statValue * 0.38, fontWeight: 600, color: muted, marginLeft: 4 }}>{tile.unit}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ margin: `${t.gap}px -${t.pad}px 0` }}>
            <TearLine color={withAlpha(muted, 0.6)} surface={surface} notch={36} />
          </div>

          {/* Finisher tear-off tab */}
          <div style={{ height: t.tab, flexShrink: 0, padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: t.finisher,
                  letterSpacing: '0.04em',
                  lineHeight: 1,
                  color: palette.accent === bib ? ink : palette.accent,
                  textTransform: 'uppercase',
                }}
              >
                {tx('Finisher')}
              </div>
              <div style={{ ...label, marginTop: 10 }}>
                {serial}
                {metrics.gearBrand && <> · {metrics.gearBrand}</>}
              </div>
            </div>
            {config.stamp === 'barcode' ? (
              <Barcode seed={`${serial}|${metrics.activityTitle}`} color={ink} width={t.stamp * 2.4} height={t.stamp * 0.7} />
            ) : (
              <QrStamp value={posterQrUrl()} size={t.stamp} foreground={ink} background={bib} radius={6} />
            )}
          </div>
        </div>

        <SafetyPin style={{ left: 22, top: t.band + 18 }} surface={surface} />
        <SafetyPin style={{ right: 22, top: t.band + 18 }} surface={surface} flip />
        <SafetyPin style={{ left: 22, bottom: 22 }} surface={surface} flip />
        <SafetyPin style={{ right: 22, bottom: 22 }} surface={surface} />
      </div>
    </div>
  );
}
