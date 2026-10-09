import type { CSSProperties } from 'react';
import type { AspectRatio } from '@/types/poster';
import type { PosterData } from '@/components/canvas/PosterRenderer';
import { POSTER_DIMENSIONS } from '@/lib/poster-presets';
import { MONO, SANS, SERIF, buildMetricCells, dayOfYear, serialFor } from '@/lib/poster-helpers';
import { RouteSvg } from '@/components/canvas/RouteSvg';
import { displayDistance, distanceLabel, paceParts } from '@/lib/units';
import { ElevationProfile } from '@/components/canvas/ElevationProfile';
import { QrStamp, posterQrUrl } from '@/components/canvas/QrStamp';
import { SplitsChart } from '@/components/canvas/SplitsChart';
import { splitsFor } from '@/lib/splits';

interface LayoutTokens {
  layout: 'stack' | 'split';
  pad: number;
  meta: number;
  seal: number;
  title: number;
  pace: number;
  metricValue: number;
  label: number;
  gap: number;
  routeStroke: number;
  routeInset: number;
  elevationHeight: number;
  watermark: number;
}

const TOKENS: Record<AspectRatio, LayoutTokens> = {
  '9:16': {
    layout: 'stack',
    pad: 96,
    meta: 18,
    seal: 88,
    title: 92,
    pace: 172,
    metricValue: 54,
    label: 15,
    gap: 52,
    routeStroke: 3.2,
    routeInset: 40,
    elevationHeight: 56,
    watermark: 40,
  },
  '4:5': {
    layout: 'stack',
    pad: 80,
    meta: 16,
    seal: 72,
    title: 72,
    pace: 132,
    metricValue: 44,
    label: 14,
    gap: 32,
    routeStroke: 3.6,
    routeInset: 24,
    elevationHeight: 40,
    watermark: 34,
  },
  '1:1': {
    layout: 'split',
    pad: 72,
    meta: 15,
    seal: 64,
    title: 60,
    pace: 112,
    metricValue: 38,
    label: 13,
    gap: 28,
    routeStroke: 4,
    routeInset: 8,
    elevationHeight: 36,
    watermark: 30,
  },
};

/** Japanese mincho first so the seal glyph looks brushed; falls back to any serif. */
const CJK_SERIF = '"Hiragino Mincho ProN", "Yu Mincho", YuMincho, "Noto Serif JP", "Noto Serif CJK JP", "MS Mincho", serif';

function dottedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()} · ${String(d.getMonth() + 1).padStart(2, '0')} · ${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Clean Japanese-minimal poster: generous white space, a hairline route,
 * a vertical location tag and a small hanko-style seal. Native 1080 px wide.
 */
export function MinimalTemplate({ metrics, config, rawPoints, routePoints }: PosterData) {
  const { palette, aspectRatio } = config;
  const t = TOKENS[aspectRatio];
  const { width, height } = POSTER_DIMENSIONS[aspectRatio];
  const contentWidth = width - t.pad * 2;
  const isSplit = t.layout === 'split';

  const cells = buildMetricCells(metrics, config.showHeartRate, config.units);
  const paceValue = paceParts(metrics, config.units);
  const unit = distanceLabel(config.units);
  const serial = serialFor(metrics);
  const splits = splitsFor(metrics, config.units);
  const showSplits = config.chart === 'splits' && splits.length >= 2;
  // One chart slot: per-unit splits when chosen and available, otherwise elevation.
  const hasElevation =
    config.showElevationProfile && (showSplits || rawPoints.some((p) => typeof p.ele === 'number'));

  const small: CSSProperties = {
    fontFamily: MONO,
    fontSize: t.label,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
    color: palette.secondaryText,
    lineHeight: 1.3,
  };

  /* ---------- Sections ---------- */

  const top = (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
      <div>
        <div style={{ ...small, fontSize: t.meta, color: palette.primaryText }}>
          No. {String(dayOfYear(metrics.date)).padStart(3, '0')}
        </div>
        <div style={{ ...small, fontSize: t.meta, marginTop: t.meta * 0.5 }}>{dottedDate(metrics.date)}</div>
      </div>
      {/* Hanko seal: 走 = "run" */}
      <div
        style={{
          width: t.seal,
          height: t.seal,
          background: palette.accent,
          borderRadius: t.seal * 0.08,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: palette.background,
          fontFamily: CJK_SERIF,
          fontSize: t.seal * 0.6,
          lineHeight: 1,
          boxShadow: `inset 0 0 0 ${Math.max(2, t.seal * 0.045)}px ${palette.background}, inset 0 0 0 ${Math.max(4, t.seal * 0.08)}px ${palette.accent}`,
        }}
      >
        走
      </div>
    </header>
  );

  const route = (
    <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      {config.showRoute && routePoints.length > 0 ? (
        <RouteSvg
          points={routePoints}
          routeColor={palette.routeColor}
          accent={palette.accent}
          markers="dot"
          strokeWidth={t.routeStroke}
          style={{
            position: 'absolute',
            inset: t.routeInset,
            width: `calc(100% - ${t.routeInset * 2}px)`,
            height: `calc(100% - ${t.routeInset * 2}px)`,
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '62%',
              aspectRatio: '1 / 1',
              maxHeight: '100%',
              borderRadius: 999,
              border: `2px solid ${palette.secondaryText}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: SANS,
              fontWeight: 200,
              fontSize: t.title * 1.2,
              letterSpacing: '-0.03em',
              color: palette.primaryText,
            }}
          >
            {displayDistance(metrics.distanceKm, config.units).toFixed(1)}
            <span style={{ ...small, marginLeft: 10, color: palette.accent }}>{unit}</span>
          </div>
        </div>
      )}
    </div>
  );

  const title = (
    <section style={{ flexShrink: 0 }}>
      <h1
        style={{
          fontFamily: SERIF,
          fontSize: t.title,
          fontWeight: 400,
          lineHeight: 1,
          letterSpacing: '-0.015em',
          color: palette.primaryText,
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          paddingBottom: t.title * 0.08,
        }}
      >
        {metrics.activityTitle || 'Untitled Run'}
      </h1>
      <div style={{ width: t.title * 0.7, height: 3, background: palette.accent, marginTop: t.label * 0.9 }} />
    </section>
  );

  const pace = (
    <section style={{ flexShrink: 0, marginTop: t.gap * 0.8 }}>
      <div style={small}>Pace / {unit}</div>
      <div
        style={{
          fontFamily: SANS,
          fontSize: t.pace,
          fontWeight: 200,
          lineHeight: 0.95,
          letterSpacing: '-0.045em',
          fontVariantNumeric: 'tabular-nums',
          color: palette.primaryText,
          marginTop: t.label * 0.4,
          marginLeft: -t.pace * 0.03,
          whiteSpace: 'nowrap',
        }}
      >
        {paceValue.minutes}
        <span style={{ color: palette.accent }}>&rsquo;</span>
        {String(paceValue.seconds).padStart(2, '0')}
        <span style={{ color: palette.accent }}>&rdquo;</span>
      </div>
    </section>
  );

  const stats = (
    <section
      style={{
        flexShrink: 0,
        marginTop: t.gap * 0.7,
        display: 'grid',
        columnGap: t.label * 2,
        rowGap: t.label * 1.6,
        gridTemplateColumns: isSplit
          ? 'repeat(2, minmax(0, 1fr))'
          : cells.map((c) => `minmax(0, ${c.weight}fr)`).join(' '),
      }}
    >
      {cells.map((cell) => (
        <div key={cell.key} style={{ minWidth: 0 }}>
          <div style={small}>{cell.label}</div>
          <div
            style={{
              fontFamily: SANS,
              fontSize: t.metricValue,
              fontWeight: 300,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              color: palette.primaryText,
              marginTop: t.label * 0.5,
              whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {cell.value}
            {cell.unit && (
              <span style={{ fontSize: t.metricValue * 0.38, color: palette.secondaryText, marginLeft: 6 }}>
                {cell.unit}
              </span>
            )}
          </div>
        </div>
      ))}
    </section>
  );

  const footer = (
    <footer style={{ flexShrink: 0, marginTop: t.gap }}>
      {hasElevation && (
        <div style={{ lineHeight: 0, marginBottom: t.label * 1.4 }}>
          {showSplits ? (
            <SplitsChart
              splits={splits}
              color={palette.secondaryText}
              highlight={palette.accent}
              barRatio={0.28}
              width={contentWidth}
              height={t.elevationHeight}
            />
          ) : (
            <ElevationProfile
              points={rawPoints}
              color={palette.secondaryText}
              variant="line"
              strokeWidth={1.6}
              width={contentWidth}
              height={t.elevationHeight}
            />
          )}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: config.stamp === 'barcode' ? 'baseline' : 'flex-end',
          borderTop: `1px solid ${palette.secondaryText}`,
          paddingTop: t.label * 1.1,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'flex-end', gap: t.label }}>
          {config.stamp !== 'barcode' && (
            <QrStamp
              value={posterQrUrl()}
              size={Math.round(t.label * 5.2)}
              foreground={config.contrastMode === 'dark' ? palette.background : palette.primaryText}
              background={config.contrastMode === 'dark' ? palette.primaryText : palette.background}
              radius={3}
            />
          )}
          <span style={{ ...small, fontSize: t.label - 1 }}>
            {serial}
            {metrics.gearBrand && <> · {metrics.gearBrand}</>}
          </span>
        </span>
        {config.showWatermark && config.watermarkText.trim() && (
          <span
            style={{
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontSize: t.watermark,
              lineHeight: 1,
              color: palette.primaryText,
            }}
          >
            {config.watermarkText}
          </span>
        )}
      </div>
    </footer>
  );

  /** Vertical location tag along the right margin (top-to-bottom, right-to-left). */
  const verticalTag = metrics.locationName ? (
    <div
      style={{
        position: 'absolute',
        top: t.pad + t.seal + t.gap * 0.8,
        right: t.pad * 0.36,
        writingMode: 'vertical-rl',
        display: 'flex',
        alignItems: 'center',
        gap: t.label,
        ...small,
        fontSize: t.label,
        letterSpacing: '0.4em',
        color: palette.secondaryText,
        maxHeight: height * 0.45,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 1, height: t.label * 4, background: palette.accent, display: 'inline-block' }} />
      {metrics.locationName}
    </div>
  ) : null;

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
            filter: 'grayscale(1) contrast(0.95) brightness(1.05)',
          }}
        />
      )}

      {verticalTag}

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
        {top}

        {isSplit ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: t.gap * 1.4, marginTop: t.gap * 0.6 }}>
            <div style={{ flex: '0 0 46%', display: 'flex', flexDirection: 'column' }}>{route}</div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                paddingRight: t.pad * 0.2,
              }}
            >
              {title}
              {pace}
              {stats}
            </div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: t.gap * 0.4 }}>
              {route}
            </div>
            <div style={{ marginTop: t.gap * 0.6 }}>{title}</div>
            {pace}
            {stats}
          </>
        )}

        {footer}
      </div>
    </div>
  );
}
