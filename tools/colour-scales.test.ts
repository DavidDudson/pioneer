import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

import { RADIX_ROLE_SCALE } from './radix-scales.ts';
import { cascade, parseTokenRules, resolveToken } from './token-cascade.ts';
import { contrastRatio, oklchToLinearRgb } from './token-contrast.ts';
import type { LinearRgb } from './token-contrast.ts';

const STYLES = 'libs/frontier/src/styles/';

const RULES = parseTokenRules(
  ['primitives.color.css', 'themes/frontier.css'].map((file) => readFileSync(STYLES + file, 'utf8')),
);

const ROLES = ['neutral', 'accent', 'danger', 'success', 'warning', 'info'] as const;
const MODES = ['light', 'dark'] as const;
const STEP_COUNT = 12;
const STEPS = Array.from({ length: STEP_COUNT }).map((_unused, index) => index + 1);

type Mode = (typeof MODES)[number];

type Role = (typeof ROLES)[number];

const HEX_CHANNELS = /^#(?<red>[0-9a-f]{2})(?<green>[0-9a-f]{2})(?<blue>[0-9a-f]{2})$/u;
const SRGB_KNEE = 0.04045;

function linearChannel(byte: string): number {
  const channel = Number.parseInt(byte, 16) / 255;

  return channel <= SRGB_KNEE ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function hexToLinear(hex: string): LinearRgb {
  const { red = '', green = '', blue = '' } = HEX_CHANNELS.exec(hex)?.groups ?? {};

  return { red: linearChannel(red), green: linearChannel(green), blue: linearChannel(blue) };
}

function frontierColour(mode: Mode, role: Role, step: number): LinearRgb {
  const tokens = cascade(RULES, { 'data-theme': 'frontier', 'data-mode': mode });

  return oklchToLinearRgb(resolveToken(tokens, `--fr-ramp-${role}-${step}`));
}

function radixColour(mode: Mode, role: Role, step: number): LinearRgb {
  return hexToLinear(RADIX_ROLE_SCALE[role][mode][step - 1] ?? '');
}

/** The oklch lightness a step is written with. */
function lightness(mode: Mode, role: Role, step: number): number {
  const tokens = cascade(RULES, { 'data-theme': 'frontier', 'data-mode': mode });
  const [, value = ''] = /^oklch\((?<lightness>[\d.]+) /u.exec(resolveToken(tokens, `--fr-ramp-${role}-${step}`)) ?? [];

  return Number(value);
}

const ROLE_MODES = ROLES.flatMap((role) => MODES.map((mode) => ({ role, mode })));

describe('12-step scales', () => {
  test.each(ROLE_MODES)('$role has steps 1-12 and alpha steps a1-a12 in $mode', ({ role, mode }) => {
    const tokens = cascade(RULES, { 'data-theme': 'frontier', 'data-mode': mode });

    for (const step of STEPS) {
      expect(tokens.has(`--fr-ramp-${role}-${step}`), `${role}-${step}`).toBe(true);
      expect(tokens.has(`--fr-ramp-${role}-a${step}`), `${role}-a${step}`).toBe(true);
    }

    expect(tokens.has(`--fr-ramp-${role}-0`)).toBe(false);
    expect(tokens.has(`--fr-ramp-${role}-13`)).toBe(false);
  });

  test.each(ROLES)(
    '%s backgrounds, fills and borders step away from the page: light darkens, dark lightens',
    (role) => {
      for (const step of [2, 3, 4, 5, 6, 7, 8]) {
        expect(lightness('light', role, step)).toBeLessThan(lightness('light', role, step - 1));
        expect(lightness('dark', role, step)).toBeGreaterThan(lightness('dark', role, step - 1));
      }

      expect(lightness('light', role, 12)).toBeLessThan(lightness('light', role, 11));
      expect(lightness('dark', role, 12)).toBeGreaterThan(lightness('dark', role, 11));
    },
  );

  test('theme parameters stay hue and chroma, one pair per role', () => {
    const themeVariables = [...cascade(RULES, { 'data-theme': 'frontier', 'data-mode': 'dark' }).keys()].filter(
      (name) => /^--fr-ramp-[a-z]+-(?:hue|chroma)$/u.test(name),
    );

    expect(themeVariables.toSorted()).toEqual(
      ROLES.flatMap((role) => [`--fr-ramp-${role}-chroma`, `--fr-ramp-${role}-hue`]).toSorted(),
    );
  });

  test.each(ROLE_MODES)('$role alpha steps are partial colours, not opaque, in $mode', ({ role, mode }) => {
    const tokens = cascade(RULES, { 'data-theme': 'frontier', 'data-mode': mode });

    for (const step of STEPS) {
      const value = resolveToken(tokens, `--fr-ramp-${role}-a${step}`);
      const opacity = Number(/ \/ (?<alpha>[\d.]+)\)$/u.exec(value)?.groups?.['alpha']);

      expect(opacity, `${role}-a${step}: ${value}`).toBeGreaterThan(0);
      expect(opacity, `${role}-a${step}: ${value}`).toBeLessThan(1);
    }
  });
});

/**
 * Text steps against the backgrounds and fills they are used on, compared with the published Radix scale of the same
 * kind of role: ours must read at least as well, give or take a small tolerance. Hue is not compared; it is the theme's.
 */
const TEXT_PAIRS = [
  { text: 11, background: 1 },
  { text: 11, background: 2 },
  { text: 11, background: 3 },
  { text: 12, background: 1 },
  { text: 12, background: 2 },
  { text: 12, background: 3 },
];

const CONTRAST_TOLERANCE = 0.5;
const TEXT_MINIMUM_CONTRAST = 4.5;

describe('contrast against the published Radix scales', () => {
  const cases = ROLE_MODES.flatMap(({ role, mode }) =>
    TEXT_PAIRS.map(({ text, background }) => ({ role, mode, text, background })),
  );

  test.each(cases)('$role $mode: step $text on step $background', ({ role, mode, text, background }) => {
    const ourRatio = contrastRatio(frontierColour(mode, role, text), frontierColour(mode, role, background));
    const radixRatio = contrastRatio(radixColour(mode, role, text), radixColour(mode, role, background));

    expect(ourRatio).toBeGreaterThanOrEqual(radixRatio - CONTRAST_TOLERANCE);
    expect(ourRatio).toBeGreaterThanOrEqual(TEXT_MINIMUM_CONTRAST);
  });
});
