import type { DistanceUnit, WorkoutMetrics } from '@/types/poster';

/**
 * Metrics are always stored in metric (km, sec/km, m) so presets and gallery
 * recipes stay comparable; these helpers convert only for display and input.
 */
export const KM_PER_MILE = 1.609344;
export const FEET_PER_METER = 3.28084;

export const unitOf = (units: DistanceUnit | undefined): DistanceUnit => (units === 'mi' ? 'mi' : 'km');

export function displayDistance(km: number, units?: DistanceUnit): number {
  return unitOf(units) === 'mi' ? km / KM_PER_MILE : km;
}

/** Converts a distance typed in the display unit back to km for storage. */
export function toKm(value: number, units?: DistanceUnit): number {
  return unitOf(units) === 'mi' ? value * KM_PER_MILE : value;
}

export function displayElevation(meters: number, units?: DistanceUnit): number {
  return unitOf(units) === 'mi' ? meters * FEET_PER_METER : meters;
}

export function toMeters(value: number, units?: DistanceUnit): number {
  return unitOf(units) === 'mi' ? value / FEET_PER_METER : value;
}

export const distanceLabel = (units?: DistanceUnit) => (unitOf(units) === 'mi' ? 'mi' : 'km');
export const elevationLabel = (units?: DistanceUnit) => (unitOf(units) === 'mi' ? 'ft' : 'm');

/** Average pace per display unit, split into minutes and seconds. */
export function paceParts(metrics: WorkoutMetrics, units?: DistanceUnit): { minutes: number; seconds: number } {
  const perKm = metrics.paceMinutes * 60 + metrics.paceSeconds;
  const total = Math.round(unitOf(units) === 'mi' ? perKm * KM_PER_MILE : perKm);
  return { minutes: Math.floor(total / 60), seconds: total % 60 };
}
