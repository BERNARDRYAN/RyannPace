'use client';

import type { CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { AspectRatio, WorkoutMetrics } from '@/types/poster';
import { usePosterStore } from '@/store/usePosterStore';
import { POSTER_DIMENSIONS } from '@/lib/poster-presets';
import {
  formatCoordinate,
  formatDuration,
  formatPosterDate,
  formatPosterTime,
} from '@/lib/format';
import { RouteSvg } from '@/components/canvas/RouteSvg';
import { ElevationProfile } from '@/components/canvas/ElevationProfile';
import { Barcode } from '@/components/canvas/Barcode';

interface LayoutTokens {
  layout: 'stack' | 'split';
  pad: number;
  masthead: number;
  title: number;
  titleLines: number;
  sectionGap: number;
  pace: number;
  metricValue: number;
  metricUnit: number;
  label: number;
  routeStroke: number;
  elevationHeight: number;
  barcode: { width: number; height: number };
  watermark: number;
}

const TOKENS: Record<AspectRatio, LayoutTokens> = {
  '9:16': {
    layout: 'stack',
    pad: 80,
    masthead: 20,
    title: 124,
    titleLines: 2,
    sectionGap: 48,
    pace: 280,
    metricValue: 58,
    metricUnit: 24,
    label: 18,
    routeStroke: 6,
    elevationHeight: 110,
    barcode: { width: 340, height: 76 },
    watermark: 56,
  },
  '4:5': {
    layout: 'stack',
    pad: 68,
    masthead: 18,
    title: 92,
    titleLines: 1,
    sectionGap: 32,
    pace: 220,
    metricValue: 50,
    metricUnit: 20,
    label: 16,
    routeStroke: 7,
    elevationHeight: 80,
    barcode: { width: 300, height: 60 },
    watermark: 46,
  },
  '1:1': {
    layout: 'split',
    pad: 64,
    masthead: 17,
    title: 76,
    titleLines: 1,
    sectionGap: 30,
    pace: 134,
    metricValue: 46,
    metricUnit: 19,
    label: 15,
    routeStroke: 8,
    elevationHeight: 70,
    barcode: { width: 280, height: 54 },
    watermark: 42,
  },
};

const MONO = 'var(--font-jetbrains-mono), ui-monospace, monospace';
const SANS = 'var(--font-inter), ui-sans-serif, system-ui, sans-serif';
const SERIF = 'var(--font-instrument-serif), ui-serif, Georgia, serif';

interface MetricCell {
  label: string;
  value: string;
  unit?: string;
  /** Relative column width in the single-row layout; durations like 1:23:45 need more room. */
  weight: number;
}

function buildMetricCells(metrics: WorkoutMetrics, showHeartRate: boolean): MetricCell[] {
  const cells: MetricCell[] = [
    { label: 'Distance', value: metrics.distanceKm.toFixed(2), unit: 'km', weight: 1.1 },
    { label: 'Time', value: formatDuration(metrics.durationSeconds), weight: 1.3 },
    { label: 'Elev. Gain', value: String(Math.round(metrics.elevationGainMeters)), unit: 'm', weight: 0.9 },
  ];
  if (showHeartRate && metrics.heartRateAvg) {
    cells.push({ label: 'Avg HR', value: String(Math.round(metrics.heartRateAvg)), unit: 'bpm', weight: 0.9 });
  } else if (metrics.caloriesBurned) {
    cells.push({ label: 'Energy', value: String(Math.round(metrics.caloriesBurned)), unit: 'kcal', weight: 0.9 });
  }
  return cells;
}

function dayOfYear(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 1;
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

function serialFor(metrics: WorkoutMetrics): string {
  const d = new Date(metrics.date);
  const stamp = Number.isNaN(d.getTime())
    ? '00000000'
    : `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `RP-${stamp}-${String(Math.round(metrics.distanceKm * 100)).padStart(4, '0')}`;
}

/**
 * Swiss / editorial running poster. Rendered at native export resolution
 * (1080 px wide); PosterBoard scales it down for the on-screen preview.
 */
export function MagazineTemplate() {
  const { metrics, config, rawPoints, routePoints } = usePosterStore(
    useShallow((s) => ({
      metrics: s.metrics,
      config: s.config,
      rawPoints: s.rawPoints,
      routePoints: s.routePoints,
    }))
  );

  const { palette, aspectRatio } = config;
  const t = TOKENS[aspectRatio];
  const { width, height } = POSTER_DIMENSIONS[aspectRatio];
  const contentWidth = width - t.pad * 2;
  const isSplit = t.layout === 'split';

  const cells = buildMetricCells(metrics, config.showHeartRate);
  const start = rawPoints[0];
  const serial = serialFor(metrics);
  const dateLabel = formatPosterDate(metrics.date);
  const timeLabel = formatPosterTime(metrics.date);
  const hasElevation = config.showElevationProfile && rawPoints.some((p) => typeof p.ele === 'number');

  const monoLabel: CSSProperties = {
    fontFamily: MONO,
    fontSize: t.label,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: palette.secondaryText,
    lineHeight: 1.2,
  };

  const rule = (thickness: number, color = palette.primaryText): CSSProperties => ({
    height: thickness,
    background: color,
    width: '100%',
    flexShrink: 0,
  });

  const routePlateWidth = isSplit ? Math.round(contentWidth * 0.5) : contentWidth;
  const platePadX = isSplit ? 28 : 40;

  /* ---------- Sections ---------- */

  const masthead = (
    <header style={{ flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: MONO,
          fontSize: t.masthead,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: palette.primaryText,
        }}
      >
        <span style={{ fontWeight: 600 }}>RyannPace Editorial</span>
        <span style={{ color: palette.secondaryText }}>Run № {String(dayOfYear(metrics.date)).padStart(3, '0')}</span>
        <span
          style={{
            border: `2px solid ${palette.primaryText}`,
            borderRadius: 999,
            padding: `${t.masthead * 0.35}px ${t.masthead * 0.9}px`,
            letterSpacing: '0.18em',
          }}
        >
          {dateLabel}
        </span>
      </div>
      <div style={{ ...rule(3), marginTop: t.masthead * 1.1 }} />
      <div
        style={{
          ...monoLabel,
          fontSize: t.label + 1,
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: t.masthead * 0.8,
          letterSpacing: '0.12em',
        }}
      >
        <span>
          {start
            ? `${formatCoordinate(start.lat, 'lat')}  ·  ${formatCoordinate(start.lon, 'lon')}`
            : 'Coordinates unavailable'}
        </span>
        {timeLabel && <span>Start {timeLabel}</span>}
      </div>
    </header>
  );

  const titleBlock = (
    <section style={{ marginTop: t.sectionGap, flexShrink: 0 }}>
      {metrics.locationName && (
        <div style={{ ...monoLabel, color: palette.accent, marginBottom: t.label * 0.9, fontWeight: 600 }}>
          — {metrics.locationName}
        </div>
      )}
      <h1
        style={{
          fontFamily: SERIF,
          fontSize: t.title,
          lineHeight: 0.94,
          letterSpacing: '-0.02em',
          fontWeight: 400,
          color: palette.primaryText,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: t.titleLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          paddingBottom: t.title * 0.06,
        }}
      >
        {metrics.activityTitle || 'Untitled Run'}
      </h1>
    </section>
  );

  const cornerMark = (pos: CSSProperties) => (
    <span
      style={{
        position: 'absolute',
        fontFamily: MONO,
        fontSize: t.label + 4,
        lineHeight: 1,
        color: palette.secondaryText,
        ...pos,
      }}
    >
      +
    </span>
  );

  const routePlate = (
    <section
      style={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        width: routePlateWidth,
        flexShrink: 0,
        background: palette.cardBackground ?? 'transparent',
        display: 'flex',
        flexDirection: 'column',
        padding: `${platePadX * 0.9}px ${platePadX}px ${hasElevation ? 0 : platePadX}px`,
        boxSizing: 'border-box',
      }}
    >
      {cornerMark({ top: 10, left: 12 })}
      {cornerMark({ top: 10, right: 12 })}
      {cornerMark({ bottom: 10, left: 12 })}
      {cornerMark({ bottom: 10, right: 12 })}

      <div style={{ ...monoLabel, display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
        <span>Fig. 01 — Route Trace</span>
        <span>N ↑</span>
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0, margin: `${platePadX * 0.6}px 0` }}>
        {config.showRoute && routePoints.length > 0 ? (
          <RouteSvg
            points={routePoints}
            routeColor={palette.routeColor}
            accent={palette.accent}
            fadeFrom={palette.secondaryText}
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
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontSize: t.title * 1.4,
              color: palette.primaryText,
              letterSpacing: '-0.03em',
            }}
          >
            {metrics.distanceKm.toFixed(1)}
            <span style={{ fontSize: t.title * 0.5, marginLeft: 12, color: palette.accent }}>km</span>
          </div>
        )}
      </div>

      {hasElevation && (
        <div style={{ flexShrink: 0, margin: `0 -${platePadX}px`, lineHeight: 0 }}>
          <ElevationProfile
            points={rawPoints}
            color={palette.primaryText}
            width={routePlateWidth}
            height={t.elevationHeight}
          />
        </div>
      )}
    </section>
  );

  const paceBlock = (
    <section style={{ flexShrink: 0, marginTop: isSplit ? 0 : t.sectionGap }}>
      <div style={{ ...monoLabel, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: palette.primaryText, fontWeight: 600 }}>Average Pace</span>
        <span>Min / Km</span>
      </div>
      <div
        style={{
          fontFamily: SANS,
          fontSize: t.pace,
          fontWeight: 800,
          lineHeight: 0.86,
          letterSpacing: '-0.055em',
          fontVariantNumeric: 'tabular-nums',
          color: palette.primaryText,
          marginTop: t.label * 0.6,
          marginLeft: -t.pace * 0.04,
          whiteSpace: 'nowrap',
        }}
      >
        {String(metrics.paceMinutes).padStart(2, '0')}
        <span style={{ color: palette.accent }}>&rsquo;</span>
        {String(metrics.paceSeconds).padStart(2, '0')}
        <span style={{ color: palette.accent }}>&rdquo;</span>
      </div>
    </section>
  );

  const metricGrid = (
    <section
      style={{
        flexShrink: 0,
        marginTop: t.sectionGap * (isSplit ? 0.8 : 0.85),
        borderTop: `3px solid ${palette.primaryText}`,
        display: 'grid',
        gridTemplateColumns: isSplit
          ? 'repeat(2, minmax(0, 1fr))'
          : cells.map((c) => `minmax(0, ${c.weight}fr)`).join(' '),
      }}
    >
      {cells.map((cell, i) => {
        const col = isSplit ? i % 2 : i;
        const row = isSplit ? Math.floor(i / 2) : 0;
        return (
          <div
            key={cell.label}
            style={{
              padding: `${t.label * 1.2}px ${t.label * 0.5}px ${t.label * 0.4}px ${col === 0 ? 0 : t.label * 1.2}px`,
              borderLeft: col === 0 ? 'none' : `1.5px solid ${palette.secondaryText}`,
              borderTop: row > 0 ? `1.5px solid ${palette.secondaryText}` : 'none',
              minWidth: 0,
            }}
          >
            <div style={monoLabel}>{cell.label}</div>
            <div
              style={{
                fontFamily: SANS,
                fontSize: t.metricValue,
                fontWeight: 600,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                marginTop: t.label * 0.7,
                color: palette.primaryText,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {cell.value}
              {cell.unit && (
                <span
                  style={{
                    fontSize: t.metricUnit,
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    color: palette.secondaryText,
                    marginLeft: 6,
                  }}
                >
                  {cell.unit}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );

  const footer = (
    <footer
      style={{
        flexShrink: 0,
        marginTop: t.sectionGap,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 32,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: t.label }}>
        <div style={{ lineHeight: 0 }}>
          <Barcode
            seed={`${serial}|${metrics.durationSeconds}|${metrics.activityTitle}`}
            color={palette.primaryText}
            width={t.barcode.width}
            height={t.barcode.height}
          />
          <div
            style={{
              ...monoLabel,
              fontSize: t.label - 3,
              letterSpacing: '0.3em',
              marginTop: t.label * 0.6,
              color: palette.primaryText,
            }}
          >
            RyannPace // Verified Run
          </div>
          <div style={{ ...monoLabel, fontSize: t.label - 4, letterSpacing: '0.24em', marginTop: 6 }}>
            {serial}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'right', minWidth: 0 }}>
        {metrics.gearBrand && (
          <div style={{ ...monoLabel, fontSize: t.label - 2, marginBottom: t.label * 0.6 }}>
            Gear — {metrics.gearBrand}
          </div>
        )}
        {config.showWatermark && config.watermarkText.trim() && (
          <>
            <div
              style={{
                fontFamily: SERIF,
                fontStyle: 'italic',
                fontSize: t.watermark,
                lineHeight: 1,
                color: palette.primaryText,
                letterSpacing: '-0.01em',
              }}
            >
              {config.watermarkText}
            </div>
            <div style={{ ...monoLabel, fontSize: t.label - 4, letterSpacing: '0.34em', marginTop: 8 }}>
              Ryann Suite
            </div>
          </>
        )}
      </div>
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
            filter: 'grayscale(1) contrast(1.1)',
          }}
        />
      )}

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
        {masthead}
        {titleBlock}

        {isSplit ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              marginTop: t.sectionGap,
              display: 'flex',
              gap: t.sectionGap * 1.1,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>{routePlate}</div>
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
            <div
              style={{
                flex: 1,
                minHeight: 0,
                marginTop: t.sectionGap,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {routePlate}
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
