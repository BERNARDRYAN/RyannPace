import type { RawGpxPoint } from '@/types/poster';

export interface ParsedGpx {
  points: RawGpxPoint[];
  /** Track / route / metadata name, whichever comes first. */
  name: string | null;
  /** <metadata><time>, used when track points carry no timestamps. */
  time: string | null;
}

/** First direct child with this local name, ignoring XML namespace prefixes. */
function child(el: Element, localName: string): Element | null {
  for (const c of Array.from(el.children)) {
    if (c.localName === localName) return c;
  }
  return null;
}

function childText(el: Element, localName: string): string | null {
  const text = child(el, localName)?.textContent?.trim();
  return text ? text : null;
}

function toPoint(el: Element): RawGpxPoint | null {
  const lat = Number.parseFloat(el.getAttribute('lat') ?? '');
  const lon = Number.parseFloat(el.getAttribute('lon') ?? '');
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;

  const point: RawGpxPoint = { lat, lon };
  const ele = Number.parseFloat(childText(el, 'ele') ?? '');
  if (Number.isFinite(ele)) point.ele = ele;
  const rawTime = childText(el, 'time');
  if (rawTime) {
    const t = Date.parse(rawTime);
    if (!Number.isNaN(t)) point.time = new Date(t).toISOString();
  }
  return point;
}

/**
 * Parses GPX 1.0/1.1 XML with the browser's built-in DOMParser. Reads track
 * points (<trkpt>) or, for route-only files, route points (<rtept>).
 * Throws on malformed XML. Browser-only.
 *
 * Replaces the `gpxparser` package, whose jsdom dependency chain carried
 * known vulnerabilities into the project.
 */
export function parseGpx(xml: string): ParsedGpx {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('This file is not valid GPX/XML.');
  }

  const all = (name: string) => Array.from(doc.getElementsByTagNameNS('*', name));
  let points = all('trkpt')
    .map(toPoint)
    .filter((p): p is RawGpxPoint => p !== null);
  if (points.length === 0) {
    points = all('rtept')
      .map(toPoint)
      .filter((p): p is RawGpxPoint => p !== null);
  }

  const firstName = (parentName: string) => {
    const parent = all(parentName)[0];
    return parent ? childText(parent, 'name') : null;
  };
  const metadata = all('metadata')[0];

  return {
    points,
    name: firstName('trk') ?? firstName('rte') ?? (metadata ? childText(metadata, 'name') : null),
    time: metadata ? childText(metadata, 'time') : null,
  };
}
