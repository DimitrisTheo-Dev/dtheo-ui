import { components } from '@dtheo/ui/meta';

/** How many components and charts the contracts define, for copy that states the number instead of typing it. */
export const componentCount = components.filter((c) => c.package === 'ui').length;
export const chartCount = components.filter((c) => c.package === 'charts').length;

/** "36 components and 8 charts" */
export const countLabel = `${componentCount} components and ${chartCount} charts`;
