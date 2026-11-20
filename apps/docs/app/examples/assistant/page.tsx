import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/metadata';
import { Assistant } from './assistant';

export const metadata: Metadata = pageMetadata({
  title: 'Lab assistant',
  description:
    'A chat for bench engineers that answers with charts, checks and tables, built with dtheo/ui in the Deep space preset. Scripted demo; no model is called.',
  path: '/examples/assistant',
  ownCard: true,
});

export default function Page() {
  return <Assistant />;
}
