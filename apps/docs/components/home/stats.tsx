import { components } from '@dtheo/ui/meta';
import contrast from '@dtheo/tokens/contrast.json';
import { ruleList } from 'dtheo/check';
import { mcpTools } from '@/lib/agents';

/** The value in five numbers, each counted from the source rather than typed in. */
export function Stats() {
  const stats: Array<[string, string]> = [
    [String(components.filter((c) => c.package === 'ui').length), 'components'],
    [String(components.filter((c) => c.package === 'charts').length), 'engineering charts'],
    [String(mcpTools.length), 'MCP tools for agents'],
    [String(ruleList.length), 'design-check rules'],
    [`${contrast.filter((r) => r.ok).length}/${contrast.length}`, 'contrast pairs pass AA'],
  ];
  return (
    <dl className="grid grid-cols-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map(([value, label]) => (
        <div key={label} className="flex flex-col gap-0.5 border-l border-border pl-4">
          <dt className="order-2 text-label font-normal text-muted-foreground">{label}</dt>
          <dd className="order-1 text-title-1 tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
