import type { Metadata } from 'next';
import { PrivacyContent } from '@/components/legal/PrivacyContent';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  alternates: { canonical: '/privacy' },
  description: 'What data RyannPace handles, why, and how to delete it.',
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
