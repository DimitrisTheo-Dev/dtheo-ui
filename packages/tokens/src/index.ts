// dtheo-check-disable-file raw-color -- this file is where the color values are defined.
/**
 * dtheo/ui design tokens. This file is the single source of truth.
 * `pnpm tokens` turns it into CSS custom properties, DTCG JSON, React Native values and Figma variables,
 * and refuses to build when a declared text/background pair misses WCAG AA.
 *
 * Color roles follow the shadcn/ui vocabulary (agents already know `bg-background`, `text-muted-foreground`),
 * extended with status roles, a third text tier, chart roles and selection.
 */

export type Mode = 'light' | 'dark';

export const colorRoles = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'primary-hover',
  'link',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'subtle-foreground',
  'accent',
  'accent-foreground',
  'selection',
  'destructive',
  'destructive-foreground',
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'info',
  'info-foreground',
  'border',
  'border-strong',
  'input',
  'ring',
  'overlay',
  'sidebar',
  'sidebar-foreground',
  'sidebar-accent',
  'sidebar-border',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-muted',
  'chart-grid',
  'chart-axis',
] as const;

export type ColorRole = (typeof colorRoles)[number];
export type ColorScheme = Record<ColorRole, string>;

export interface Geometry {
  /** Buttons, inputs, menu items */
  'radius-control': string;
  /** Popovers, menus, small surfaces */
  'radius-popover': string;
  /** Cards, panels, grouped boxes */
  'radius-card': string;
  /** Dialogs, sheets, windows */
  'radius-dialog': string;
  /** Backdrop blur for translucent materials (sidebar, popovers). `0px` disables glass. */
  'material-blur': string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  modes: Partial<Record<Mode, ColorScheme>>;
  geometry: Geometry;
}

const graphiteDark: ColorScheme = {
  background: 'oklch(0.205 0.003 265)',
  foreground: 'oklch(0.955 0.002 265)',
  card: 'oklch(0.238 0.003 265)',
  'card-foreground': 'oklch(0.955 0.002 265)',
  popover: 'oklch(0.268 0.004 265)',
  'popover-foreground': 'oklch(0.955 0.002 265)',
  primary: 'oklch(0.555 0.205 257)',
  'primary-foreground': 'oklch(1 0 0)',
  'primary-hover': 'oklch(0.595 0.2 257)',
  // Primary as text: lighter than the fill so it reads on dark surfaces.
  link: 'oklch(0.74 0.14 252)',
  secondary: 'oklch(1 0 0 / 0.1)',
  'secondary-foreground': 'oklch(0.955 0.002 265)',
  muted: 'oklch(1 0 0 / 0.055)',
  'muted-foreground': 'oklch(0.76 0.004 265)',
  'subtle-foreground': 'oklch(0.7 0.005 265)',
  accent: 'oklch(1 0 0 / 0.075)',
  'accent-foreground': 'oklch(0.955 0.002 265)',
  selection: 'oklch(0.62 0.17 257 / 0.26)',
  destructive: 'oklch(0.58 0.2 25)',
  'destructive-foreground': 'oklch(0.76 0.15 22)',
  success: 'oklch(0.74 0.18 148)',
  'success-foreground': 'oklch(0.8 0.17 148)',
  warning: 'oklch(0.8 0.15 72)',
  'warning-foreground': 'oklch(0.83 0.14 75)',
  info: 'oklch(0.7 0.13 245)',
  'info-foreground': 'oklch(0.78 0.11 245)',
  border: 'oklch(1 0 0 / 0.085)',
  'border-strong': 'oklch(1 0 0 / 0.15)',
  input: 'oklch(1 0 0 / 0.36)',
  // Lighter than primary so the 2px focus line clears 3:1 on the lit segment of a segmented control.
  ring: 'oklch(0.72 0.15 257)',
  overlay: 'oklch(0 0 0 / 0.5)',
  sidebar: 'oklch(0.235 0.004 265 / 0.78)',
  'sidebar-foreground': 'oklch(0.955 0.002 265)',
  'sidebar-accent': 'oklch(1 0 0 / 0.1)',
  'sidebar-border': 'oklch(0 0 0 / 0.5)',
  'chart-1': 'oklch(0.68 0.16 252)',
  'chart-2': 'oklch(0.74 0.15 55)',
  'chart-3': 'oklch(0.72 0.12 180)',
  'chart-4': 'oklch(0.68 0.16 305)',
  'chart-5': 'oklch(0.75 0.14 120)',
  'chart-muted': 'oklch(0.6 0.004 265)',
  'chart-grid': 'oklch(1 0 0 / 0.06)',
  'chart-axis': 'oklch(1 0 0 / 0.16)',
};

const graphiteLight: ColorScheme = {
  background: 'oklch(0.975 0.002 265)',
  foreground: 'oklch(0.215 0.005 265)',
  card: 'oklch(1 0 0)',
  'card-foreground': 'oklch(0.215 0.005 265)',
  popover: 'oklch(0.995 0.001 265)',
  'popover-foreground': 'oklch(0.215 0.005 265)',
  primary: 'oklch(0.555 0.205 257)',
  'primary-foreground': 'oklch(1 0 0)',
  'primary-hover': 'oklch(0.515 0.2 257)',
  link: 'oklch(0.52 0.2 257)',
  secondary: 'oklch(0 0 0 / 0.055)',
  'secondary-foreground': 'oklch(0.215 0.005 265)',
  muted: 'oklch(0 0 0 / 0.035)',
  'muted-foreground': 'oklch(0.43 0.008 265)',
  'subtle-foreground': 'oklch(0.49 0.008 265)',
  accent: 'oklch(0 0 0 / 0.05)',
  'accent-foreground': 'oklch(0.215 0.005 265)',
  selection: 'oklch(0.6 0.17 257 / 0.16)',
  destructive: 'oklch(0.56 0.21 27)',
  'destructive-foreground': 'oklch(0.48 0.19 27)',
  success: 'oklch(0.62 0.17 148)',
  'success-foreground': 'oklch(0.46 0.12 150)',
  warning: 'oklch(0.75 0.16 70)',
  'warning-foreground': 'oklch(0.49 0.12 60)',
  info: 'oklch(0.6 0.15 250)',
  'info-foreground': 'oklch(0.47 0.15 255)',
  border: 'oklch(0 0 0 / 0.09)',
  'border-strong': 'oklch(0 0 0 / 0.15)',
  input: 'oklch(0 0 0 / 0.43)',
  ring: 'oklch(0.58 0.19 257)',
  overlay: 'oklch(0 0 0 / 0.25)',
  sidebar: 'oklch(0.945 0.003 265 / 0.8)',
  'sidebar-foreground': 'oklch(0.215 0.005 265)',
  'sidebar-accent': 'oklch(0 0 0 / 0.07)',
  'sidebar-border': 'oklch(0 0 0 / 0.1)',
  'chart-1': 'oklch(0.55 0.19 255)',
  'chart-2': 'oklch(0.66 0.17 50)',
  'chart-3': 'oklch(0.6 0.12 185)',
  'chart-4': 'oklch(0.55 0.2 305)',
  'chart-5': 'oklch(0.62 0.15 130)',
  'chart-muted': 'oklch(0.62 0.006 265)',
  'chart-grid': 'oklch(0 0 0 / 0.07)',
  'chart-axis': 'oklch(0 0 0 / 0.2)',
};

// Carbon: no hue in the interface at all. Surfaces, text and the primary action are neutral; the only colors left are
// status, links, the focus ring and the data in a chart. What Graphite does with one accent, Carbon does with none.
const carbonDark: ColorScheme = {
  ...graphiteDark,
  background: 'oklch(0.13 0 0)',
  foreground: 'oklch(0.97 0 0)',
  card: 'oklch(0.172 0 0)',
  'card-foreground': 'oklch(0.97 0 0)',
  popover: 'oklch(0.21 0 0)',
  'popover-foreground': 'oklch(0.97 0 0)',
  // The primary action is ink: the lightest thing on a dark screen, with dark type on it.
  primary: 'oklch(0.97 0 0)',
  'primary-foreground': 'oklch(0.17 0 0)',
  'primary-hover': 'oklch(0.87 0 0)',
  link: 'oklch(0.78 0.1 250)',
  'secondary-foreground': 'oklch(0.97 0 0)',
  'muted-foreground': 'oklch(0.76 0 0)',
  'subtle-foreground': 'oklch(0.69 0 0)',
  'accent-foreground': 'oklch(0.97 0 0)',
  // Selection is a neutral lift, not a tint. With no hue to help, it is as strong as the contrast checks on a
  // selected row allow: any stronger and status text on it drops below AA.
  selection: 'oklch(1 0 0 / 0.16)',
  border: 'oklch(1 0 0 / 0.1)',
  'border-strong': 'oklch(1 0 0 / 0.18)',
  input: 'oklch(1 0 0 / 0.38)',
  overlay: 'oklch(0 0 0 / 0.6)',
  // Opaque: Carbon has no glass.
  sidebar: 'oklch(0.105 0 0)',
  'sidebar-foreground': 'oklch(0.97 0 0)',
  'sidebar-accent': 'oklch(1 0 0 / 0.1)',
  'sidebar-border': 'oklch(1 0 0 / 0.08)',
  'chart-muted': 'oklch(0.6 0 0)',
};

const carbonLight: ColorScheme = {
  ...graphiteLight,
  background: 'oklch(0.965 0 0)',
  foreground: 'oklch(0.18 0 0)',
  card: 'oklch(1 0 0)',
  'card-foreground': 'oklch(0.18 0 0)',
  popover: 'oklch(1 0 0)',
  'popover-foreground': 'oklch(0.18 0 0)',
  primary: 'oklch(0.2 0 0)',
  'primary-foreground': 'oklch(1 0 0)',
  'primary-hover': 'oklch(0.32 0 0)',
  link: 'oklch(0.5 0.17 257)',
  'secondary-foreground': 'oklch(0.18 0 0)',
  'muted-foreground': 'oklch(0.42 0 0)',
  'subtle-foreground': 'oklch(0.48 0 0)',
  'accent-foreground': 'oklch(0.18 0 0)',
  selection: 'oklch(0 0 0 / 0.1)',
  border: 'oklch(0 0 0 / 0.1)',
  'border-strong': 'oklch(0 0 0 / 0.17)',
  input: 'oklch(0 0 0 / 0.45)',
  sidebar: 'oklch(0.94 0 0)',
  'sidebar-foreground': 'oklch(0.18 0 0)',
  'sidebar-accent': 'oklch(0 0 0 / 0.07)',
  'sidebar-border': 'oklch(0 0 0 / 0.1)',
  'chart-muted': 'oklch(0.62 0 0)',
};

export const presets: Preset[] = [
  {
    id: 'graphite',
    name: 'Graphite',
    description:
      'Native, neutral and calm. Mac-like materials, system blue, color only where attention is needed.',
    modes: { light: graphiteLight, dark: graphiteDark },
    geometry: {
      'radius-control': '6px',
      'radius-popover': '8px',
      'radius-card': '10px',
      'radius-dialog': '12px',
      'material-blur': '24px',
    },
  },
  {
    id: 'carbon',
    name: 'Carbon',
    description:
      'No hue in the interface: neutral surfaces, an ink primary, tight corners, no glass. The only colors are status, links, focus and data.',
    modes: { light: carbonLight, dark: carbonDark },
    geometry: {
      'radius-control': '4px',
      'radius-popover': '6px',
      'radius-card': '8px',
      'radius-dialog': '10px',
      'material-blur': '0px',
    },
  },
];

/** Mode-independent tokens: type, motion, controls, elevation. */
export const foundation = {
  font: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif',
    mono: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  },
  /** [size, line-height, letter-spacing, weight]. Tracking tightens as size grows, as Apple's tables do. */
  text: {
    caption: ['11px', '14px', '0.005em', '400'],
    label: ['12px', '16px', '0em', '500'],
    body: ['13px', '18px', '-0.003em', '400'],
    callout: ['14px', '20px', '-0.006em', '400'],
    prose: ['15px', '24px', '-0.009em', '400'],
    headline: ['15px', '20px', '-0.012em', '600'],
    'title-3': ['17px', '22px', '-0.016em', '600'],
    'title-2': ['20px', '25px', '-0.018em', '650'],
    'title-1': ['24px', '30px', '-0.02em', '650'],
    'large-title': ['32px', '38px', '-0.024em', '700'],
    display: ['44px', '48px', '-0.03em', '680'],
  },
  control: {
    xs: '22px',
    sm: '24px',
    md: '28px',
    lg: '32px',
    /** Coarse pointers get at least this height for primary controls. */
    touch: '36px',
  },
  ease: {
    out: 'cubic-bezier(0.23, 1, 0.32, 1)',
    'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
    drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
  },
  duration: {
    press: '120ms',
    hover: '150ms',
    popover: '180ms',
    dialog: '240ms',
    toast: '400ms',
  },
  shadow: {
    light: {
      raised: '0 0.5px 1px oklch(0 0 0 / 0.12), 0 1px 2px oklch(0 0 0 / 0.06)',
      popover:
        '0 0 0 0.5px oklch(0 0 0 / 0.12), 0 8px 24px oklch(0 0 0 / 0.12), 0 2px 6px oklch(0 0 0 / 0.06)',
      dialog:
        '0 0 0 0.5px oklch(0 0 0 / 0.14), 0 24px 64px oklch(0 0 0 / 0.2), 0 4px 12px oklch(0 0 0 / 0.08)',
    },
    dark: {
      raised: 'inset 0 0.5px 0 oklch(1 0 0 / 0.1), 0 1px 2px oklch(0 0 0 / 0.4)',
      popover:
        'inset 0 0 0 1px oklch(1 0 0 / 0.1), 0 0 0 0.5px oklch(0 0 0 / 0.8), 0 12px 32px oklch(0 0 0 / 0.5)',
      dialog:
        'inset 0 0 0 1px oklch(1 0 0 / 0.1), 0 0 0 0.5px oklch(0 0 0 / 0.8), 0 28px 80px oklch(0 0 0 / 0.6)',
    },
  },
} as const;

/** How a pair reads in reports: "muted-foreground on card", or "ring on ring 12 % over card" for a tinted layer. */
export function pairLabel(p: { fg: string; bg: string; tint?: number; over?: string | string[] }) {
  // Every surface rests on `background`, so only the layers between it and `bg` tell two pairs apart.
  const under = [p.over ?? []].flat().filter((o) => o !== 'background');
  const tint = p.tint === undefined ? '' : ` ${Math.round(p.tint * 100)} %`;
  return `${p.fg} on ${p.bg}${tint}${under.map((o) => ` over ${o}`).join('')}`;
}

/** Foreground/background pairs that must meet WCAG AA. `min` is the required ratio. */
export const contrastPairs: Array<{
  fg: ColorRole | 'white';
  bg: ColorRole;
  /** The surface(s) under `bg`, nearest first, all resting on `background`: ['selection', 'card']. */
  over?: ColorRole | ColorRole[];
  /** Draw `bg` at this opacity (a status badge is its role at 15 %). */
  tint?: number;
  /** Check only these modes, for a combination the UI draws in one mode only. Default: every mode. */
  modes?: Mode[];
  min: number;
  note: string;
}> = [
  { fg: 'foreground', bg: 'background', min: 4.5, note: 'Body text' },
  { fg: 'card-foreground', bg: 'card', over: 'background', min: 4.5, note: 'Text on cards' },
  { fg: 'popover-foreground', bg: 'popover', over: 'background', min: 4.5, note: 'Text in menus' },
  { fg: 'muted-foreground', bg: 'background', min: 4.5, note: 'Secondary text' },
  { fg: 'muted-foreground', bg: 'card', over: 'background', min: 4.5, note: 'Secondary text on cards' },
  { fg: 'muted-foreground', bg: 'popover', over: 'background', min: 4.5, note: 'Secondary text in menus' },
  { fg: 'subtle-foreground', bg: 'background', min: 4.5, note: 'Tertiary text, captions' },
  { fg: 'subtle-foreground', bg: 'card', over: 'background', min: 4.5, note: 'Tertiary text on cards' },
  { fg: 'secondary-foreground', bg: 'secondary', over: 'card', min: 4.5, note: 'Secondary button label' },
  {
    fg: 'primary-foreground',
    bg: 'primary',
    min: 4.5,
    note: 'Primary button label, and the label and hint of a highlighted menu row',
  },
  { fg: 'white', bg: 'destructive', min: 4.5, note: 'Destructive button label' },
  { fg: 'destructive-foreground', bg: 'card', over: 'background', min: 4.5, note: 'Error text' },
  { fg: 'success-foreground', bg: 'card', over: 'background', min: 4.5, note: 'Success text' },
  { fg: 'warning-foreground', bg: 'card', over: 'background', min: 4.5, note: 'Warning text' },
  { fg: 'info-foreground', bg: 'card', over: 'background', min: 4.5, note: 'Info text' },
  { fg: 'foreground', bg: 'selection', over: 'card', min: 4.5, note: 'Selected row text' },
  {
    fg: 'destructive-foreground',
    bg: 'selection',
    over: 'card',
    min: 4.5,
    note: 'A value over its limit in a checked table row',
  },
  {
    fg: 'warning-foreground',
    bg: 'selection',
    over: 'card',
    min: 4.5,
    note: 'A value near its limit in a checked table row',
  },
  {
    fg: 'muted-foreground',
    bg: 'selection',
    over: 'card',
    min: 4.5,
    note: 'Secondary text in a checked table row',
  },
  { fg: 'sidebar-foreground', bg: 'sidebar', over: 'background', min: 4.5, note: 'Sidebar text' },
  { fg: 'input', bg: 'card', over: 'background', min: 3, note: 'Field boundary (non-text, 1.4.11)' },
  { fg: 'ring', bg: 'background', min: 3, note: 'Focus ring (non-text)' },
  // The focus line against everything it touches: the surface, and its own halo (the ring at 12 %) on that surface.
  // Inside a segmented track the line sits on the segment's edge, next to the track and the lit segment.
  { fg: 'ring', bg: 'card', over: 'background', min: 3, note: 'Focus ring on a card' },
  { fg: 'ring', bg: 'sidebar', over: 'background', min: 3, note: 'Focus ring in the sidebar' },
  { fg: 'ring', bg: 'secondary', over: 'card', min: 3, note: 'Focus ring in a segmented track' },
  {
    fg: 'ring',
    bg: 'foreground',
    tint: 0.15,
    over: ['secondary', 'card'],
    modes: ['dark'],
    min: 3,
    note: 'Focus ring on the lit segment (dark draws it as foreground at 15 %; light uses card)',
  },
  { fg: 'ring', bg: 'selection', over: 'card', min: 3, note: 'Focus ring on a selected row' },
  { fg: 'ring', bg: 'ring', tint: 0.12, min: 3, note: 'Focus ring against its halo' },
  { fg: 'ring', bg: 'ring', tint: 0.12, over: 'card', min: 3, note: 'Focus ring against its halo on a card' },
  {
    fg: 'ring',
    bg: 'ring',
    tint: 0.12,
    over: 'popover',
    min: 3,
    note: 'Focus ring against its halo in a popover',
  },
  {
    fg: 'ring',
    bg: 'ring',
    tint: 0.12,
    over: 'sidebar',
    min: 3,
    note: 'Focus ring against its halo in the sidebar',
  },
  {
    fg: 'ring',
    bg: 'ring',
    tint: 0.12,
    over: ['secondary', 'card'],
    min: 3,
    note: 'Focus ring against its halo in a segmented track',
  },
  {
    fg: 'ring',
    bg: 'ring',
    tint: 0.12,
    over: ['selection', 'card'],
    min: 3,
    note: 'Focus ring against its halo on a selected row',
  },
  { fg: 'chart-1', bg: 'card', over: 'background', min: 3, note: 'Primary series (graphical object)' },
  { fg: 'link', bg: 'background', min: 4.5, note: 'Links and primary-tinted text' },
  { fg: 'link', bg: 'card', over: 'background', min: 4.5, note: 'Links on cards' },
  { fg: 'link', bg: 'popover', over: 'background', min: 4.5, note: 'Links in menus' },
  { fg: 'subtle-foreground', bg: 'secondary', over: 'card', min: 4.5, note: 'Captions on a filled control' },
  {
    fg: 'subtle-foreground',
    bg: 'sidebar-accent',
    over: 'sidebar',
    min: 4.5,
    note: 'Counts on the active sidebar item',
  },
  {
    fg: 'destructive-foreground',
    bg: 'destructive',
    tint: 0.15,
    over: ['selection', 'card'],
    min: 4.5,
    note: 'Error badge on a selected row',
  },
  {
    fg: 'success-foreground',
    bg: 'success',
    tint: 0.15,
    over: ['selection', 'card'],
    min: 4.5,
    note: 'Success badge on a selected row',
  },
  {
    fg: 'warning-foreground',
    bg: 'warning',
    tint: 0.15,
    over: ['selection', 'card'],
    min: 4.5,
    note: 'Warning badge on a selected row',
  },
  {
    fg: 'info-foreground',
    bg: 'info',
    tint: 0.15,
    over: ['selection', 'card'],
    min: 4.5,
    note: 'Info badge on a selected row',
  },
];
