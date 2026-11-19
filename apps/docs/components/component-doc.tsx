import * as React from 'react';
import Link from 'next/link';
import { CheckIcon, XIcon } from 'lucide-react';
import type { ComponentMeta } from '@dtheo/ui/meta';
import { Kbd } from '@dtheo/ui/components/kbd';
import { DocPage, DocSection, type TocItem } from './doc-page';
import { CommandTabs } from './command-tabs';
import { Preview } from './preview';
import { exampleSource } from '@/lib/source';
import { highlight } from '@/lib/highlight';
import { installCommand, shadcnCommand, site } from '@/lib/site';
import { usedIn } from '@/lib/usage';

/** `code` spans in contract text, rendered as code. Keyed by character offset: the text never reorders. */
function Inline({ text }: { text: string }) {
  let offset = 0;
  return text
    .split(/(`[^`]+`)/g)
    .filter(Boolean)
    .map((part) => {
      const at = offset;
      offset += part.length;
      return part.startsWith('`') && part.endsWith('`') ? (
        <code key={at} className="inline-code">
          {part.slice(1, -1)}
        </code>
      ) : (
        <React.Fragment key={at}>{part}</React.Fragment>
      );
    });
}

/** A union of literals reads better as chips than as one wrapped string. */
function TypeCell({ type }: { type: string }) {
  const parts = type.split(/\s*\|\s*/);
  if (parts.length < 2 || !parts.every((p) => /^'[^']*'$/.test(p)))
    return <code className="font-mono text-caption text-muted-foreground">{type}</code>;
  return (
    <span className="flex flex-wrap gap-1">
      {parts.map((p) => (
        <code key={p} className="rounded-item bg-muted px-1 font-mono text-caption text-muted-foreground">
          {p.slice(1, -1)}
        </code>
      ))}
    </span>
  );
}

async function ExampleBlock({ id, title, first }: { id: string; title?: string; first?: boolean }) {
  const source = exampleSource(id);
  const html = await highlight(source, 'tsx');
  return (
    <Preview
      id={id}
      title={title}
      minHeight={first ? 280 : 200}
      codeHtml={
        <div
          className="max-h-[28rem] overflow-auto px-4 py-3.5"
          // dtheo-check-ignore-next-line (Shiki output for an example file in this repo; no user input)
          dangerouslySetInnerHTML={{ __html: html }}
        />
      }
    />
  );
}

const exampleTitle = (id: string, slug: string) =>
  id
    .replace(`${slug}-`, '')
    .replace(/-/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

function WhenToUse({ meta }: { meta: ComponentMeta }) {
  return (
    <DocSection title="When to use">
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <ul className="flex flex-col gap-2.5" aria-label="Use it for">
          {meta.use.map((u) => (
            <li key={u} className="flex gap-2.5 text-body">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-success-foreground" aria-hidden="true" />
              <span>
                <Inline text={u} />
              </span>
            </li>
          ))}
        </ul>
        {meta.avoid?.length ? (
          <ul className="flex flex-col gap-2.5" aria-label="Reach for something else">
            {meta.avoid.map((u) => (
              <li key={u} className="flex gap-2.5 text-body text-muted-foreground">
                <XIcon className="mt-0.5 size-4 shrink-0 text-destructive-foreground" aria-hidden="true" />
                <span>
                  <Inline text={u} />
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </DocSection>
  );
}

const baseUiSlug = (slug: string) =>
  slug === 'sheet' ? 'drawer' : slug === 'command' ? 'autocomplete' : slug;

function Api({ meta }: { meta: ComponentMeta }) {
  if (!meta.props?.length) return null;
  return (
    <DocSection title="API">
      <dl className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
        {meta.props.map((p) => (
          <div key={p.name} className="grid gap-x-6 gap-y-1.5 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <dt className="flex flex-col gap-1">
              <code className="font-mono text-label text-foreground">{p.name}</code>
              {p.default ? (
                <span className="font-mono text-caption text-subtle-foreground">= {p.default}</span>
              ) : null}
            </dt>
            <dd className="flex min-w-0 flex-col gap-1.5">
              <span className="text-body text-muted-foreground">{p.description}</span>
              <TypeCell type={p.type} />
            </dd>
          </div>
        ))}
      </dl>
      {meta.primitive ? (
        <p className="text-label font-normal text-muted-foreground">
          Other props pass through to Base UI’s{' '}
          <a className="docs-link" href={`https://base-ui.com/react/components/${baseUiSlug(meta.slug)}`}>
            {meta.primitive}
          </a>
          .
        </p>
      ) : null}
    </DocSection>
  );
}

function Keyboard({ meta }: { meta: ComponentMeta }) {
  if (!meta.keyboard?.length && !meta.a11y?.length) return null;
  return (
    <DocSection title={meta.keyboard?.length ? 'Keyboard' : 'Accessibility'}>
      {meta.keyboard?.length ? (
        <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-[12rem_minmax(0,1fr)]">
          {meta.keyboard.map(([keys, action]) => (
            <React.Fragment key={keys}>
              <dt className="flex flex-wrap gap-1">
                {keys.split(' / ').map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </dt>
              <dd className="text-body text-muted-foreground max-sm:pb-2">{action}</dd>
            </React.Fragment>
          ))}
        </dl>
      ) : null}
      {meta.a11y?.length ? (
        <ul className="flex flex-col gap-2 border-t border-border pt-4 text-body text-muted-foreground">
          {meta.a11y.map((a) => (
            <li key={a}>
              <Inline text={a} />
            </li>
          ))}
        </ul>
      ) : null}
    </DocSection>
  );
}

function UsedIn({ slug }: { slug: string }) {
  const { pages, composedBy } = usedIn(slug);
  const links = [
    ...pages.map((p) => ({ href: p.href, title: p.title })),
    ...composedBy.map((c) => ({
      href: `/docs/${c.package === 'charts' ? 'charts' : 'components'}/${c.slug}`,
      title: c.title,
    })),
  ];
  return (
    <DocSection title="Used in">
      <div className="flex flex-wrap gap-2">
        {links.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="inline-flex h-7 items-center rounded-full border border-border bg-card px-3 text-label font-normal text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            {p.title}
          </Link>
        ))}
        {links.length ? null : <p className="text-body text-muted-foreground">Not used by an example yet.</p>}
      </div>
    </DocSection>
  );
}

/**
 * The template every component page shares, read top to bottom in the order people need it: what it is, how to
 * get it, what it looks like, when to use it, then the details. All content comes from the component contract.
 */
export async function ComponentDoc({ meta }: { meta: ComponentMeta }) {
  const base = meta.package === 'charts' ? 'charts' : 'components';
  const md = `/docs/${base}/${meta.slug}.md`;
  const [first, ...rest] = meta.examples;
  const prompt = `Use the ${site.name} design system. Add ${meta.title} with \`${installCommand(meta.slug)}\`, then follow its contract at ${site.url}${md}.`;
  const sections: Array<[string, string, boolean]> = [
    ['preview', 'Preview', true],
    ['when-to-use', 'When to use', true],
    ['examples', 'Examples', rest.length > 0],
    ['api', 'API', Boolean(meta.props?.length)],
    meta.keyboard?.length
      ? ['keyboard', 'Keyboard', true]
      : ['accessibility', 'Accessibility', Boolean(meta.a11y?.length)],
    ['used-in', 'Used in', true],
  ];
  const toc: TocItem[] = sections.filter(([, , shown]) => shown).map(([id, title]) => ({ id, title }));

  return (
    <DocPage
      eyebrow={meta.category}
      title={meta.title}
      description={meta.description}
      markdownHref={md}
      prompt={prompt}
      toc={toc}
      lead={
        <CommandTabs
          label="Install with"
          ways={[
            { value: 'cli', label: 'CLI', text: installCommand(meta.slug) },
            { value: 'shadcn', label: 'shadcn', text: shadcnCommand(meta.slug) },
            { value: 'agent', label: 'Agent', text: prompt, prose: true },
          ]}
        />
      }
    >
      <div id="preview" className="scroll-mt-20">
        {first ? <ExampleBlock id={first} first /> : null}
      </div>
      <WhenToUse meta={meta} />
      {rest.length ? (
        <DocSection title="Examples">
          <div className="flex flex-col gap-8">
            {rest.map((id) => (
              <ExampleBlock key={id} id={id} title={exampleTitle(id, meta.slug)} />
            ))}
          </div>
        </DocSection>
      ) : null}
      <Api meta={meta} />
      <Keyboard meta={meta} />
      <UsedIn slug={meta.slug} />
    </DocPage>
  );
}
