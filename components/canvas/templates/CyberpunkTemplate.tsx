import type { CSSProperties } from 'react';
import type { AspectRatio } from '@/types/poster';
import type { PosterData } from '@/components/canvas/PosterRenderer';
import { POSTER_DIMENSIONS } from '@/lib/poster-presets';
import { formatPosterDate, formatPosterTime } from '@/lib/format';
import { MONO, SANS, buildMetricCells, dayOfYear, serialFor, withAlpha } from '@/lib/poster-helpers';
import { RouteSvg } from '@/components/canvas/RouteSvg';
import { displayDistance, displayElevation, distanceLabel, elevationLabel, paceParts } from '@/lib/units';
import { formatPace } from '@/lib/format';
import { ElevationProfile } from '@/components/canvas/ElevationProfile';
import { SplitsChart } from '@/components/canvas/SplitsChart';
import { splitsFor } from '@/lib/splits';
import { Barcode } from '@/components/canvas/Barcode';
import { QrStamp, posterQrUrl } from '@/components/canvas/QrStamp';

interface LayoutTokens {
  layout: 'stack' | 'split';
  pad: number;
  hud: number;
  title: number;
  titleLines: number;
  gap: number;
  pace: number;
  metricValue: number;
  label: number;
  routeStroke: number;
  elevationHeight: number;
  barcode: { width: number; height: number };
  grid: number;
}

const TOKENS: Record<AspectRatio, LayoutTokens> = {
  '9:16': {
    layout: 'stack',
    pad: 72,
    hud: 19,
    title: 118,
    titleLines: 2,
    gap: 38,
    pace: 252,
    metricValue: 46,
    label: 16,
    routeStroke: 5,
    elevationHeight: 84,
    barcode: { width: 300, height: 58 },
    grid: 54,
  },
  '4:5': {
    layout: 'stack',
    pad: 60,
    hud: 17,
    title: 84,
    titleLines: 1,
    gap: 26,
    pace: 188,
    metricValue: 42,
    label: 15,
    routeStroke: 6,
    elevationHeight: 60,
    barcode: { width: 260, height: 48 },
    grid: 48,
  },
  '1:1': {
    layout: 'split',
    pad: 56,
    hud: 16,
    title: 68,
    titleLines: 1,
    gap: 24,
    pace: 128,
    metricValue: 38,
    label: 14,
    routeStroke: 7,
    elevationHeight: 52,
    barcode: { width: 240, height: 44 },
    grid: 48,
  },
};

const SHORT_LABEL: Record<string, string> = {
  distance: 'DIST',
  time: 'TIME',
  elevation: 'ELEV',
  heartRate: 'HR',
  energy: 'KCAL',
};

/** Two decimals (~1 km): decorative, and never precise enough to reveal a home address. */
function coordinate(value: number, positive: string, negative: string): string {
  return `${Math.abs(value).toFixed(2)}${value >= 0 ? positive : negative}`;
}

/** Four L-shaped HUD brackets framing a panel. */
function CornerBrackets({ color, size, weight }: { color: string; size: number; weight: number }) {
  const base: CSSProperties = { position: 'absolute', width: size, height: size, borderColor: color, borderStyle: 'solid' };
  return (
    <>
      <span style={{ ...base, top: -1, left: -1, borderWidth: `${weight}px 0 0 ${weight}px` }} />
      <span style={{ ...base, top: -1, right: -1, borderWidth: `${weight}px ${weight}px 0 0` }} />
      <span style={{ ...base, bottom: -1, left: -1, borderWidth: `0 0 ${weight}px ${weight}px` }} />
      <span style={{ ...base, bottom: -1, right: -1, borderWidth: `0 ${weight}px ${weight}px 0` }} />
    </>
  );
}

/**
 * Cyberpunk / OLED telemetry poster: pure-black base, neon route with glow,
 * HUD brackets and gauges. Native 1080 px wide like every template.
 */
export function CyberpunkTemplate({ metrics, config, rawPoints, routePoints }: PosterData) {
  const { palette, aspectRatio } = config;
  const t = TOKENS[aspectRatio];
  const { width, height } = POSTER_DIMENSIONS[aspectRatio];
  const contentWidth = width - t.pad * 2;
  const isSplit = t.layout === 'split';

  const neon = palette.routeColor;
  const accent = palette.accent;
  const dim = palette.secondaryText;
  const line = withAlpha(neon, 0.32);

  const cells = buildMetricCells(metrics, config.showHeartRate, config.units);
  const pace = paceParts(metrics, config.units);
  const unit = distanceLabel(config.units);
  const start = rawPoints[0];
  const serial = serialFor(metrics);
  const dateLabel = formatPosterDate(metrics.date);
  const timeLabel = formatPosterTime(metrics.date);
  const splits = splitsFor(metrics, config.units);
  const showSplits = config.chart === 'splits' && splits.length >= 2;
  // One chart slot: per-unit splits when chosen and available, otherwise elevation.
  const hasElevation =
    config.showElevationProfile && (showSplits || rawPoints.some((p) => typeof p.ele === 'number'));
  const maxEle = rawPoints.reduce((m, p) => (typeof p.ele === 'number' && p.ele > m ? p.ele : m), -Infinity);

  const hudText: CSSProperties = {
    fontFamily: MONO,
    fontSize: t.label,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: dim,
    lineHeight: 1.25,
  };

  const panelWidth = isSplit ? Math.round(contentWidth * 0.5) : contentWidth;
  const panelPad = isSplit ? 22 : 30;

  /* ---------- Sections ---------- */

  const hud = (
    <header style={{ flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: MONO,
          fontSize: t.hud,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: palette.primaryText,
        }}
      >
        <span>
          <span style={{ color: accent }}>◢ </span>RyannPace <span style={{ color: dim }}>{'//'}</span> Telemetry
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: t.hud * 0.5 }}>
          <span
            style={{
              width: t.hud * 0.55,
              height: t.hud * 0.55,
              borderRadius: 999,
              background: accent,
              boxShadow: `0 0 ${t.hud}px ${accent}`,
            }}
          />
          <span style={{ color: accent }}>REC</span>
          <span style={{ color: dim }}>· RUN#{String(dayOfYear(metrics.date)).padStart(3, '0')}</span>
        </span>
      </div>
      {/* Ruler: a neon line with tick marks */}
      <div
        style={{
          marginTop: t.hud * 0.9,
          height: 12,
          borderTop: `2px solid ${neon}`,
          backgroundImage: `repeating-linear-gradient(90deg, ${withAlpha(neon, 0.6)} 0 2px, transparent 2px ${t.grid / 2}px)`,
          backgroundSize: `100% 8px`,
          backgroundRepeat: 'no-repeat',
          boxShadow: `0 -2px 14px ${withAlpha(neon, 0.45)}`,
        }}
      />
      <div style={{ ...hudText, display: 'flex', justifyContent: 'space-between', marginTop: t.hud * 0.5 }}>
        <span>
          {start ? `LAT ${coordinate(start.lat, 'N', 'S')}  LON ${coordinate(start.lon, 'E', 'W')}` : 'NO FIX'}
        </span>
        <span>
          {dateLabel}
          {timeLabel && ` · T+${timeLabel}`}
        </span>
      </div>
    </header>
  );

  const titleBlock = (
    <section style={{ marginTop: t.gap, flexShrink: 0 }}>
      <div style={{ ...hudText, color: dim, marginBottom: t.label * 0.6 }}>[ Mission ]</div>
      <h1
        style={{
          fontFamily: SANS,
          fontSize: t.title,
          fontWeight: 800,
          lineHeight: 0.92,
          letterSpacing: '-0.025em',
          textTransform: 'uppercase',
          color: palette.primaryText,
          margin: 0,
          textShadow: `-4px 0 ${withAlpha(accent, 0.75)}, 4px 0 ${withAlpha(neon, 0.75)}`,
          display: '-webkit-box',
          WebkitLineClamp: t.titleLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          paddingBottom: t.title * 0.06,
        }}
      >
        {metrics.activityTitle || 'Untitled Run'}
      </h1>
      {metrics.locationName && (
        <div style={{ ...hudText, color: neon, marginTop: t.label * 0.7, letterSpacing: '0.12em' }}>
          &gt; Location: {metrics.locationName}
          <span style={{ color: accent }}>_</span>
        </div>
      )}
    </section>
  );

  const routePanel = (
    <section
      style={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        width: panelWidth,
        flexShrink: 0,
        background: withAlpha(palette.cardBackground ?? palette.background, 0.85),
        border: `1px solid ${line}`,
        display: 'flex',
        flexDirection: 'column',
        padding: panelPad,
        boxSizing: 'border-box',
      }}
    >
      <CornerBrackets color={neon} size={t.label * 1.6} weight={3} />
      <div style={{ ...hudText, display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
        <span>
          <span style={{ color: neon }}>■</span> Track.01 // GPS
        </span>
        <span style={{ color: neon }}>N ▲</span>
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0, margin: `${panelPad * 0.6}px 0` }}>
        {config.showRoute && routePoints.length > 0 ? (
          <RouteSvg
            points={routePoints}
            routeColor={neon}
            accent={accent}
            fadeFrom={accent}
            glow
            markers="target"
            strokeWidth={t.routeStroke}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: MONO,
              fontSize: t.title,
              fontWeight: 700,
              color: neon,
              textShadow: `0 0 30px ${withAlpha(neon, 0.6)}`,
            }}
          >
            {displayDistance(metrics.distanceKm, config.units).toFixed(2)}
            <span style={{ fontSize: t.title * 0.4, marginLeft: 10, color: accent }}>{unit.toUpperCase()}</span>
          </div>
        )}
      </div>

      {hasElevation && (
        <div style={{ flexShrink: 0 }}>
          <div style={{ ...hudText, display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            {showSplits ? (
              <>
                <span>Splits/{unit}</span>
                <span style={{ color: accent }}>
                  ▲ {formatPace(Math.floor(Math.min(...splits) / 60), Math.min(...splits) % 60)}
                </span>
              </>
            ) : (
              <>
                <span>Alt.Profile</span>
                {Number.isFinite(maxEle) && (
                  <span style={{ color: accent }}>
                    ▲ {Math.round(displayElevation(maxEle, config.units))} {elevationLabel(config.units)}
                  </span>
                )}
              </>
            )}
          </div>
          <div style={{ lineHeight: 0 }}>
            {showSplits ? (
              <SplitsChart
                splits={splits}
                color={neon}
                highlight={accent}
                width={panelWidth - panelPad * 2}
                height={t.elevationHeight}
              />
            ) : (
              <ElevationProfile
                points={rawPoints}
                color={neon}
                highlight={accent}
                variant="bars"
                width={panelWidth - panelPad * 2}
                height={t.elevationHeight}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );

  const paceBlock = (
    <section style={{ flexShrink: 0, marginTop: isSplit ? 0 : t.gap }}>
      <div style={{ ...hudText, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: palette.primaryText }}>Avg.Pace</span>
        <span>[min/{unit}]</span>
      </div>
      <div
        style={{
          fontFamily: SANS,
          fontSize: t.pace,
          fontWeight: 800,
          lineHeight: 0.88,
          letterSpacing: '-0.05em',
          fontVariantNumeric: 'tabular-nums',
          color: palette.primaryText,
          textShadow: `0 0 ${t.pace * 0.18}px ${withAlpha(neon, 0.55)}`,
          marginTop: t.label * 0.5,
          marginLeft: -t.pace * 0.035,
          whiteSpace: 'nowrap',
        }}
      >
        {String(pace.minutes).padStart(2, '0')}
        <span style={{ color: accent, textShadow: `0 0 ${t.pace * 0.15}px ${withAlpha(accent, 0.7)}` }}>&rsquo;</span>
        {String(pace.seconds).padStart(2, '0')}
        <span style={{ color: accent, textShadow: `0 0 ${t.pace * 0.15}px ${withAlpha(accent, 0.7)}` }}>&rdquo;</span>
      </div>
    </section>
  );

  const metricGrid = (
    <section
      style={{
        flexShrink: 0,
        marginTop: t.gap * 0.8,
        display: 'grid',
        gap: t.label * 0.75,
        gridTemplateColumns: isSplit
          ? 'repeat(2, minmax(0, 1fr))'
          : cells.map((c) => `minmax(0, ${c.weight}fr)`).join(' '),
      }}
    >
      {cells.map((cell) => (
        <div
          key={cell.key}
          style={{
            border: `1px solid ${line}`,
            background: withAlpha(palette.cardBackground ?? palette.background, 0.7),
            padding: `${t.label * 0.8}px ${t.label * 0.9}px`,
            minWidth: 0,
          }}
        >
          <div style={{ ...hudText, display: 'flex', justifyContent: 'space-between' }}>
            <span>{SHORT_LABEL[cell.key]}</span>
            <span style={{ color: neon }}>{String(Math.round(cell.ratio * 100)).padStart(2, '0')}%</span>
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: t.metricValue,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              color: palette.primaryText,
              marginTop: t.label * 0.6,
              whiteSpace: 'nowrap',
            }}
          >
            {cell.value}
            {cell.unit && (
              <span style={{ fontSize: t.metricValue * 0.42, color: dim, marginLeft: 6, letterSpacing: '0.04em' }}>
                {cell.unit}
              </span>
            )}
          </div>
          {/* Gauge */}
          <div style={{ marginTop: t.label * 0.7, height: 5, background: withAlpha(neon, 0.14) }}>
            <div
              style={{
                width: `${Math.max(4, cell.ratio * 100)}%`,
                height: '100%',
                background: neon,
                boxShadow: `0 0 10px ${withAlpha(neon, 0.8)}`,
              }}
            />
          </div>
        </div>
      ))}
    </section>
  );

  const footer = (
    <footer
      style={{
        flexShrink: 0,
        marginTop: t.gap,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 24,
      }}
    >
      <div>
        <div style={{ lineHeight: 0, filter: `drop-shadow(0 0 6px ${withAlpha(neon, 0.5)})` }}>
          {config.stamp === 'barcode' ? (
            <Barcode
              seed={`${serial}|${metrics.durationSeconds}|${metrics.activityTitle}`}
              color={neon}
              width={t.barcode.width}
              height={t.barcode.height}
            />
          ) : (
            // Black modules on a neon tile: on-brand, and not inverted, so all scanners read it.
            <QrStamp
              value={posterQrUrl()}
              size={Math.round(t.barcode.height * 1.9)}
              foreground={palette.background}
              background={neon}
            />
          )}
        </div>
        <div style={{ ...hudText, fontSize: t.label - 2, marginTop: t.label * 0.6 }}>
          ID <span style={{ color: palette.primaryText }}>{serial}</span>
          {metrics.gearBrand && <> · GEAR {metrics.gearBrand}</>}
        </div>
      </div>
      {config.showWatermark && config.watermarkText.trim() && (
        <div
          style={{
            fontFamily: MONO,
            fontSize: t.hud + 6,
            fontWeight: 600,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: palette.primaryText,
            textAlign: 'right',
          }}
        >
          <span style={{ color: accent }}>{'//'}</span> {config.watermarkText}
        </div>
      )}
    </footer>
  );

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        background: palette.background,
        color: palette.primaryText,
        overflow: 'hidden',
        fontFamily: MONO,
      }}
    >
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
            mixBlendMode: 'screen',
            filter: 'grayscale(1) contrast(1.25)',
          }}
        />
      )}

      {/* Telemetry grid and vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${withAlpha(neon, 0.07)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(neon, 0.07)} 1px, transparent 1px)`,
          backgroundSize: `${t.grid}px ${t.grid}px`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 45%, transparent 35%, ${withAlpha(palette.background, 0.9)} 100%)`,
        }}
      />

      <div
        style={{
          position: 'relative',
          height: '100%',
          padding: t.pad,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {hud}
        {titleBlock}

        {isSplit ? (
          <div style={{ flex: 1, minHeight: 0, marginTop: t.gap, display: 'flex', gap: t.gap * 1.1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>{routePanel}</div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {paceBlock}
              {metricGrid}
            </div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, minHeight: 0, marginTop: t.gap, display: 'flex', flexDirection: 'column' }}>
              {routePanel}
            </div>
            {paceBlock}
            {metricGrid}
          </>
        )}

        {footer}
      </div>
    </div>
  );
}
