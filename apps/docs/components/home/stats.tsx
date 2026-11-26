import { components } from '@dtheo/ui/meta';
import { ruleList } from 'dtheo/check';
import { mcpTools } from '@/lib/agents';

/** The value in three numbers, counted from the source rather than typed in. Contrast has its own tile. */
export function Stats() {
  const stats: Array<[string, string]> = [
    [String(components.filter((c) => c.package === 'ui').length), 'components'],
    [String(mcpTools.length), 'MCP tools for agents'],
    [String(ruleList.length), 'design-check rules'],
  ];
  return (
    <dl className="grid grid-cols-3 gap-y-6">
      {stats.map(([value, label]) => (
        <div key={label} className="flex flex-col gap-0.5 border-l border-border pl-4">
          <dt className="order-2 text-label font-normal text-muted-foreground">{label}</dt>
          <dd className="order-1 text-title-1 tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
