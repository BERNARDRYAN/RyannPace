import type { Metadata } from 'next';
import { LandingContent } from '@/components/landing/LandingContent';

export const metadata: Metadata = {
  title: { absolute: 'RyannPace — Turn your runs into editorial posters' },
  description:
    'Drop in a GPX, FIT or TCX file from Strava, Garmin, Coros or Apple Watch and get a magazine-grade 9:16, 4:5 or 1:1 poster in seconds. Free, private, in your browser.',
};

export default function LandingPage() {
  return <LandingContent />;
}
