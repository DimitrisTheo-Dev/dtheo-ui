import { DocPage } from '@/components/doc-page';
import { Onboarding } from '@/components/onboarding';

export const metadata = {
  title: 'Get started',
  description: 'Pick what you are building and who writes the code. Get one command.',
  alternates: { canonical: '/docs', types: { 'text/markdown': '/docs/index.md' } },
};

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
