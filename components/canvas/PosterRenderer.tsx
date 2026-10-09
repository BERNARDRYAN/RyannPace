import type { ComponentType } from 'react';
import type {
  CoordinatePoint,
  PosterConfig,
  RawGpxPoint,
  TemplateId,
  WorkoutMetrics,
} from '@/types/poster';
import { MagazineTemplate } from '@/components/canvas/templates/MagazineTemplate';
import { CyberpunkTemplate } from '@/components/canvas/templates/CyberpunkTemplate';
import { MinimalTemplate } from '@/components/canvas/templates/MinimalTemplate';

/** Everything a template needs to draw one poster. */
export interface PosterData {
  metrics: WorkoutMetrics;
  config: PosterConfig;
  rawPoints: RawGpxPoint[];
  routePoints: CoordinatePoint[];
}

/** Template registry. The `swiss` id is the "Minimal" (Japanese) template, per the original plan. */
const TEMPLATE_COMPONENTS: Record<TemplateId, ComponentType<PosterData>> = {
  magazine: MagazineTemplate,
  cyberpunk: CyberpunkTemplate,
  swiss: MinimalTemplate,
};

/** Renders the poster at native resolution with the template its config selects. */
export function PosterRenderer(props: PosterData) {
  const Template = TEMPLATE_COMPONENTS[props.config.templateId] ?? MagazineTemplate;
  return <Template {...props} />;
}
