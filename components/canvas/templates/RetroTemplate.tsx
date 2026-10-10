import type { CSSProperties } from 'react';
import type { AspectRatio } from '@/types/poster';
import type { PosterData } from '@/components/canvas/PosterRenderer';
import { POSTER_DIMENSIONS } from '@/lib/poster-presets';
import { MONO, SANS, buildMetricCells, dayOfYear, serialFor, withAlpha } from '@/lib/poster-helpers';
import { formatDateLong } from '@/lib/i18n';
import { displayDistance, displayElevation, distanceLabel, elevationLabel, paceParts } from '@/lib/units';
import { formatDuration } from '@/lib/format';
import { splitsFor } from '@/lib/splits';
import { RouteSvg } from '@/components/canvas/RouteSvg';
import { ElevationProfile } from '@/components/canvas/ElevationProfile';
import { SplitsChart } from '@/components/canvas/SplitsChart';
import { Barcode } from '@/components/canvas/Barcode';
import { QrStamp, posterQrUrl } from '@/components/canvas/QrStamp';
import { useLocaleStore, useT } from '@/store/useLocaleStore';

interface Tokens {
  pad: number;
  topline: number;
  masthead: number;
  headline: number;
  coverLine: number;
  burst: number;
  burstText: number;
  footer: number;
  chartWidth: number;
  chartHeight: number;
  stamp: number;
}

const TOKENS: Record<AspectRatio, Tokens> = {
  '9:16': {
    pad: 60,
    topline: 20,
    masthead: 196,
    headline: 128,
    coverLine: 36,
    burst: 300,
    burstText: 66,
    footer: 120,
    chartWidth: 420,
    chartHeight: 90,
    stamp: 96,
  },
  '4:5': {
    pad: 52,
    topline: 18,
    masthead: 176,
    headline: 92,
    coverLine: 30,
    burst: 240,
    burstText: 54,
    footer: 104,
    chartWidth: 360,
    chartHeight: 70,
    stamp: 84,
  },
  '1:1': {
    pad: 46,
    topline: 16,
    masthead: 164,
    headline: 72,
    coverLine: 26,
    burst: 210,
    burstText: 46,
    footer: 92,
    chartWidth: 300,
    chartHeight: 56,
    stamp: 74,
  },
};

/** 16-point starburst polygon as an SVG points string, centered in a size×size box. */
function starburstPoints(size: number, spikes = 16): string {
  const c = size / 2;
  const outer = c;
  const inner = c * 0.82;
  return Array.from({ length: spikes * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    return `${(c + r * Math.cos(a)).toFixed(1)},${(c + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

/**
 * 1980s sports-magazine cover: slanted masthead, halftone dots, cover lines,
 * a starburst with the pace, and the route as the cover "photo".
 */
export function RetroTemplate({ metrics, config, rawPoints, routePoints }: PosterData) {
  const tx = useT();
  const locale = useLocaleStore((s) => s.locale);
  const { palette, aspectRatio, units } = config;
  const t = TOKENS[aspectRatio];
  const { width, height } = POSTER_DIMENSIONS[aspectRatio];
  const ink = palette.primaryText;

  const cells = buildMetricCells(metrics, config.showHeartRate, units);
  const hr = cells.find((c) => c.key === 'heartRate' || c.key === 'energy');
  const pace = paceParts(metrics, units);
  const unit = distanceLabel(units);
  const serial = serialFor(metrics);
  const splits = splitsFor(metrics, units);
  const showSplits = config.chart === 'splits' && splits.length >= 2;
  const hasChart = config.showElevationProfile && (showSplits || rawPoints.some((p) => typeof p.ele === 'number'));
  const masthead = ((config.showWatermark && config.watermarkText.trim()) || 'RyannPace').toUpperCase();

  const coverLines = [
    `${displayDistance(metrics.distanceKm, units).toFixed(2)} ${unit.toUpperCase()} · ${formatDuration(metrics.durationSeconds)}`,
    hr ? `${hr.value} ${hr.unit?.toUpperCase() ?? ''} ${tx('Avg')}` : null,
    `+${Math.round(displayElevation(metrics.elevationGainMeters, units))} ${elevationLabel(units).toUpperCase()} ${tx('Climb')}`,
    metrics.locationName ? metrics.locationName.toUpperCase() : null,
  ].filter((line): line is string => !!line);

  const smallCaps: CSSProperties = {
    fontFamily: MONO,
    fontSize: t.topline,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    fontWeight: 700,
  };

  // Pace numbers shrink a little when the minutes have two digits (e.g. 10'05").
  const burstPace = `${pace.minutes}'${String(pace.seconds).padStart(2, '0')}"`;

  return (
    <div style={{ position: 'relative', width, height, background: palette.background, overflow: 'hidden', fontFamily: SANS, color: ink }}>
      {/* Cover photo: an optional background photo, then halftone dots over everything */}
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
            mixBlendMode: config.contrastMode === 'light' ? 'multiply' : 'screen',
            filter: 'contrast(1.15) saturate(1.2)',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(${withAlpha(palette.secondaryText, 0.22)} 2.2px, transparent 2.6px)`,
          backgroundSize: '18px 18px',
        }}
      />

      <div style={{ position: 'relative', height: '100%', padding: t.pad, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        {/* Top line */}
        <div style={{ ...smallCaps, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{tx('The Running Magazine')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {tx('Issue No. {n}', { n: dayOfYear(metrics.date) })}
            <span style={{ background: ink, color: palette.background, padding: '4px 10px', borderRadius: 6 }}>{tx('Free')}</span>
          </span>
        </div>

        {/* Masthead */}
        <div
          style={{
            marginTop: t.topline * 0.6,
            fontWeight: 900,
            // Fit the slanted masthead (plus its shadow) to the cover width.
            fontSize: Math.min(t.masthead, (width - 2 * t.pad - 24) / (Math.max(masthead.length, 4) * 0.68)),
            lineHeight: 0.9,
            letterSpacing: '-0.045em',
            color: palette.accent,
            transform: 'skewX(-9deg)',
            transformOrigin: 'left bottom',
            textShadow: `7px 7px 0 ${ink}`,
            whiteSpace: 'nowrap',
          }}
        >
          {masthead}
        </div>
        <div style={{ height: 6, background: ink, marginTop: t.topline }} />
        <div style={{ ...smallCaps, marginTop: 10, display: 'flex', justifyContent: 'space-between', color: palette.secondaryText }}>
          <span>{formatDateLong(metrics.date, locale)}</span>
          <span>{tx('Special issue')}</span>
        </div>

        {/* Cover: route "photo", starburst, headline and cover lines */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0, marginTop: t.topline }}>
          {config.showRoute && routePoints.length > 0 && (
            <div style={{ position: 'absolute', top: '4%', right: '-2%', width: '78%', height: '62%' }}>
              {/* A thick paper-coloured underlay gives the route a sticker-like outline. */}
              <RouteSvg
                points={routePoints}
                routeColor={palette.background}
                accent={palette.background}
                strokeWidth={26}
                markers="dot"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              />
              <RouteSvg
                points={routePoints}
                routeColor={palette.routeColor}
                accent={palette.accent}
                strokeWidth={13}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              />
            </div>
          )}

          {/* Starburst with the pace */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '6%',
              width: t.burst,
              height: t.burst,
              transform: 'rotate(-12deg)',
            }}
          >
            <svg viewBox={`0 0 ${t.burst} ${t.burst}`} width={t.burst} height={t.burst} style={{ position: 'absolute', inset: 0 }}>
              <polygon points={starburstPoints(t.burst)} fill={ink} transform="translate(6 6)" />
              <polygon points={starburstPoints(t.burst)} fill={palette.cardBackground ?? palette.accent} />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: ink,
                textAlign: 'center',
              }}
            >
              <div style={{ ...smallCaps, fontSize: t.topline * 0.85 }}>{tx('Avg pace')}</div>
              <div style={{ fontWeight: 900, fontSize: t.burstText * (burstPace.length > 5 ? 0.86 : 1), lineHeight: 1, letterSpacing: '-0.04em' }}>
                {burstPace}
              </div>
              <div style={{ ...smallCaps, fontSize: t.topline * 0.85 }}>/{unit}</div>
            </div>
          </div>

          {/* Headline and cover lines */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <div
              style={{
                fontWeight: 900,
                fontStyle: 'italic',
                fontSize: t.headline,
                lineHeight: 0.92,
                letterSpacing: '-0.035em',
                textTransform: 'uppercase',
                maxWidth: '88%',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                paddingBottom: t.headline * 0.06,
                textShadow: `3px 3px 0 ${palette.background}`,
              }}
            >
              {metrics.activityTitle || tx('Untitled Run')}
            </div>
            <div style={{ marginTop: t.coverLine * 0.6, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {coverLines.map((line) => (
                  <li
                    key={line}
                    style={{
                      fontWeight: 800,
                      fontSize: t.coverLine,
                      lineHeight: 1.25,
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ color: palette.accent, marginRight: 10 }}>▶</span>
                    {line}
                  </li>
                ))}
              </ul>
              {hasChart && (
                <div style={{ lineHeight: 0, flexShrink: 0, background: withAlpha(palette.background, 0.85), padding: 8, borderRadius: 8 }}>
                  {showSplits ? (
                    <SplitsChart splits={splits} color={withAlpha(ink, 0.6)} highlight={palette.accent} width={t.chartWidth * 0.6} height={t.chartHeight} />
                  ) : (
                    <ElevationProfile points={rawPoints} color={ink} width={t.chartWidth * 0.6} height={t.chartHeight} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Issue strip */}
        <div
          style={{
            marginTop: t.topline,
            height: t.footer,
            flexShrink: 0,
            borderTop: `6px solid ${ink}`,
            paddingTop: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <div style={{ ...smallCaps, lineHeight: 1.5 }}>
            <div>{tx('Run № {n}', { n: String(dayOfYear(metrics.date)).padStart(3, '0') })}</div>
            <div style={{ color: palette.secondaryText }}>
              {serial}
              {metrics.gearBrand && <> · {metrics.gearBrand}</>}
            </div>
          </div>
          {config.stamp === 'barcode' ? (
            <div style={{ background: '#FFFFFF', padding: '8px 10px', lineHeight: 0 }}>
              <Barcode seed={`${serial}|${metrics.activityTitle}`} color="#111111" width={t.stamp * 2.2} height={t.stamp * 0.62} />
            </div>
          ) : (
            <QrStamp
              value={posterQrUrl()}
              size={t.stamp}
              foreground={config.contrastMode === 'dark' ? palette.background : ink}
              background={config.contrastMode === 'dark' ? ink : palette.background}
              radius={4}
            />
          )}
        </div>
      </div>
    </div>
  );
}
