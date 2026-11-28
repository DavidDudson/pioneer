import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const FRONTIER_CSS = readFileSync('libs/frontier/src/styles/frontier.css', 'utf8');
const SCALE_CSS = readFileSync('libs/frontier/src/styles/primitives.scale.css', 'utf8');

const PX_PER_REM = 16;
const GRID_PX = 4;

const ROLES = ['caption', 'label', 'body', 'lead', 'subheading', 'heading', 'title', 'display'] as const;

const DECLARATION = /(?<name>--[\w-]+):\s*(?<value>[^;]+);/gu;

/** Every custom property a stylesheet declares, by name. */
function declarations(css: string): ReadonlyMap<string, string> {
  const found = new Map<string, string>();

  for (const match of css.matchAll(DECLARATION)) {
    const { name, value } = match.groups ?? {};

    if (name !== undefined && value !== undefined) {
      found.set(name, value.trim());
    }
  }

  return found;
}

const FRONTIER = declarations(FRONTIER_CSS);
const SCALE = declarations(SCALE_CSS);

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

function lineHeightRem(role: string): number {
  return rem(lookup(FRONTIER, `--text-${role}--line-height`));
}

function fontRem(role: string): number {
  const reference = lookup(FRONTIER, `--text-${role}`);
  const scaleName = reference.slice('var('.length, -1);

  return rem(lookup(SCALE, scaleName));
}

describe('text line-heights', () => {
  test.each(ROLES)('%s is a rem value on the 4px grid, not a ratio', (role) => {
    expect((lineHeightRem(role) * PX_PER_REM) % GRID_PX).toBe(0);
  });

  test.each(ROLES)('%s is at least as tall as its font and under twice it', (role) => {
    expect(lineHeightRem(role)).toBeGreaterThanOrEqual(fontRem(role));
    expect(lineHeightRem(role)).toBeLessThan(fontRem(role) * 2);
  });
});
