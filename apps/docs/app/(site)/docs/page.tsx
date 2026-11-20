import { DocPage } from '@/components/doc-page';
import { Onboarding } from '@/components/onboarding';
import { pageMetadata } from '@/lib/metadata';

export const metadata = pageMetadata({
  title: 'Get started',
  description: 'Pick what you are building and who writes the code. Get one command.',
  path: '/docs',
  markdown: '/docs/index.md',
});

export default function Introduction() {
  return (
    <DocPage
      eyebrow="Get started"
      title="Let’s set you up"
      description="Three taps, one command."
      markdownHref="/docs/index.md"
    >
      <Onboarding />
    </DocPage>
  );
}
