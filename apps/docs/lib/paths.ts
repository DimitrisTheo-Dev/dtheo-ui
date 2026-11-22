/** Charts have their own docs section; every other component is under /docs/components. */
export const docsSection = (meta: { package?: string } | undefined) =>
  meta?.package === 'charts' ? 'charts' : 'components';

/** A component's docs page: /docs/charts/line-chart, /docs/components/button. */
export const docsPath = (meta: { package?: string; slug: string }) => `/docs/${docsSection(meta)}/${meta.slug}`;
