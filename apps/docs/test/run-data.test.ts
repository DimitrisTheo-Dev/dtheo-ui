// @vitest-environment jsdom
// The synthetic runs must read the same everywhere: an engineer who sees R-0412 settle in 203 ms on the landing page
// and 186 ms on a docs page stops trusting both. lib/lab-data.ts is the single source; this file checks the model
// states what the run review draws, and that every example, landing section and example app agrees with it.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { capability } from '@dtheo/charts';
import { Toaster } from '@dtheo/ui/components/toast';
import { examples } from '@/examples';
import { Assistant } from '@/app/examples/assistant/assistant';
import { RunHistory } from '@/app/examples/run-history/run-history';
import { RunReview } from '@/app/examples/run-review/run-review';
import { Tuning } from '@/app/examples/tuning/tuning';
import { Bento } from '@/components/home/bento';
import { HeroPreview } from '@/components/home/hero-preview';
import { DataTableDemo } from '@/components/patterns/data-table-demo';
import {
  CURRENT_LIMIT,
  DELAY,
  OVERSHOOT_LIMIT,
  RISE_LIMIT,
  SETTLE_LIMIT,
  TARGET,
  TEMP_LIMIT,
  TORQUE_LIMIT,
  WINDING_TEMP,
  bode,
  checkStatus,
  fmt,
  gains,
  measuredMetrics as M,
  overshootStats,
  referenceGains,
  referenceMetrics as R,
  runChecks,
  runHistory,
  runLog,
  runs,
} from '@/lib/lab-data';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }), usePathname: () => '/' }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}));

const docs = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- The model ----------

describe('the run review model', () => {
  it('states R-0412 the way the run review draws it', () => {
    // The canonical numbers. Change the simulation only on purpose, then update these and the PR that ships it.
    expect([TARGET, DELAY]).toEqual([12, 20]);
    expect(fmt.n1.format(M.peak)).toBe('14.1');
    expect(fmt.n1.format(M.overshoot)).toBe('17.6');
    expect(M.peakAt - DELAY).toBe(90);
    expect(M.rise).toBe(40);
    expect(M.settle).toBe(203);
    expect(fmt.n1.format(M.peakCurrent)).toBe('30.9');
    expect(fmt.n0.format((M.peakCurrent / CURRENT_LIMIT) * 100)).toBe('97');
    expect(fmt.n1.format(TORQUE_LIMIT)).toBe('13.2');
    expect([gains.kp, gains.ki, gains.kd, referenceGains.kp]).toEqual([4.2, 0.8, 0.06, 2.8]);
    // R-0409, the reference.
    expect(fmt.n1.format(R.overshoot)).toBe('3.9');
    expect(R.settle).toBe(174);
    expect(fmt.n1.format(R.peakCurrent)).toBe('27.2');
  });

  it('fails overshoot, warns on current and passes the rest', () => {
    expect(checkStatus(M.overshoot, OVERSHOOT_LIMIT)).toBe('fail');
    expect(checkStatus(M.peakCurrent, CURRENT_LIMIT)).toBe('warn');
    expect(checkStatus(M.settle, SETTLE_LIMIT)).toBe('pass');
    expect(checkStatus(M.rise, RISE_LIMIT)).toBe('pass');
    expect(checkStatus(WINDING_TEMP, TEMP_LIMIT)).toBe('pass');
  });

  it('keeps R-0412 and R-0409 in the history as the trace computes them', () => {
    const r0412 = runHistory.find((r) => r.id === 'R-0412')!;
    const r0409 = runHistory.find((r) => r.id === 'R-0409')!;
    expect([r0412.overshoot, r0412.settle, r0412.current]).toEqual([M.overshoot, M.settle, M.peakCurrent]);
    expect([r0412.kp, r0412.kd, r0412.temp]).toEqual([gains.kp, gains.kd, WINDING_TEMP]);
    expect([r0409.overshoot, r0409.settle, r0409.current]).toEqual([R.overshoot, R.settle, R.peakCurrent]);
    expect(r0409.kp).toBe(referenceGains.kp);
    expect(r0409.note).toBe('reference');
  });

  it('gives each history run a result its own checks explain, and notes that match its numbers', () => {
    for (const r of runHistory) {
      const checks = [
        checkStatus(r.overshoot, OVERSHOOT_LIMIT),
        checkStatus(r.settle, SETTLE_LIMIT),
        checkStatus(r.current, CURRENT_LIMIT),
        checkStatus(r.temp, TEMP_LIMIT),
      ];
      const expected = checks.includes('fail') ? 'fail' : checks.includes('warn') ? 'review' : 'pass';
      expect(r.result, r.id).toBe(expected);
      const kd = r.note?.match(/Kd (\d\.\d+)/);
      if (kd) expect(Number(kd[1]), `${r.id} note`).toBe(r.kd);
      const temp = r.note?.match(/winding (\d+(?:\.\d)?) °C/);
      if (temp) expect(Number(temp[1]), `${r.id} note`).toBe(r.temp);
    }
  });

  it('plots the history runs in the 412-run population with their own values', () => {
    expect(runs).toHaveLength(412);
    for (const r of runHistory) {
      const point = runs.find((p) => p.id === r.id)!;
      expect(point.kp, r.id).toBe(Number(r.kp.toFixed(2)));
      expect(point.overshoot, r.id).toBe(Number(r.overshoot.toFixed(1)));
    }
  });

  it('lists all 412 runs in the run log, newest first, agreeing with the population and the history', () => {
    expect(runLog).toHaveLength(runs.length);
    expect(new Set(runLog.map((r) => r.id)).size).toBe(runLog.length);
    // Run numbers count up with time.
    for (let i = 1; i < runLog.length; i++) {
      expect(runLog[i]!.id < runLog[i - 1]!.id, runLog[i]!.id).toBe(true);
      expect(runLog[i]!.startedAt < runLog[i - 1]!.startedAt, runLog[i]!.id).toBe(true);
    }
    // The history runs are the newest eight, unchanged; every other run keeps its plotted gain and overshoot.
    expect(runLog.slice(0, runHistory.length)).toEqual(runHistory);
    const point = new Map(runs.map((r) => [r.id, r]));
    for (const r of runLog) {
      expect(Number(r.kp.toFixed(2)), r.id).toBe(point.get(r.id)!.kp);
      expect(Number(r.overshoot.toFixed(1)), r.id).toBe(point.get(r.id)!.overshoot);
    }
  });

  it('gives every run in the log the result its five checks explain', () => {
    for (const r of runLog) {
      const s = runChecks.map((c) => checkStatus(r[c.key], c.limit));
      const result = s.includes('fail') ? 'fail' : s.includes('warn') ? 'review' : 'pass';
      expect(r.result, r.id).toBe(result);
    }
    // The run under review is the newest, on 4.18.2 on Bench 3, as its own page says.
    expect(runLog[0]).toMatchObject({
      id: 'R-0412',
      firmware: '4.18.2',
      bench: 'Bench 3',
      startedAt: '2026-11-18T14:32',
    });
  });

  it('states the capability the histogram computes: Cpk from σ within, Ppk from σ overall', () => {
    const c = capability(
      runs.map((r) => r.overshoot),
      undefined,
      OVERSHOOT_LIMIT,
    );
    expect(overshootStats.cpk).toBeCloseTo(c.cpk!, 10);
    expect(overshootStats.ppk).toBeCloseTo(c.ppk!, 10);
    expect([fmt.n2.format(overshootStats.cpk), fmt.n2.format(overshootStats.ppk)]).toEqual(['0.62', '0.56']);
    expect(overshootStats.over).toBe(14);
  });

  it('reads the Bode margins where the curves cross, not at the next grid point', () => {
    expect(fmt.n1.format(bode.margins.gainCrossover)).toBe('7.4');
    expect(fmt.n1.format(bode.margins.gainMargin)).toBe('26.7');
    expect(fmt.n0.format(bode.margins.phaseMargin)).toBe('48');
    expect(fmt.n1.format(bode.referenceMargins.gainCrossover)).toBe('5.4');
  });

  it('draws every run inside the charts that plot them all', () => {
    for (const file of ['histogram', 'scatter-chart', 'bar-chart']) {
      const source = readFileSync(join(docs, 'examples', `${file}.tsx`), 'utf8');
      const top = Number(source.match(/(?:yDomain|domain)=\{\[0, (\d+)\]\}/)![1]);
      expect(top, file).toBeGreaterThanOrEqual(overshootStats.max);
    }
  });
});

// ---------- What people read ----------

const render = (C: React.ComponentType) =>
  renderToStaticMarkup(React.createElement(Toaster, null, React.createElement(C)));

const surfaces: Array<[string, React.ComponentType]> = [
  ...Object.entries(examples).map(([id, C]) => [`examples/${id}`, C] as [string, React.ComponentType]),
  ['landing agent demo card', HeroPreview],
  ['landing tiles', Bento],
  ['run history', RunHistory],
  ['run review', RunReview],
  ['lab assistant', Assistant],
  ['loop tuning', Tuning],
  ['data table pattern', DataTableDemo],
];

const documents = surfaces.map(
  ([name, C]) => [name, new DOMParser().parseFromString(render(C), 'text/html')] as const,
);

const clean = (s: string) =>
  s
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Every piece of text on a surface: elements with their own text, plus labels a screen reader reads. */
function texts(doc: Document) {
  const out: string[] = [];
  for (const el of doc.body.querySelectorAll('*')) {
    if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
      out.push(clean(el.textContent!));
    for (const attr of ['aria-label', 'title', 'placeholder', 'value']) {
      const v = el.getAttribute(attr);
      if (v) out.push(clean(v));
    }
  }
  return out;
}

/** Split into sentences, and keep those about R-0412 alone: a sentence that names another run is about that run. */
const aboutR0412 = (text: string) => text.split(/(?<=[.;:])\s+/).filter((s) => !/R-0(?!412)\d{3}/.test(s));

const num = String.raw`(\d+(?:\.\d+)?)`;
const units = String.raw`(ms|%|A|°C|N·m)`;
const limits: Record<string, string[]> = {
  ms: [String(SETTLE_LIMIT), String(RISE_LIMIT)],
  '%': [String(OVERSHOOT_LIMIT)],
  A: [String(CURRENT_LIMIT)],
  '°C': [String(TEMP_LIMIT)],
  N·m: [fmt.n1.format(TORQUE_LIMIT)],
};
/** Every time R-0412's capture can mention: the step, rise, peak and settling, after the step or from the start. */
const times = new Set(
  [DELAY, M.rise, RISE_LIMIT, M.peakAt - DELAY, M.peakAt, M.settle, DELAY + M.settle, SETTLE_LIMIT].map(
    String,
  ),
);

const claims: Array<{ what: string; re: RegExp; allowed: (unit?: string) => string[] | Set<string> }> = [
  {
    what: 'time',
    // A time in a sentence about settling, outside a window such as “0–400 ms”.
    re: new RegExp(String.raw`(?=[^.]*(?:settl|±2 %))[^.]*?(?<![–\d.,])${num} ms\b`, 'gi'),
    allowed: () => times,
  },
  {
    what: 'peak torque',
    re: new RegExp(String.raw`\bpeak(?:s|ed)?(?: torque)?(?: at)? ${num} N·m`, 'gi'),
    allowed: () => [fmt.n1.format(M.peak)],
  },
  {
    what: 'step size',
    re: new RegExp(String.raw`${num} N·m (?:step|command|torque step)|step command 0 → ${num} N·m`, 'gi'),
    allowed: () => [String(TARGET)],
  },
  {
    what: 'peak current',
    re: new RegExp(String.raw`\bpeak(?:s|ed)?(?: phase)?(?: current)?(?: at)? ${num} A\b`, 'gi'),
    allowed: () => [fmt.n1.format(M.peakCurrent)],
  },
  {
    what: 'overshoot',
    re: new RegExp(String.raw`\bovershoo?t(?:s|ed)?(?: by| is| reached)? ${num} %|\b${num} % over\b`, 'gi'),
    allowed: () => [fmt.n1.format(M.overshoot)],
  },
  {
    what: 'limit',
    re: new RegExp(String.raw`(?:limit|≤),?(?: is)? \+?${num} ${units}|\b${num} ${units} limit\b`, 'gi'),
    allowed: (unit) => limits[unit!]!,
  },
];

/** What a sentence claims about R-0412 that the model does not say. */
function contradictions(where: string, sentence: string) {
  const wrong: string[] = [];
  for (const claim of claims)
    for (const m of sentence.matchAll(claim.re)) {
      const value = m.slice(1).find((g) => g !== undefined && /^\d/.test(g))!;
      const unit = m.slice(1).find((g) => g !== undefined && /^\D/.test(g));
      const allowed = claim.allowed(unit);
      if (!(allowed instanceof Set ? allowed.has(value) : allowed.includes(value)))
        wrong.push(`${where}: ${claim.what} ${value} in “${sentence}”`);
    }
  return wrong;
}

/** R-0412's acceptance checks: how a metric names each one, the value it shows and the limit it is held to. */
const r0412Checks = [
  { label: /overshoot/i, unit: '%', value: fmt.n1.format(M.overshoot), limit: OVERSHOOT_LIMIT },
  { label: /current/i, unit: 'A', value: fmt.n1.format(M.peakCurrent), limit: CURRENT_LIMIT },
  { label: /settl/i, unit: 'ms', value: fmt.n0.format(M.settle), limit: SETTLE_LIMIT },
  { label: /rise/i, unit: 'ms', value: fmt.n0.format(M.rise), limit: RISE_LIMIT },
  { label: /temp/i, unit: '°C', value: fmt.n1.format(WINDING_TEMP), limit: TEMP_LIMIT },
];
const r0412Surfaces = ['run review', 'lab assistant', 'examples/metric'];

describe('every surface that shows R-0412', () => {
  it('states its settling time, peak, step, current, overshoot and limits as the model does', () => {
    const wrong = documents.flatMap(([name, doc]) =>
      texts(doc).flatMap((t) => aboutR0412(t).flatMap((sentence) => contradictions(name, sentence))),
    );
    expect(wrong).toEqual([]);
  });

  it('says the same in text that only shows on interaction: menus, dialogs, sheets, closed panels', () => {
    // Read the copy straight from the source, as written; values filled in from lib/lab-data are skipped.
    const wrong = sources().flatMap((file) => {
      const text = readFileSync(join(docs, file), 'utf8')
        .replace(/^import .*$/gm, '')
        .replace(/&nbsp;|\\u00a0|\{' '\}/g, ' ')
        .replace(/\s+/g, ' ');
      return aboutR0412(text).flatMap((sentence) => contradictions(file, sentence));
    });
    expect(wrong).toEqual([]);
  });

  it('gives every check a status its value and limit agree with, drawn where the numbers say', () => {
    const wrong: string[] = [];
    const seen = new Set<string>();
    for (const [name, doc] of documents)
      for (const metric of doc.querySelectorAll<HTMLElement>('[data-slot="metric"]')) {
        const [labelEl, valueEl] = metric.children;
        const label = clean(labelEl!.textContent!);
        const shown = clean(valueEl!.firstChild!.textContent!);
        const value = Number(shown.replace(/,/g, ''));
        const unit = clean(valueEl!.textContent!.slice(valueEl!.firstChild!.textContent!.length));
        const status = metric.dataset.status!;
        const limitText = clean(metric.querySelector('.text-caption')?.textContent ?? '');
        const stated = limitText.match(/(≥|≤)? ?(\d+(?:\.\d+)?)/);
        const where = `${name}: ${label} ${shown} ${unit} (${limitText || 'no limit shown'}) is ${status}`;
        let bound = stated ? Number(stated[2]) : undefined;
        // R-0412's checks carry R-0412's numbers and limits, whether or not the limit is printed.
        if (r0412Surfaces.includes(name)) {
          const check = r0412Checks.find((c) => c.label.test(label) && c.unit === unit);
          if (!check) {
            wrong.push(`${where}: not one of R-0412's checks`);
            continue;
          }
          if (shown !== check.value) wrong.push(`${where}, the run says ${check.value} ${unit}`);
          if (bound !== undefined && bound !== check.limit)
            wrong.push(`${where}, the limit is ${check.limit} ${unit}`);
          bound = check.limit;
          seen.add(name);
        }
        if (bound === undefined || status === 'none') continue;
        if (stated?.[1] === '≥') {
          if (value < bound !== (status === 'fail')) wrong.push(where);
        } else if (checkStatus(value, bound) !== status)
          wrong.push(`${where}, should be ${checkStatus(value, bound)}`);
        // The meter's fill and limit tick sit where the value and the limit put them.
        const [fill, tick] = [...metric.querySelectorAll<HTMLElement>('[aria-hidden="true"] > span')].map(
          (el) => parseFloat(el.style.width || el.style.left),
        );
        if (
          fill !== undefined &&
          tick !== undefined &&
          fill < 100 &&
          Math.abs(fill / tick - value / bound) > 0.02
        )
          wrong.push(
            `${where}, but its meter is drawn at ${fill.toFixed(1)} % against a limit at ${tick.toFixed(1)} %`,
          );
      }
    expect([...seen].sort()).toEqual([...r0412Surfaces].sort());
    expect(wrong).toEqual([]);
  });

  it('lists every history run with the numbers and result the run review has', () => {
    const words: Record<string, string> = {
      Fail: 'fail',
      Failed: 'fail',
      Review: 'review',
      'Near limit': 'review',
      Pass: 'pass',
      Passed: 'pass',
    };
    const wrong: string[] = [];
    let rows = 0;
    for (const [name, doc] of documents)
      for (const table of doc.querySelectorAll('table')) {
        const heads = [...table.querySelectorAll('thead th')].map((th) => clean(th.textContent!));
        for (const tr of table.querySelectorAll('tbody tr')) {
          const cells = [...tr.querySelectorAll('td')].map((td) => clean(td.textContent!));
          const run = runHistory.find((r) => cells.includes(r.id));
          if (!run || cells.length !== heads.length) continue;
          rows++;
          heads.forEach((head, i) => {
            const cell = cells[i]!;
            const expected = /overshoot/i.test(head)
              ? fmt.n1.format(run.overshoot)
              : /settl/i.test(head)
                ? fmt.n0.format(run.settle)
                : /current/i.test(head)
                  ? fmt.n1.format(run.current)
                  : /^kp$/i.test(head)
                    ? fmt.n2.format(run.kp)
                    : null;
            if (expected !== null && cell.match(/[\d.]+/)?.[0] !== expected)
              wrong.push(`${name}: ${run.id} ${head} is ${cell}, the run says ${expected}`);
            if (/profile/i.test(head) && !cell.startsWith(run.profile))
              wrong.push(`${name}: ${run.id} profile is ${cell}, the run says ${run.profile}`);
            if (/result/i.test(head) && words[cell] !== run.result)
              wrong.push(`${name}: ${run.id} result is ${cell}, the run says ${run.result}`);
          });
        }
      }
    expect(rows).toBeGreaterThan(20);
    expect(wrong).toEqual([]);
  });

  it('names each run by its own profile', () => {
    const profiles = new Set([...runHistory.map((r) => r.profile), 'Damped step', 'Fast rise']);
    const wrong: string[] = [];
    const check = (where: string, text: string) => {
      for (const [, id, rest] of text.matchAll(/(R-0\d{3}) · ([^·,;"'`]+)/g)) {
        const named = [...profiles].find((p) => rest!.startsWith(p));
        const run = runHistory.find((r) => r.id === id);
        if (named && run && named !== run.profile)
          wrong.push(`${where}: ${id} · ${named}, the run is a ${run.profile}`);
      }
    };
    for (const [name, doc] of documents) for (const t of texts(doc)) check(name, t);
    for (const file of sources()) check(file, readFileSync(join(docs, file), 'utf8'));
    expect(wrong).toEqual([]);
  });
});

// ---------- The code people copy ----------

/** Example, landing and example-app sources: shown as code on docs pages and copied by `dtheo add`. */
function sources() {
  const walk = (dir: string): string[] =>
    readdirSync(join(docs, dir)).flatMap((f) => {
      const path = `${dir}/${f}`;
      return statSync(join(docs, path)).isDirectory() ? walk(path) : /\.tsx?$/.test(f) ? [path] : [];
    });
  return ['examples', 'components/home', 'components/patterns', 'app/examples'].flatMap(walk);
}

describe('example code', () => {
  it('imports R-0412’s numbers from lib/lab-data instead of typing them', () => {
    // Today’s values, and the contradicting ones they replaced.
    const typed = [
      /\b203\b/,
      /\b17\.6\b/,
      /\b14\.1\b/,
      /\b30\.9\b/,
      /\b71\.2\b/,
      /\b13\.2\b/,
      /\b186\b/,
      /\b182 ?ms\b/,
      /\b61 ?ms\b/,
      /\b9\.41\b/,
      /\b31\.2\b/,
      /\b37\.6\b/,
      /\b11\.2\b/,
      /\b8\.0(?: |&nbsp;)?N·m/,
      /R-0398/,
    ];
    const found = sources().flatMap((file) =>
      readFileSync(join(docs, file), 'utf8')
        .split('\n')
        .flatMap((line, i) => typed.filter((re) => re.test(line)).map((re) => `${file}:${i + 1} ${re}`)),
    );
    expect(found).toEqual([]);
  });
});
