// @ts-check
/// <reference types="@figma/plugin-typings" />

/**
 * Builds the dtheo/ui Figma library from the same token build that writes the CSS: color variables with a mode per
 * theme, geometry variables per preset, control heights, text and shadow styles, and the core components with
 * variants and auto-layout, every fill and radius bound to a variable. Run it again after a token change: it updates
 * its variables and styles in place, which the components follow, and leaves everything else in the file alone.
 *
 * `DTHEO_TOKENS` is packages/tokens/dist/tokens.json, inlined ahead of this file by scripts/gen-figma.mjs.
 */

/** @typedef {{ $type: string; $value: any }} Token */
/** @typedef {Record<string, Token>} Scheme */

/** @type {any} */
// @ts-expect-error DTHEO_TOKENS is a var the build writes ahead of this file.
const T = DTHEO_TOKENS;

const MARK = 'dtheo-ui';
const px = (/** @type {string} */ v) => Number.parseFloat(v);

// ---------- Colors ----------

/** @param {string} hex @param {number} alpha @returns {RGBA} */
function rgba(hex, alpha = 1) {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: alpha };
}

/** `oklch(L C H / a)` of pure black or white, as the shadow tokens write them. @returns {RGBA} */
function shadowColor(/** @type {string} */ css) {
  const m = /oklch\(\s*([\d.]+)\s+[\d.]+\s+[\d.]+\s*(?:\/\s*([\d.]+))?\)/.exec(css);
  const l = m ? Number(m[1]) : 0;
  return { r: l, g: l, b: l, a: m && m[2] ? Number(m[2]) : 1 };
}

/** The themes a frame can switch between: each preset in light and dark. */
const themes = [
  { mode: 'Graphite light', preset: 'graphite', scheme: 'light' },
  { mode: 'Graphite dark', preset: 'graphite', scheme: 'dark' },
  { mode: 'Carbon light', preset: 'carbon', scheme: 'light' },
  { mode: 'Carbon dark', preset: 'carbon', scheme: 'dark' },
];

// ---------- Variables ----------

/**
 * A collection with exactly these modes, in this order: the first mode is renamed, the rest added once.
 * @param {string} name @param {string[]} modeNames
 */
async function collection(name, modeNames) {
  const all = await figma.variables.getLocalVariableCollectionsAsync();
  const c = all.find((x) => x.name === name) ?? figma.variables.createVariableCollection(name);
  /** @type {Record<string, string>} */
  const ids = {};
  /** Modes the file's plan would not take: Starter files allow one per collection. @type {string[]} */
  const refused = [];
  for (const m of c.modes) if (modeNames.includes(m.name)) ids[m.name] = m.modeId;
  // Modes this list no longer has: left by an earlier version of the library, or the "Mode 1" of a new collection.
  const stale = c.modes.filter((m) => !modeNames.includes(m.name));
  for (const m of modeNames) {
    if (ids[m]) continue;
    // A collection keeps at least one mode, so a stale one is renamed before any is removed.
    const reuse = stale.shift();
    if (reuse) {
      c.renameMode(reuse.modeId, m);
      ids[m] = reuse.modeId;
      continue;
    }
    try {
      ids[m] = c.addMode(m);
    } catch {
      refused.push(m);
    }
  }
  for (const m of stale) c.removeMode(m.modeId);
  return { collection: c, modes: ids, refused };
}

/**
 * The variable of this name in the collection, created on the first run.
 * @param {VariableCollection} c @param {string} name @param {VariableResolvedDataType} type
 */
async function variable(c, name, type) {
  const vars = await figma.variables.getLocalVariablesAsync(type);
  return (
    vars.find((v) => v.name === name && v.variableCollectionId === c.id) ??
    figma.variables.createVariable(name, c, type)
  );
}

/** Every variable the components bind to, by token name. */
/** @type {Record<string, Variable>} */
const V = {};

async function buildVariables() {
  const color = await collection(
    'Color',
    themes.map((t) => t.mode),
  );
  const roles = Object.keys(T.graphite.light);
  for (const role of roles) {
    const v = await variable(color.collection, role, 'COLOR');
    for (const t of themes) {
      /** @type {Token} */
      const token = T[t.preset][t.scheme][role];
      const mode = color.modes[t.mode];
      if (mode) v.setValueForMode(mode, rgba(token.$value.hex, token.$value.alpha));
    }
    // Dev Mode shows the CSS variable a developer types, so the Figma name and the code name are one name.
    v.setVariableCodeSyntax('WEB', `var(--${role})`);
    v.scopes =
      role.endsWith('foreground') || role === 'link'
        ? ['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR']
        : ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'];
    V[role] = v;
  }

  const presets = ['graphite', 'carbon'];
  const names = { graphite: 'Graphite', carbon: 'Carbon' };
  const geometry = await collection(
    'Geometry',
    presets.map((p) => names[/** @type {keyof typeof names} */ (p)]),
  );
  // Nested corners are concentric: an item in a popover is the popover's radius minus its 4px padding.
  /** @type {Array<[string, (g: Record<string, Token>) => number, string]>} */
  const radii = [
    ['radius/control', (g) => px(g['radius-control'].$value), 'rounded-control'],
    ['radius/popover', (g) => px(g['radius-popover'].$value), 'rounded-popover'],
    ['radius/card', (g) => px(g['radius-card'].$value), 'rounded-card'],
    ['radius/dialog', (g) => px(g['radius-dialog'].$value), 'rounded-dialog'],
    ['radius/item', (g) => Math.max(0, px(g['radius-popover'].$value) - 4), 'rounded-item'],
    ['radius/inset', (g) => Math.max(0, px(g['radius-card'].$value) - 4), 'rounded-inset'],
    ['blur/material', (g) => px(g['material-blur'].$value), 'backdrop-blur-material'],
  ];
  for (const [name, read, cls] of radii) {
    const v = await variable(geometry.collection, name, 'FLOAT');
    for (const p of presets) {
      const mode = geometry.modes[names[/** @type {keyof typeof names} */ (p)]];
      if (mode) v.setValueForMode(mode, read(T[p].geometry));
    }
    v.setVariableCodeSyntax('WEB', cls);
    v.scopes = name.startsWith('radius') ? ['CORNER_RADIUS'] : ['EFFECT_FLOAT'];
    V[name] = v;
  }

  const size = await collection('Size', ['Default']);
  for (const [k, value] of Object.entries(T.foundation.control)) {
    const v = await variable(size.collection, `control/${k}`, 'FLOAT');
    v.setValueForMode(size.modes.Default, px(/** @type {string} */ (value)));
    v.setVariableCodeSyntax('WEB', `h-control-${k}`);
    v.scopes = ['WIDTH_HEIGHT'];
    V[`control/${k}`] = v;
  }
  return { color, geometry, refused: color.refused };
}

// ---------- Text and shadow styles ----------

/** @type {{ family: string; styles: Record<number, string> }} */
let font = { family: 'Inter', styles: { 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold' } };

/** SF Pro where it is installed, as on the web on a Mac; Inter, which Figma always has, elsewhere. */
async function pickFont() {
  const fonts = await figma.listAvailableFontsAsync();
  const has = (/** @type {string} */ family, /** @type {string} */ style) =>
    fonts.some((f) => f.fontName.family === family && f.fontName.style === style);
  for (const family of ['SF Pro', 'SF Pro Text']) {
    if (has(family, 'Regular') && has(family, 'Semibold')) {
      font = { family, styles: { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' } };
      break;
    }
  }
  for (const style of Object.values(font.styles)) await figma.loadFontAsync({ family: font.family, style });
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
}

/** The nearest weight the family has: the tokens use 650 and 680, which no static font ships. */
const fontName = (/** @type {number} */ weight) => ({
  family: font.family,
  style: font.styles[weight >= 650 ? 700 : weight >= 600 ? 600 : weight >= 500 ? 500 : 400],
});

/** @type {Record<string, TextStyle>} */
const TS = {};

async function buildTextStyles() {
  const existing = await figma.getLocalTextStylesAsync();
  /** @type {Array<[string, [string, string, string, string]]>} */
  const roles = Object.entries(T.foundation.text);
  // Buttons and badges set body and caption at 500: two extra styles, named for where they are used.
  roles.push([
    'body-medium',
    [roles.find(([r]) => r === 'body')?.[1][0] ?? '13px', '18px', '-0.003em', '500'],
  ]);
  roles.push(['caption-medium', ['11px', '14px', '0.005em', '500']]);
  for (const [role, [size, lh, track, weight]] of roles) {
    const name = `dtheo/${role}`;
    const s = existing.find((x) => x.name === name) ?? figma.createTextStyle();
    s.name = name;
    s.fontName = fontName(Number(weight));
    s.fontSize = px(size);
    s.lineHeight = { unit: 'PIXELS', value: px(lh) };
    s.letterSpacing = { unit: 'PERCENT', value: Number.parseFloat(track) * 100 };
    s.description = `text-${role}: ${size}/${lh}, ${weight}, tracking ${track}`;
    TS[role] = s;
  }
}

/**
 * CSS box shadows as Figma effects: `inset` becomes an inner shadow; a shadow with no blur and a spread is the
 * hairline the tokens draw around popovers.
 * @param {string} css @returns {Effect[]}
 */
function effects(css) {
  return css.split(/,\s*(?![^(]*\))/).map((part) => {
    const inset = part.trim().startsWith('inset');
    const color = shadowColor(part);
    const nums = part
      .replace(/oklch\([^)]*\)/, '')
      .replace('inset', '')
      .trim()
      .split(/\s+/)
      .map(px);
    const [x = 0, y = 0, blur = 0, spread = 0] = nums;
    return /** @type {Effect} */ ({
      type: inset ? 'INNER_SHADOW' : 'DROP_SHADOW',
      color,
      offset: { x, y },
      radius: blur,
      spread,
      visible: true,
      blendMode: 'NORMAL',
      ...(inset ? {} : { showShadowBehindNode: false }),
    });
  });
}

/** @type {Record<string, EffectStyle>} */
const ES = {};

async function buildEffectStyles() {
  const existing = await figma.getLocalEffectStylesAsync();
  for (const [scheme, shadows] of Object.entries(T.foundation.shadow)) {
    for (const [name, css] of Object.entries(/** @type {Record<string, string>} */ (shadows))) {
      const full = `dtheo/shadow-${name}/${scheme}`;
      const s = existing.find((x) => x.name === full) ?? figma.createEffectStyle();
      s.name = full;
      s.effects = effects(css);
      s.description = `shadow-${name} in ${scheme} mode`;
      ES[`${name}/${scheme}`] = s;
    }
  }
}

// ---------- Drawing helpers: every paint and radius is bound to a variable ----------

/** A solid paint bound to a color variable, at an optional opacity (Tailwind's `bg-success/15`). */
function paint(/** @type {string} */ role, opacity = 1) {
  /** @type {SolidPaint} */
  const base = { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity };
  return figma.variables.setBoundVariableForPaint(base, 'color', V[role]);
}

/** @param {SceneNode & MinimalFillsMixin} node @param {string} role */
function fill(node, role, opacity = 1) {
  node.fills = [paint(role, opacity)];
}

/** @param {SceneNode & MinimalStrokesMixin} node @param {string} role */
function stroke(node, role, weight = 1) {
  node.strokes = [paint(role)];
  node.strokeWeight = weight;
  node.strokeAlign = 'INSIDE';
}

/** @param {SceneNode & CornerMixin} node @param {string} name */
function radius(node, name) {
  for (const corner of /** @type {const} */ ([
    'topLeftRadius',
    'topRightRadius',
    'bottomLeftRadius',
    'bottomRightRadius',
  ]))
    node.setBoundVariable(corner, V[name]);
}

/** A hug-content auto-layout row. @param {FrameNode | ComponentNode} node */
function row(
  node,
  { gap = 6, padX = 0, padY = 0, align = /** @type {'CENTER' | 'MIN' | 'MAX'} */ ('CENTER') } = {},
) {
  node.layoutMode = 'HORIZONTAL';
  node.primaryAxisSizingMode = 'AUTO';
  node.counterAxisSizingMode = 'AUTO';
  node.primaryAxisAlignItems = align === 'CENTER' ? 'CENTER' : align;
  node.counterAxisAlignItems = 'CENTER';
  node.itemSpacing = gap;
  node.paddingLeft = node.paddingRight = padX;
  node.paddingTop = node.paddingBottom = padY;
  node.fills = [];
}

/** A hug-content auto-layout column. @param {FrameNode | ComponentNode} node */
function column(node, { gap = 6, padX = 0, padY = 0 } = {}) {
  node.layoutMode = 'VERTICAL';
  node.primaryAxisSizingMode = 'AUTO';
  node.counterAxisSizingMode = 'AUTO';
  node.counterAxisAlignItems = 'MIN';
  node.itemSpacing = gap;
  node.paddingLeft = node.paddingRight = padX;
  node.paddingTop = node.paddingBottom = padY;
  node.fills = [];
}

/**
 * The frame's size: fixed on the axes given, hugging its content on the others. The resize comes first, because
 * Figma pins a resized auto-layout axis to fixed; the hug is set after it.
 * @param {FrameNode | ComponentNode | ComponentSetNode} node @param {{ width?: number; height?: number }} size
 */
function fit(node, { width, height }) {
  node.resize(width ?? Math.max(node.width, 1), height ?? Math.max(node.height, 1));
  const horizontal = node.layoutMode === 'HORIZONTAL';
  const w = width === undefined ? 'AUTO' : 'FIXED';
  const h = height === undefined ? 'AUTO' : 'FIXED';
  node.primaryAxisSizingMode = horizontal ? w : h;
  node.counterAxisSizingMode = horizontal ? h : w;
}

/** Text in a style and a color role. */
async function text(
  /** @type {string} */ characters,
  /** @type {string} */ style,
  /** @type {string} */ role,
) {
  const t = figma.createText();
  t.fontName = TS[style].fontName;
  await t.setTextStyleIdAsync(TS[style].id);
  t.characters = characters;
  fill(t, role);
  return t;
}

/** Lucide icons the components use, at 24px; strokes take the color role. */
const icons = {
  'circle-x': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  'circle-check': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  'triangle-alert':
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  minus: '<path d="M5 12h14"/>',
};

/** @param {keyof typeof icons} name @param {number} size @param {string} role */
function icon(name, size, role) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
  const node = figma.createNodeFromSvg(svg);
  node.name = `icon/${name}`;
  node.fills = [];
  // Scaled, not resized: a resize keeps 2px strokes on a 12px icon, where the CSS draws them at half that.
  node.rescale(size / 24);
  for (const child of node.findAll((n) => 'strokes' in n)) {
    const v = /** @type {VectorNode} */ (child);
    v.strokes = [paint(role)];
  }
  return node;
}

/** Marks a node as made by this plugin, so the next run can replace it. @param {BaseNode} node */
const mark = (node) => node.setPluginData(MARK, '1');

// ---------- Components ----------

const buttonVariants = {
  primary: { bg: 'primary', fg: 'primary-foreground', shadow: true },
  secondary: { bg: 'secondary', fg: 'secondary-foreground', shadow: true },
  outline: { bg: null, fg: 'foreground', border: 'border-strong' },
  ghost: { bg: null, fg: 'foreground' },
  destructive: { bg: 'destructive', fg: 'white', shadow: true },
};
const buttonSizes = {
  sm: { h: 'control/sm', pad: 10, style: 'label' },
  md: { h: 'control/md', pad: 12, style: 'body-medium' },
  lg: { h: 'control/lg', pad: 16, style: 'callout' },
};

async function buildButton() {
  /** @type {ComponentNode[]} */
  const parts = [];
  for (const [variant, v] of Object.entries(buttonVariants)) {
    for (const [size, s] of Object.entries(buttonSizes)) {
      const c = figma.createComponent();
      c.name = `Variant=${variant}, Size=${size}`;
      row(c, { gap: 6, padX: s.pad });
      fit(c, { height: 28 });
      c.setBoundVariable('height', V[s.h]);
      radius(c, 'radius/control');
      if (v.bg) fill(c, v.bg);
      if ('border' in v && v.border) stroke(c, v.border);
      if ('shadow' in v && v.shadow) await c.setEffectStyleIdAsync(ES['raised/light'].id);
      // Destructive labels are white in every theme, as in the CSS: a fixed color, not a role.
      const label = await text('Queue retune run', s.style, v.fg === 'white' ? 'primary-foreground' : v.fg);
      if (v.fg === 'white') label.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      c.appendChild(label);
      parts.push(c);
    }
  }
  return parts;
}

const badgeVariants = {
  neutral: { bg: 'secondary', opacity: 1, fg: 'secondary-foreground', icon: null },
  outline: { bg: null, opacity: 1, fg: 'muted-foreground', icon: null, border: 'border-strong' },
  info: { bg: 'info', opacity: 0.15, fg: 'info-foreground', icon: 'info' },
  success: { bg: 'success', opacity: 0.15, fg: 'success-foreground', icon: 'circle-check' },
  warning: { bg: 'warning', opacity: 0.15, fg: 'warning-foreground', icon: 'triangle-alert' },
  destructive: { bg: 'destructive', opacity: 0.15, fg: 'destructive-foreground', icon: 'circle-x' },
};
const badgeWords = {
  neutral: 'Draft',
  outline: 'Synthetic data',
  info: 'Running',
  success: 'Pass',
  warning: 'Near limit',
  destructive: 'Fail',
};

async function buildBadge() {
  /** @type {ComponentNode[]} */
  const parts = [];
  for (const [variant, v] of Object.entries(badgeVariants)) {
    const c = figma.createComponent();
    c.name = `Variant=${variant}`;
    row(c, { gap: 4, padX: 8 });
    fit(c, { height: 20 });
    c.cornerRadius = 999;
    if (v.bg) fill(c, v.bg, v.opacity);
    if ('border' in v && v.border) stroke(c, v.border);
    // Status always carries an icon and a word, never color alone.
    if (v.icon) c.appendChild(icon(/** @type {keyof typeof icons} */ (v.icon), 12, v.fg));
    c.appendChild(
      await text(badgeWords[/** @type {keyof typeof badgeWords} */ (variant)], 'caption-medium', v.fg),
    );
    parts.push(c);
  }
  return parts;
}

async function buildInput() {
  const states = {
    default: { border: 'input', value: 'Kp 3.60', valueRole: 'foreground', ring: false },
    placeholder: { border: 'input', value: 'Search runs', valueRole: 'subtle-foreground', ring: false },
    focus: { border: 'ring', value: 'Kp 3.60', valueRole: 'foreground', ring: true },
    invalid: { border: 'destructive-foreground', value: 'Kp 6.20', valueRole: 'foreground', ring: false },
    disabled: { border: 'input', value: 'Kp 3.60', valueRole: 'foreground', ring: false },
  };
  /** @type {ComponentNode[]} */
  const parts = [];
  for (const [state, s] of Object.entries(states)) {
    const c = figma.createComponent();
    c.name = `State=${state}`;
    row(c, { padX: 10, align: 'MIN' });
    fit(c, { width: 220, height: 28 });
    c.setBoundVariable('height', V['control/md']);
    radius(c, 'radius/control');
    fill(c, 'card');
    stroke(c, s.border);
    if (s.ring) {
      // The ring: a 2px line in the ring color outside the border. Figma cannot tint a bound color, so the 12 % halo
      // the CSS draws around it is left out here.
      /** @type {DropShadowEffect} */
      const ring = {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 1 },
        offset: { x: 0, y: 0 },
        radius: 0,
        spread: 2,
        visible: true,
        blendMode: 'NORMAL',
        showShadowBehindNode: false,
      };
      c.effects = [figma.variables.setBoundVariableForEffect(ring, 'color', V.ring)];
    }
    if (state === 'disabled') c.opacity = 0.45;
    c.appendChild(await text(s.value, 'body', s.valueRole));
    parts.push(c);
  }
  return parts;
}

async function buildCheckbox() {
  /** @type {ComponentNode[]} */
  const parts = [];
  for (const state of ['unchecked', 'checked', 'indeterminate']) {
    const c = figma.createComponent();
    c.name = `State=${state}`;
    row(c, { gap: 0 });
    fit(c, { width: 14, height: 14 });
    radius(c, 'radius/item');
    if (state === 'unchecked') {
      fill(c, 'card');
      stroke(c, 'input');
    } else {
      fill(c, 'primary');
      stroke(c, 'primary');
      c.appendChild(icon(state === 'checked' ? 'check' : 'minus', 12, 'primary-foreground'));
    }
    parts.push(c);
  }
  return parts;
}

async function buildMetric() {
  const statuses = {
    fail: {
      value: '17.6',
      unit: '%',
      label: 'Overshoot',
      fill: 'destructive-foreground',
      word: 'Fail',
      icon: 'circle-x',
      fg: 'destructive-foreground',
      progress: 1,
      limit: 'Limit ≤ 10 %',
    },
    warn: {
      value: '30.9',
      unit: 'A',
      label: 'Peak current',
      fill: 'warning',
      word: 'Near limit',
      icon: 'triangle-alert',
      fg: 'warning-foreground',
      progress: 0.77,
      limit: 'Limit ≤ 32 A',
    },
    pass: {
      value: '203',
      unit: 'ms',
      label: 'Settling, 2 %',
      fill: 'chart-muted',
      word: 'Pass',
      icon: 'circle-check',
      fg: 'success-foreground',
      progress: 0.54,
      limit: 'Limit ≤ 250 ms',
    },
    missing: {
      value: '—',
      unit: '',
      label: 'Peak current',
      fill: null,
      word: null,
      icon: null,
      fg: 'subtle-foreground',
      progress: 0,
      limit: 'Not recorded',
    },
  };
  /** @type {ComponentNode[]} */
  const parts = [];
  for (const [status, s] of Object.entries(statuses)) {
    const c = figma.createComponent();
    c.name = `Status=${status}`;
    column(c, { gap: 6, padX: 16, padY: 14 });
    fit(c, { width: 180 });
    fill(c, 'card');
    stroke(c, 'border');
    c.appendChild(await text(s.label, 'label', 'muted-foreground'));

    const value = figma.createFrame();
    value.name = 'value';
    row(value, { gap: 3 });
    value.counterAxisAlignItems = 'BASELINE';
    value.appendChild(
      await text(s.value, 'title-2', status === 'missing' ? 'subtle-foreground' : 'foreground'),
    );
    if (s.unit) value.appendChild(await text(s.unit, 'body-medium', 'muted-foreground'));
    c.appendChild(value);

    // The meter: value against 1.5 × the limit, with a tick where the limit sits.
    const meter = figma.createFrame();
    meter.name = 'meter';
    meter.resize(148, 4);
    meter.cornerRadius = 2;
    fill(meter, 'secondary');
    meter.clipsContent = false;
    if (s.fill) {
      const bar = figma.createRectangle();
      bar.name = 'fill';
      bar.resize(Math.max(1, 148 * s.progress), 4);
      bar.cornerRadius = 2;
      fill(bar, s.fill);
      meter.appendChild(bar);
    }
    const tick = figma.createRectangle();
    tick.name = 'limit';
    tick.resize(2, 10);
    tick.x = 148 / 1.5 - 1;
    tick.y = -3;
    tick.cornerRadius = 1;
    fill(tick, 'muted-foreground');
    meter.appendChild(tick);
    c.appendChild(meter);
    meter.layoutSizingHorizontal = 'FILL';

    if (s.word && s.icon) {
      const st = figma.createFrame();
      st.name = 'status';
      row(st, { gap: 4 });
      st.appendChild(icon(/** @type {keyof typeof icons} */ (s.icon), 14, s.fg));
      const word = await text(s.word, 'label', s.fg);
      word.fontName = fontName(600);
      st.appendChild(word);
      c.appendChild(st);
    }
    c.appendChild(await text(s.limit, 'caption', 'subtle-foreground'));
    parts.push(c);
  }
  return parts;
}

/** The data table's row, in its four states, and its header. Cells are fixed widths, as the table's columns are. */
async function buildTableRow() {
  const cols = [
    { w: 40, kind: 'check' },
    { w: 88, kind: 'id', text: 'R-0412' },
    { w: 160, kind: 'text', text: 'High-gain step' },
    { w: 100, kind: 'num', text: '17.6', status: 'fail' },
    { w: 108, kind: 'num', text: '30.9', status: 'warn' },
    { w: 92, kind: 'num', text: '203' },
  ];
  const heads = ['', 'Run', 'Profile', 'Overshoot', 'Peak current', 'Settling'];
  const subs = ['', '', '', '% ≤ 10', 'A ≤ 32', 'ms ≤ 250'];
  const states = {
    default: { tint: null, opacity: 0 },
    hover: { tint: 'accent', opacity: 0.6 },
    checked: { tint: 'selection', opacity: 1 },
    active: { tint: 'accent', opacity: 1 },
  };
  /** @type {ComponentNode[]} */
  const parts = [];
  for (const [state, s] of Object.entries(states)) {
    const c = figma.createComponent();
    c.name = `Type=row, State=${state}`;
    row(c, { gap: 0, align: 'MIN' });
    fit(c, { height: 32 });
    fill(c, 'card');
    if (s.tint) c.fills = [paint('card'), paint(s.tint, s.opacity)];
    c.strokes = [paint('border')];
    c.strokeAlign = 'INSIDE';
    c.strokeTopWeight = c.strokeLeftWeight = c.strokeRightWeight = 0;
    c.strokeBottomWeight = 1;
    if (state === 'active') {
      // The active row: a 2px bar on its leading edge.
      c.strokes = [paint('border')];
      const bar = figma.createRectangle();
      bar.name = 'active bar';
      bar.resize(2, 32);
      fill(bar, 'primary');
      c.appendChild(bar);
      bar.layoutPositioning = 'ABSOLUTE';
      bar.x = 0;
      bar.y = 0;
    }
    for (const col of cols) {
      const cell = figma.createFrame();
      cell.name = col.kind;
      row(cell, { gap: 4, padX: col.kind === 'check' ? 16 : 12, align: col.kind === 'num' ? 'MAX' : 'MIN' });
      fit(cell, { width: col.w, height: 32 });
      if (col.kind === 'check') {
        const box = figma.createFrame();
        row(box, { gap: 0 });
        fit(box, { width: 14, height: 14 });
        radius(box, 'radius/item');
        if (state === 'checked') {
          fill(box, 'primary');
          box.appendChild(icon('check', 12, 'primary-foreground'));
        } else {
          fill(box, 'card');
          stroke(box, 'input');
        }
        cell.appendChild(box);
      } else {
        const role =
          col.status === 'fail'
            ? 'destructive-foreground'
            : col.status === 'warn'
              ? 'warning-foreground'
              : 'foreground';
        if (col.status)
          cell.appendChild(icon(col.status === 'fail' ? 'circle-x' : 'triangle-alert', 12, role));
        const t = await text(col.text ?? '', col.kind === 'id' ? 'label' : 'body', role);
        if (col.status === 'fail') t.fontName = fontName(500);
        cell.appendChild(t);
      }
      c.appendChild(cell);
    }
    parts.push(c);
  }

  const head = figma.createComponent();
  head.name = 'Type=header, State=default';
  row(head, { gap: 0, align: 'MIN' });
  fit(head, { height: 44 });
  fill(head, 'card');
  head.strokes = [paint('border')];
  head.strokeAlign = 'INSIDE';
  head.strokeTopWeight = head.strokeLeftWeight = head.strokeRightWeight = 0;
  head.strokeBottomWeight = 1;
  for (let i = 0; i < cols.length; i++) {
    const cell = figma.createFrame();
    cell.name = 'head';
    column(cell, { gap: 1, padX: i === 0 ? 16 : 12 });
    cell.counterAxisAlignItems = cols[i]?.kind === 'num' ? 'MAX' : 'MIN';
    cell.primaryAxisAlignItems = 'CENTER';
    fit(cell, { width: cols[i]?.w ?? 80, height: 44 });
    if (heads[i]) cell.appendChild(await text(heads[i] ?? '', 'label', 'subtle-foreground'));
    if (subs[i]) cell.appendChild(await text(subs[i] ?? '', 'caption', 'subtle-foreground'));
    head.appendChild(cell);
  }
  parts.push(head);
  return parts;
}

// ---------- Pages ----------

/**
 * The page of this name, made on the first run. A Starter file that has no pages left gets the library on its
 * current page instead. @param {string} name
 */
async function page(name) {
  let p = figma.root.children.find((x) => x.name === name);
  if (!p) {
    try {
      p = figma.createPage();
      p.name = name;
    } catch {
      p = figma.currentPage;
    }
  }
  await p.loadAsync();
  return p;
}

/** Lay out a component set's variants on a grid, the way Figma's own sets look. */
function grid(/** @type {ComponentSetNode} */ set, columns = 3) {
  set.layoutMode = 'HORIZONTAL';
  set.layoutWrap = 'WRAP';
  set.itemSpacing = 16;
  set.counterAxisSpacing = 16;
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 24;
  const widest = Math.max(...set.children.map((c) => /** @type {ComponentNode} */ (c).width));
  fit(set, { width: 48 + columns * widest + (columns - 1) * 16 });
  set.fills = [paint('background')];
  set.cornerRadius = 12;
  stroke(set, 'border');
}

async function main() {
  await pickFont();
  const { color, refused } = await buildVariables();
  await buildTextStyles();
  await buildEffectStyles();

  const components = await page('dtheo/ui · Components');
  await figma.setCurrentPageAsync(components);

  /** @type {Array<[string, () => Promise<ComponentNode[]>, number, string]>} */
  const builders = [
    ['Button', buildButton, 3, 'One control for actions. Primary once per view.'],
    ['Badge', buildBadge, 3, 'Status carries an icon and a word, never color alone.'],
    ['Input', buildInput, 1, 'Fields draw focus on their own border, with the ring in the ring color.'],
    ['Checkbox', buildCheckbox, 3, 'A 14px box with a 24px hit area in code.'],
    ['Metric', buildMetric, 4, 'A measurement against its limit: value, meter, status and limit.'],
    [
      'Table row',
      buildTableRow,
      1,
      'The data table’s header and row states. Units and limits sit under the column name.',
    ],
  ];

  // A component set made by an earlier run stays as it is: its fills, radii and text are bound to the variables and
  // styles just updated, so it already follows the tokens, and its instances and its key in a published library
  // survive. Delete a set to have it drawn again.
  const mine = components.children.filter((n) => n.type === 'COMPONENT_SET' && n.getPluginData(MARK));
  const have = new Set(mine.map((n) => n.name));
  let y = mine.reduce((bottom, n) => Math.max(bottom, n.y + n.height + 64), 0);
  let made = 0;
  for (const [name, build, columns, description] of builders) {
    if (have.has(name)) continue;
    const parts = await build();
    for (const p of parts) components.appendChild(p);
    const set = figma.combineAsVariants(parts, components);
    set.name = name;
    set.description = description;
    grid(set, columns);
    set.x = 0;
    set.y = y;
    // Each set shows itself in Graphite dark where the file has that mode; switch a frame's mode to see the others.
    const dark = color.modes['Graphite dark'];
    if (dark) set.setExplicitVariableModeForCollection(color.collection, dark);
    mark(set);
    y += set.height + 64;
    made += 1;
  }

  figma.viewport.scrollAndZoomIntoView(components.children.filter((n) => n.getPluginData(MARK)));
  // A toast holds about 100 characters.
  const tokens = `${Object.keys(V).length} variables, ${Object.keys(TS).length + Object.keys(ES).length} styles`;
  const drawn = made ? `${made} components made` : 'components kept';
  const themesMade = Object.keys(color.modes).length;
  const limit = !refused.length
    ? ''
    : themesMade === 1
      ? ' One theme: this plan allows one mode.'
      : ` ${themesMade} themes: the plan allows no more modes.`;
  figma.closePlugin(`dtheo/ui: ${tokens} updated, ${drawn}.${limit}`);
}

main().catch((e) => figma.closePlugin(`dtheo/ui failed: ${e instanceof Error ? e.message : String(e)}`));
