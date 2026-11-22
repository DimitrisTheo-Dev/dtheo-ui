import { DocPage } from '@/components/doc-page';
import { ComponentGallery } from '@/components/component-gallery';
import { pageMetadata } from '@/lib/metadata';
import { countLabel } from '@/lib/counts';

export const metadata = pageMetadata({
  title: 'Components',
  description: `All ${countLabel}, live.`,
  path: '/docs/components',
  markdown: '/docs/components.md',
});

export default function ComponentsIndex() {
  return (
    <DocPage
      wide
      title="Components"
      description="Every component, running. Click around, then open one for its code."
      markdownHref="/docs/components.md"
    >
      <ComponentGallery />
    </DocPage>
  );
}
