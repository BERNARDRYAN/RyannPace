export type AspectRatio = '9:16' | '1:1' | '4:5';

export type TemplateId = 'magazine' | 'cyberpunk' | 'swiss';

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
}

export interface UserPreset {
  id: string;
  userId: string;
  presetName: string;
  config: PosterConfig;
  createdAt: string;
}
