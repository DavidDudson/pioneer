import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const STYLES = path.join(import.meta.dir, '../libs/frontier/src/styles');
const COMMENT = /\/\*[\s\S]*?\*\//gu;

function readStyles(file: string): string {
  return readFileSync(path.join(STYLES, file), 'utf8').replaceAll(COMMENT, '');
}

const FRONTIER_CSS = readStyles('frontier.css');
const SCALE_CSS = readStyles('primitives.scale.css');
const SEMANTIC_CSS = readStyles('semantic.css');

const GRID_REM = 0.25;
const MIN_CONTAINER_REM = 20;
const MAX_CONTAINER_REM = 60;
const CQI_PER_CONTAINER = 100;

/** Slack for the rounding of the slope and intercept written in the clamp. */
const TOLERANCE_REM = 0.01;

const SQUEEZE = 2;

const DECLARATION = /(?<name>--[\w-]+):\s*(?<value>[^;]+);/gu;

/** Every custom property a stylesheet declares whose name starts with `prefix`, by name. */
function declarations(css: string, prefix: string): ReadonlyMap<string, string> {
  const found = new Map<string, string>();

  for (const match of css.matchAll(DECLARATION)) {
    const { name, value } = match.groups ?? {};

    if (name?.startsWith(prefix) === true && value !== undefined) {
      if (found.has(name)) {
        throw new Error(`${name} is declared more than once`);
      }

      found.set(name, value.trim());
    }
  }

  return found;
}

const THEME_TEXT = declarations(FRONTIER_CSS, '--text-');
const SEMANTIC_TEXT = declarations(SEMANTIC_CSS, '--fr-text-');
const SCALE_FONT = declarations(SCALE_CSS, '--fr-scale-font-');

function lookup(map: ReadonlyMap<string, string>, name: string): string {
  const value = map.get(name);

  if (value === undefined) {
    throw new Error(`${name} is not declared`);
  }

  return value;
}

function rem(value: string): number {
  if (!value.endsWith('rem')) {
    throw new Error(`${value} is not a rem value`);
  }

  return Number(value.slice(0, -'rem'.length));
}

const STEP = /var\((?<name>--fr-scale-font-\d+)\)/u;

const FLUID =
  /^clamp\(var\((?<min>--fr-scale-font-\d+)\), calc\((?<base>[\d.]+)rem \+ (?<slope>[\d.]+)cqi\), var\((?<max>--fr-scale-font-\d+)\)\)$/u;

function stepRem(name: string): number {
  return rem(lookup(SCALE_FONT, name));
}

interface Size {
  readonly min: number;
  readonly max: number;
  readonly fluid: { readonly base: number; readonly slope: number } | undefined;
  readonly steps: ReadonlyArray<string>;
}

function sizeOf(role: string): Size {
  const value = lookup(SEMANTIC_TEXT, `--fr-text-${role}`);
  const fluid = FLUID.exec(value)?.groups;

  if (fluid !== undefined) {
    const { min, max, base, slope } = fluid;

    return {
      min: stepRem(min ?? ''),
      max: stepRem(max ?? ''),
      fluid: { base: Number(base), slope: Number(slope) },
      steps: [min ?? '', max ?? ''],
    };
  }

  const step = STEP.exec(value)?.groups?.['name'];

  if (step === undefined || value !== `var(${step})`) {
    throw new Error(`--fr-text-${role} is ${value}, neither a plain scale step nor a fluid clamp of two`);
  }

  return { min: stepRem(step), max: stepRem(step), fluid: undefined, steps: [step] };
}

function lineHeightRem(role: string): number {
  return rem(lookup(SEMANTIC_TEXT, `--fr-text-${role}-line-height`));
}

const ROLES = [...SEMANTIC_TEXT.keys()].flatMap(
  (name) => /^--fr-text-(?<role>[a-z]+)$/u.exec(name)?.groups?.['role'] ?? [],
);

const FIXED_ROLES = ['caption', 'label', 'body', 'lead', 'subheading', 'heading'];
const FLUID_ROLES = ['title', 'display'];

/** The font size a fluid role has in a container of the given width, as the clamp computes it. */
function sizeAt(role: string, containerRem: number): number {
  const { min, max, fluid } = sizeOf(role);

  if (fluid === undefined) {
    return min;
  }

  const preferred = fluid.base + (fluid.slope / CQI_PER_CONTAINER) * containerRem;

  return Math.min(max, Math.max(min, preferred));
}

describe('type scale roles', () => {
  test('are caption to display, fixed then fluid', () => {
    expect(ROLES.toSorted()).toStrictEqual([...FIXED_ROLES, ...FLUID_ROLES].toSorted());
  });

  test.each(ROLES)('%s is mapped into the Tailwind theme to its semantic token', (role) => {
    expect(lookup(THEME_TEXT, `--text-${role}`)).toBe(`var(--fr-text-${role})`);
    expect(lookup(THEME_TEXT, `--text-${role}--line-height`)).toBe(`var(--fr-text-${role}-line-height)`);
  });

  test('every font step is used by a role: none is orphaned', () => {
    const used = new Set(ROLES.flatMap((role) => sizeOf(role).steps));

    expect([...SCALE_FONT.keys()].filter((step) => !used.has(step))).toStrictEqual([]);
  });

  test.each(FIXED_ROLES)('%s is a fixed scale step, so it never reflows with the container', (role) => {
    expect(sizeOf(role).fluid).toBeUndefined();
  });
});

describe('fluid display steps', () => {
  test.each(FLUID_ROLES)('%s is a clamp that grows with the container', (role) => {
    const { min, max, fluid } = sizeOf(role);

    expect(fluid).toBeDefined();
    expect(max).toBeGreaterThan(min);
  });

  test.each(FLUID_ROLES)('%s reaches its minimum at the smallest container and its maximum at the largest', (role) => {
    const { min, max } = sizeOf(role);

    expect(Math.abs(sizeAt(role, MIN_CONTAINER_REM) - min)).toBeLessThan(TOLERANCE_REM);
    expect(Math.abs(sizeAt(role, MAX_CONTAINER_REM) - max)).toBeLessThan(TOLERANCE_REM);
  });

  test.each(FLUID_ROLES)('%s only grows as the container does', (role) => {
    const middle = (MIN_CONTAINER_REM + MAX_CONTAINER_REM) / SQUEEZE;

    expect(sizeAt(role, middle)).toBeGreaterThan(sizeAt(role, MIN_CONTAINER_REM));
    expect(sizeAt(role, middle)).toBeLessThan(sizeAt(role, MAX_CONTAINER_REM));
  });

  test('display stays above title in every container', () => {
    for (const width of [MIN_CONTAINER_REM, MIN_CONTAINER_REM + 10, MAX_CONTAINER_REM]) {
      expect(sizeAt('display', width)).toBeGreaterThan(sizeAt('title', width));
    }
  });
});

describe('text line-heights', () => {
  test('covers every text role', () => {
    expect(ROLES.length).toBeGreaterThanOrEqual(8);
  });

  test.each(ROLES)('%s is a rem value on the 4px grid, not a ratio', (role) => {
    expect(lineHeightRem(role) % GRID_REM).toBe(0);
  });

  test.each(ROLES)('%s clears its largest size and is under twice its smallest', (role) => {
    const { min, max } = sizeOf(role);

    expect(lineHeightRem(role)).toBeGreaterThanOrEqual(max);
    expect(lineHeightRem(role)).toBeLessThan(min * SQUEEZE);
  });
});
