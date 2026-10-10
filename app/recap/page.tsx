import type { Metadata } from 'next';
import { RecapStudio } from '@/components/recap/RecapStudio';

export const metadata: Metadata = {
  title: 'Recap',
  alternates: { canonical: '/recap' },
  description: 'Combine a month or a year of runs into one poster: total distance, time, climb and every route.',
};

export default function RecapPage() {
  return <RecapStudio />;
}
