import { useMemo, type ComponentType } from 'react';
import type {
  CoordinatePoint,
  PosterConfig,
  RawGpxPoint,
  TemplateId,
  WorkoutMetrics,
} from '@/types/poster';
import { buildRoute } from '@/lib/poster-presets';
import { trimRouteEnds } from '@/lib/privacy';
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

/**
 * Renders the poster at native resolution with the template its config selects.
 * The privacy zone is applied here, at draw time, so every template, preview,
 * export and gallery thumbnail honors it, while stats keep the full distance.
 */
export function PosterRenderer(props: PosterData) {
  const Template = TEMPLATE_COMPONENTS[props.config.templateId] ?? MagazineTemplate;
  const privacyOn = props.config.privacyZone !== false;
  const { rawPoints, routePoints } = props;

  const drawn = useMemo(
    () => (privacyOn ? buildRoute(trimRouteEnds(rawPoints)) : { rawPoints, routePoints }),
    [privacyOn, rawPoints, routePoints]
  );

  return <Template {...props} rawPoints={drawn.rawPoints} routePoints={drawn.routePoints} />;
}
