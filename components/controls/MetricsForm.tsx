'use client';

import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePosterStore } from '@/store/usePosterStore';
import { formatDuration, formatPace, parseDuration, toDateInputValue } from '@/lib/format';
import { useHydrated } from '@/hooks/useHydrated';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NumberFieldProps {
  id: string;
  label: string;
  value: number | undefined;
  onCommit: (value: number | undefined) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  optional?: boolean;
}

/**
 * Keeps a local draft while typing so intermediate states ("", "10.") don't
 * fight the store, and commits every value that parses.
 */
function NumberField({ id, label, value, onCommit, unit, step = 1, min = 0, max, optional }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === undefined ? '' : String(value));
  const parsed = Number(shown);
  const invalid =
    shown.trim() === ''
      ? !optional
      : !Number.isFinite(parsed) || parsed < min || (max !== undefined && parsed > max);

  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {unit && <span className="ml-1 normal-case tracking-normal">({unit})</span>}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={shown}
        aria-invalid={invalid || undefined}
        placeholder={optional ? '—' : undefined}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          if (next.trim() === '') {
            if (optional) onCommit(undefined);
            return;
          }
          const n = Number(next);
          if (Number.isFinite(n) && n >= min && (max === undefined || n <= max)) onCommit(n);
        }}
        onBlur={() => setDraft(null)}
        className="font-mono tabular-nums"
      />
    </div>
  );
}

function DurationField({ value, onCommit }: { value: number; onCommit: (seconds: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? formatDuration(value);
  const parsed = parseDuration(shown);

  return (
    <div>
      <Label htmlFor="metric-duration">
        Moving time <span className="ml-1 normal-case tracking-normal">(h:mm:ss)</span>
      </Label>
      <Input
        id="metric-duration"
        inputMode="numeric"
        value={shown}
        aria-invalid={parsed === null || parsed <= 0 || undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          const seconds = parseDuration(e.target.value);
          if (seconds !== null && seconds > 0) onCommit(seconds);
        }}
        onBlur={() => setDraft(null)}
        className="font-mono tabular-nums"
      />
    </div>
  );
}

export function MetricsForm() {
  const hydrated = useHydrated();
  const { metrics, updateMetrics } = usePosterStore(
    useShallow((s) => ({ metrics: s.metrics, updateMetrics: s.updateMetrics }))
  );

  const onDateChange = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return;
    // Keep the original start time of day; only the calendar date changes.
    const previous = new Date(metrics.date);
    const base = Number.isNaN(previous.getTime()) ? new Date() : previous;
    const next = new Date(base);
    next.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    updateMetrics({ date: next.toISOString() });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="metric-title">Activity title</Label>
        <Input
          id="metric-title"
          value={metrics.activityTitle}
          maxLength={60}
          onChange={(e) => updateMetrics({ activityTitle: e.target.value })}
          placeholder="Sunday Long Loop"
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <Label htmlFor="metric-location">Location</Label>
          <Input
            id="metric-location"
            value={metrics.locationName}
            maxLength={48}
            onChange={(e) => updateMetrics({ locationName: e.target.value })}
            placeholder="City, Country"
          />
        </div>
        <div>
          <Label htmlFor="metric-date">Date</Label>
          <Input
            id="metric-date"
            type="date"
            value={hydrated ? toDateInputValue(metrics.date) : ''}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-[150px] font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          id="metric-distance"
          label="Distance"
          unit="km"
          step={0.01}
          min={0}
          max={1000}
          value={metrics.distanceKm}
          onCommit={(v) => updateMetrics({ distanceKm: v ?? 0 })}
        />
        <DurationField value={metrics.durationSeconds} onCommit={(durationSeconds) => updateMetrics({ durationSeconds })} />
      </div>

      <div className="flex items-center justify-between rounded-lg bg-studio px-3 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.18em] text-muted uppercase">Avg pace · auto</span>
        <span className="font-mono text-sm font-semibold text-ink tabular-nums">
          {formatPace(metrics.paceMinutes, metrics.paceSeconds)} <span className="font-normal text-muted">/km</span>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <NumberField
          id="metric-elevation"
          label="Elev."
          unit="m"
          max={20000}
          value={metrics.elevationGainMeters}
          onCommit={(v) => updateMetrics({ elevationGainMeters: v ?? 0 })}
        />
        <NumberField
          id="metric-hr"
          label="Avg HR"
          unit="bpm"
          min={30}
          max={250}
          optional
          value={metrics.heartRateAvg}
          onCommit={(heartRateAvg) => updateMetrics({ heartRateAvg })}
        />
        <NumberField
          id="metric-kcal"
          label="Energy"
          unit="kcal"
          max={20000}
          optional
          value={metrics.caloriesBurned}
          onCommit={(caloriesBurned) => updateMetrics({ caloriesBurned })}
        />
      </div>

      <div>
        <Label htmlFor="metric-gear">Gear (optional)</Label>
        <Input
          id="metric-gear"
          value={metrics.gearBrand ?? ''}
          maxLength={40}
          onChange={(e) => updateMetrics({ gearBrand: e.target.value || undefined })}
          placeholder="Nike Vaporfly 3"
        />
      </div>
    </div>
  );
}
