'use client';

import * as React from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { Button } from '@dtheo/ui/components/button';
import { Field, FieldLabel } from '@dtheo/ui/components/field';
import { Input } from '@dtheo/ui/components/input';
import { InputGroup, InputGroupAddon } from '@dtheo/ui/components/input-group';
import { Kbd } from '@dtheo/ui/components/kbd';

export default function InputGroupExample() {
  const [query, setQuery] = React.useState('');
  const searchRef = React.useRef<HTMLInputElement>(null);

  // "/" focuses the search field, unless the user is already typing somewhere.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key !== '/' || target.closest('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Field>
        <FieldLabel>Search runs</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <Input
            ref={searchRef}
            value={query}
            onValueChange={setQuery}
            placeholder="Run, bench or operator"
          />
          {query ? (
            <Button variant="ghost" size="icon-xs" aria-label="Clear search" onClick={() => setQuery('')}>
              <XIcon aria-hidden="true" />
            </Button>
          ) : (
            <InputGroupAddon>
              <Kbd>/</Kbd>
            </InputGroupAddon>
          )}
        </InputGroup>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>Torque limit</FieldLabel>
          <InputGroup>
            <Input defaultValue="12.0" inputMode="decimal" className="tabular-nums" />
            <InputGroupAddon>N·m</InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel>Settling target</FieldLabel>
          <InputGroup>
            <Input defaultValue="250" inputMode="numeric" className="tabular-nums" />
            <InputGroupAddon>ms</InputGroupAddon>
          </InputGroup>
        </Field>
      </div>
    </div>
  );
}
