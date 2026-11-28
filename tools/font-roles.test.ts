import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

import { cascade, parseTokenRules, resolveToken } from './token-cascade.ts';

const FONTS_CSS = readFileSync('libs/frontier/src/styles/fonts.css', 'utf8');
const RULES = parseTokenRules([FONTS_CSS]);

const BODY_FONTS = ['thematic', 'readable', 'lexend', 'opendyslexic', 'system'] as const;
const MONO_FONTS = ['standard', 'typewriter', 'system'] as const;

type BodyFont = (typeof BODY_FONTS)[number];

const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace']);

const ATKINSON = "'Atkinson Hyperlegible Next'";

/** The first family each role resolves to, per body choice (ADR-0085). `undefined` is the device's own face. */
const FIRST_FAMILY: Readonly<Record<BodyFont, { display: string; ui: string; text: string }>> = {
  thematic: { display: 'Fraunces', ui: ATKINSON, text: "'Crimson Pro'" },
  readable: { display: 'Fraunces', ui: ATKINSON, text: ATKINSON },
  lexend: { display: 'Fraunces', ui: 'Lexend', text: 'Lexend' },
  opendyslexic: { display: 'Fraunces', ui: 'OpenDyslexic', text: 'OpenDyslexic' },
  system: { display: 'ui-sans-serif', ui: 'ui-sans-serif', text: 'ui-sans-serif' },
};

const FIRST_MONO: Readonly<Record<(typeof MONO_FONTS)[number], string>> = {
  standard: "'Fira Code'",
  typewriter: "'Courier Prime'",
  system: 'ui-monospace',
};

function families(value: string): Array<string> {
  return value.split(',').map((family) => family.trim());
}

const COMBINATIONS = BODY_FONTS.flatMap((body) => MONO_FONTS.map((mono) => ({ body, mono })));

describe('font roles', () => {
  test.each(COMBINATIONS)(
    'resolve for $body body and $mono mono, each stack ending in a generic family',
    ({ body, mono }) => {
      const tokens = cascade(RULES, { 'data-font-body': body, 'data-font-mono': mono });

      for (const role of ['display', 'ui', 'text', 'mono', 'brand']) {
        const stack = families(resolveToken(tokens, `--fr-font-${role}`));

        expect(GENERIC_FAMILIES.has(stack.at(-1) ?? ''), `${role} for ${body} + ${mono}: ${stack.join(', ')}`).toBe(
          true,
        );
      }
    },
  );

  test.each(COMBINATIONS)('pick the intended faces for $body body and $mono mono', ({ body, mono }) => {
    const tokens = cascade(RULES, { 'data-font-body': body, 'data-font-mono': mono });
    const first = (role: string): string | undefined => families(resolveToken(tokens, `--fr-font-${role}`))[0];

    expect(first('display')).toBe(FIRST_FAMILY[body].display);
    expect(first('ui')).toBe(FIRST_FAMILY[body].ui);
    expect(first('text')).toBe(FIRST_FAMILY[body].text);
    expect(first('mono')).toBe(FIRST_MONO[mono]);
    expect(first('brand')).toBe("'Pirata One'");
  });

  test('the accessibility faces override the UI and text roles together', () => {
    for (const body of ['lexend', 'opendyslexic'] as const) {
      const tokens = cascade(RULES, { 'data-font-body': body, 'data-font-mono': 'standard' });

      expect(resolveToken(tokens, '--fr-font-ui')).toBe(resolveToken(tokens, '--fr-font-text'));
    }
  });
});
