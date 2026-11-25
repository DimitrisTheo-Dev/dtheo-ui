'use client';

import * as React from 'react';
import { CircleCheckIcon, SendIcon } from 'lucide-react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@dtheo/ui/components/card';
import { Field, FieldDescription, FieldLabel } from '@dtheo/ui/components/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@dtheo/ui/components/select';
import { Switch } from '@dtheo/ui/components/switch';
import { Button } from '@dtheo/ui/components/button';

const events = [
  { id: 'deploy', label: 'A deploy fails', text: 'Right away, with the step that failed.', on: true },
  { id: 'review', label: 'A review is requested', text: 'Once per pull request, not per commit.', on: true },
  { id: 'summary', label: 'Weekly summary', text: 'Mondays at 09:00, in your time zone.', on: false },
];

const channels = [
  { value: 'releases', label: '#releases' },
  { value: 'engineering', label: '#engineering' },
  { value: 'alerts', label: '#alerts' },
];

/**
 * What the agent in the demo builds: an ordinary settings card, made only from the system's components. It works:
 * the switches and the channel picker respond, and saving confirms in place.
 */
export function HeroPreview() {
  const [saved, setSaved] = React.useState(false);
  const changed = () => setSaved(false);
  return (
    <Card className="min-w-0 overflow-hidden shadow-raised">
      <CardHeader>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* Under the page's h1, so the card takes the next level and the outline never skips one. */}
          <CardTitle level={2}>Notifications</CardTitle>
          <CardDescription>Choose what reaches your team, and where.</CardDescription>
        </div>
        <CardAction>
          <Button variant="ghost" size="icon-sm" aria-label="Send a test message">
            <SendIcon aria-hidden="true" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {events.map((e) => (
          <Field key={e.id}>
            <FieldLabel className="w-full items-center justify-between gap-4">
              {e.label}
              <Switch defaultChecked={e.on} onCheckedChange={changed} />
            </FieldLabel>
            <FieldDescription>{e.text}</FieldDescription>
          </Field>
        ))}
        <Field>
          <FieldLabel>Channel</FieldLabel>
          <Select items={channels} defaultValue="releases" onValueChange={changed}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {channels.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <span role="status" className="mr-auto flex items-center gap-1.5 text-label text-success-foreground">
          {saved ? (
            <>
              <CircleCheckIcon className="size-3.5" aria-hidden="true" />
              Saved
            </>
          ) : null}
        </span>
        <Button variant="primary" onClick={() => setSaved(true)}>
          Save changes
        </Button>
      </CardFooter>
    </Card>
  );
}
