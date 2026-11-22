import { DocPage } from '@/components/doc-page';
import { Onboarding } from '@/components/onboarding';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Introduction',
  description: 'Pick what you are building and who writes the code, then copy the commands for your setup.',
  path: '/docs',
  markdown: '/docs/index.md',
});

export default function Introduction() {
  return (
    <DocPage
      eyebrow="Get started"
      title="Introduction"
      description="Two choices, then the commands for your setup."
      markdownHref="/docs/index.md"
    >
      <Onboarding />
    </DocPage>
  );
}
