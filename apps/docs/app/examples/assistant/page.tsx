import type { Metadata } from 'next';
import { Assistant } from './assistant';

export const metadata: Metadata = {
  title: 'Lab assistant',
  description:
    'A chat for bench engineers that answers with charts, checks and tables, built with dtheo/ui in the Deep space preset. Scripted demo; no model is called.',
  alternates: { canonical: '/examples/assistant' },
};

export default function Page() {
  return <Assistant />;
}
