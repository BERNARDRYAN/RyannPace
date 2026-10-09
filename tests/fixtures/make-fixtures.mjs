// Regenerates test-run.gpx / .fit / .tcx: the same synthetic 6.9 km loop in
// Singapore's Bishan Park, 2 s samples, one 60 s stop at the halfway point.
// FIT and TCX also carry a "watch summary" (6.95 km, 29:40, 61 m, 412 kcal).
// Run: node tests/fixtures/make-fixtures.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import FitParser, { FitBaseType, FitEncoder } from 'fit-file-parser';

const here = dirname(fileURLToPath(import.meta.url));
const t0 = new Date('2026-10-05T23:15:00Z');
const n = 900;
const lat0 = 1.3521;
const lon0 = 103.8198;

const pts = [];
let t = t0.getTime();
for (let i = 0; i <= n; i++) {
  const a = (i / n) * 2 * Math.PI;
  const r = 0.0075 * (1 + 0.3 * Math.sin(2 * a));
  t += i === 450 ? 60000 : 2000;
  pts.push({
    lat: lat0 + r * Math.sin(a),
    lon: lon0 + r * 1.4 * Math.cos(a),
    ele: 30 + 12 * Math.sin(3 * a),
    hr: Math.round(150 + 10 * Math.sin(a * 2)),
    time: new Date(t),
  });
}
const SUMMARY = { distanceM: 6950, timerS: 1780, ascent: 61, calories: 412, avgHr: 151 };

// ---- GPX (Garmin-style, HR in TrackPointExtension) ----
const trkpts = pts
  .map(
    (p) =>
      `<trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}"><ele>${p.ele.toFixed(1)}</ele><time>${p.time.toISOString()}</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${p.hr}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>`
  )
  .join('');
writeFileSync(
  join(here, 'test-run.gpx'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<gpx creator="Garmin Connect" version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><metadata><time>${t0.toISOString()}</time></metadata><trk><name>Bishan Park Easy Run</name><type>running</type><trkseg>${trkpts}</trkseg></trk></gpx>`
);

// ---- FIT (record = 20, session = 18; positions in semicircles) ----
const semi = (deg) => Math.round(deg * (2 ** 31 / 180));
const enc = new FitEncoder();
enc.writeMessage(
  0,
  [
    { number: 0, size: 1, baseType: FitBaseType.Enum, value: 4 },
    { number: 4, size: 4, baseType: FitBaseType.Uint32, value: FitEncoder.toFitTimestamp(t0) },
  ],
  0
);
for (const p of pts) {
  enc.writeMessage(
    20,
    [
      { number: 253, size: 4, baseType: FitBaseType.Uint32, value: FitEncoder.toFitTimestamp(p.time) },
      { number: 0, size: 4, baseType: FitBaseType.Sint32, value: semi(p.lat) },
      { number: 1, size: 4, baseType: FitBaseType.Sint32, value: semi(p.lon) },
      { number: 2, size: 2, baseType: FitBaseType.Uint16, value: Math.round((p.ele + 500) * 5) },
      { number: 3, size: 1, baseType: FitBaseType.Uint8, value: p.hr },
    ],
    1
  );
}
enc.writeMessage(
  18,
  [
    { number: 253, size: 4, baseType: FitBaseType.Uint32, value: FitEncoder.toFitTimestamp(pts.at(-1).time) },
    { number: 2, size: 4, baseType: FitBaseType.Uint32, value: FitEncoder.toFitTimestamp(t0) },
    { number: 5, size: 1, baseType: FitBaseType.Enum, value: 1 },
    { number: 8, size: 4, baseType: FitBaseType.Uint32, value: SUMMARY.timerS * 1000 },
    { number: 9, size: 4, baseType: FitBaseType.Uint32, value: SUMMARY.distanceM * 100 },
    { number: 11, size: 2, baseType: FitBaseType.Uint16, value: SUMMARY.calories },
    { number: 16, size: 1, baseType: FitBaseType.Uint8, value: SUMMARY.avgHr },
    { number: 22, size: 2, baseType: FitBaseType.Uint16, value: SUMMARY.ascent },
  ],
  2
);
const fitBytes = enc.close();
writeFileSync(join(here, 'test-run.fit'), fitBytes);
const check = await new FitParser({ force: true, mode: 'list' }).parseAsync(
  fitBytes.buffer.slice(fitBytes.byteOffset, fitBytes.byteOffset + fitBytes.byteLength)
);
console.log(`FIT ok: ${check.records.length} records, session ${check.sessions[0].total_distance} m`);

// ---- TCX ----
const tps = pts
  .map(
    (p) =>
      `<Trackpoint><Time>${p.time.toISOString()}</Time><Position><LatitudeDegrees>${p.lat.toFixed(7)}</LatitudeDegrees><LongitudeDegrees>${p.lon.toFixed(7)}</LongitudeDegrees></Position><AltitudeMeters>${p.ele.toFixed(1)}</AltitudeMeters><HeartRateBpm><Value>${p.hr}</Value></HeartRateBpm></Trackpoint>`
  )
  .join('');
writeFileSync(
  join(here, 'test-run.tcx'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"><Activities><Activity Sport="Running"><Id>${t0.toISOString()}</Id><Lap StartTime="${t0.toISOString()}"><TotalTimeSeconds>${SUMMARY.timerS}</TotalTimeSeconds><DistanceMeters>${SUMMARY.distanceM}</DistanceMeters><Calories>${SUMMARY.calories}</Calories><Track>${tps}</Track></Lap><Notes>Bishan Park Tempo</Notes></Activity></Activities></TrainingCenterDatabase>`
);
console.log('GPX, FIT and TCX fixtures written to', here);
