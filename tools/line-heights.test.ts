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

const PX_PER_REM = 16;
const GRID_PX = 4;

const DECLARATION = /(?<name>--[\w-]+):\s*(?<value>[^;]+);/gu;

/** Every custom property a stylesheet declares, by name. */
function declarations(css: string): ReadonlyMap<string, string> {
  const found = new Map<string, string>();

  for (const match of css.matchAll(DECLARATION)) {
    const { name, value } = match.groups ?? {};

    if (name !== undefined && value !== undefined) {
      if (found.has(name)) {
        throw new Error(`${name} is declared more than once`);
      }

      found.set(name, value.trim());
    }
  }

  return found;
}

const LINE_HEIGHT = /^--text-(?<role>[\w-]+?)--line-height$/u;

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
  const scaleName = /^var\((?<name>--[\w-]+)\)$/u.exec(reference)?.groups?.['name'];

  if (scaleName === undefined) {
    throw new Error(`--text-${role} is ${reference}, not a plain var() of a scale step`);
  }

  return rem(lookup(SCALE, scaleName));
}

const ROLES = [...FRONTIER.keys()].flatMap((name) => LINE_HEIGHT.exec(name)?.groups?.['role'] ?? []);

describe('text line-heights', () => {
  test('covers every text role', () => {
    expect(ROLES.length).toBeGreaterThanOrEqual(8);
  });

  test.each(ROLES)('%s is a rem value on the 4px grid, not a ratio', (role) => {
    expect((lineHeightRem(role) * PX_PER_REM) % GRID_PX).toBe(0);
  });

  test.each(ROLES)('%s is at least as tall as its font and under twice it', (role) => {
    expect(lineHeightRem(role)).toBeGreaterThanOrEqual(fontRem(role));
    expect(lineHeightRem(role)).toBeLessThan(fontRem(role) * 2);
  });
});
