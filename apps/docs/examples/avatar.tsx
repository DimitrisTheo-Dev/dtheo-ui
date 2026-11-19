'use client';

import { Avatar } from '@dtheo/ui/components/avatar';

const people = [
  { name: 'Maya Okafor', role: 'Owner, R-0412' },
  { name: 'Jonas Lindqvist Jr.', role: 'Reviewer' },
  { name: 'Élodie Marchand', role: 'Approver, gains' },
];

const reviewers = ['Maya Okafor', 'Jonas Lindqvist Jr.', 'Élodie Marchand', 'Søren Ågaard', 'Priya'];

export default function AvatarExample() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {people.map((p) => (
          <li key={p.name} className="flex items-center gap-2.5">
            {/* Initials skip suffixes like "Jr." and keep accented letters whole. */}
            <Avatar name={p.name} className="size-8" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body font-medium">{p.name}</span>
              <span className="truncate text-caption text-muted-foreground">{p.role}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <div className="flex -space-x-1">
          {reviewers.slice(0, 4).map((name) => (
            <Avatar key={name} name={name} className="size-8 ring-2 ring-card" />
          ))}
        </div>
        <span className="text-label font-normal text-muted-foreground">
          {reviewers.length} reviewers on the Bench 3 retune
        </span>
      </div>
    </div>
  );
}
