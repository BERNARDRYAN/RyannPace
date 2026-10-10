import type { Metadata } from 'next';
import { Studio } from '@/components/studio/Studio';

export const metadata: Metadata = {
  title: 'Studio',
  alternates: { canonical: '/studio' },
  description: 'Drop in a GPX file and design an editorial running poster in seconds.',
};

export default function StudioPage() {
  return <Studio />;
}
