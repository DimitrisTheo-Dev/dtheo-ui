import { components } from '@dtheo/ui/meta';

/**
 * Which templates and pages use which components. This is the "used in" graph shown on every component page
 * and on the Atomic design page: before changing a component, see what it touches. The data is generated from
 * imports by scripts/gen-usage.mjs, so it cannot drift from the code.
 */
export { pageUsage } from './usage-data';
import { pageUsage } from './usage-data';

export function usedIn(slug: string) {
  const pages = Object.values(pageUsage).filter((p) => p.uses.includes(slug));
  const composedBy = components.filter((c) => c.registryDependencies.includes(slug));
  return { pages, composedBy };
}
