import type { Metadata } from 'next';
import { Gallery } from '@/components/gallery/Gallery';

export const metadata: Metadata = {
  title: 'Gallery',
  // Private per-user page: keep it out of search results.
  robots: { index: false, follow: false },
  description: 'Every running poster you have exported with RyannPace.',
};

export default function GalleryPage() {
  return <Gallery />;
}
