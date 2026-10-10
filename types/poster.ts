export type AspectRatio = '9:16' | '1:1' | '4:5';

export type TemplateId = 'magazine' | 'cyberpunk' | 'swiss' | 'bib' | 'retro' | 'stats';

/** Display units. Metrics are always stored in metric; `mi` also shows elevation in feet. */
export type DistanceUnit = 'km' | 'mi';

export interface CoordinatePoint {
  x: number;
  y: number;
  elevation?: number;
}

export interface RawGpxPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
}

export interface WorkoutMetrics {
  distanceKm: number;
  paceMinutes: number;
  paceSeconds: number;
  durationSeconds: number;
  elevationGainMeters: number;
  heartRateAvg?: number;
  caloriesBurned?: number;
  date: string; // ISO String
  locationName: string;
  activityTitle: string;
  gearBrand?: string; // e.g., "Nike Vaporfly 3"
  /** Moving seconds per km / per mile, computed at import. Absent without timestamps. */
  splitsKm?: number[];
  splitsMi?: number[];
}

export interface ColorPalette {
  id: string;
  name: string;
  background: string;
  cardBackground?: string;
  primaryText: string;
  secondaryText: string;
  accent: string;
  routeColor: string;
}

export interface PosterConfig {
  templateId: TemplateId;
  aspectRatio: AspectRatio;
  palette: ColorPalette;
  showRoute: boolean;
  showElevationProfile: boolean;
  showHeartRate: boolean;
  showWatermark: boolean;
  watermarkText: string; // Default: 'RyannPace'
  customOverlayImage: string | null;
  overlayOpacity: number; // 0 to 1
  contrastMode: 'dark' | 'light';
  /** Optional so presets and gallery posters saved before units existed stay valid. */
  units?: DistanceUnit;
  /** Hide the first/last 200 m of the drawn route. Optional for older saves; treated as on. */
  privacyZone?: boolean;
  /** What the profile chart shows. Optional for older saves; treated as elevation. */
  chart?: 'elevation' | 'splits';
  /** Footer stamp: a scannable QR code to RyannPace, or the decorative barcode. Optional; treated as QR. */
  stamp?: 'qr' | 'barcode';
}

export interface UserPreset {
  id: string;
  userId: string;
  presetName: string;
  config: PosterConfig;
  createdAt: string;
}
