import { describe, expect, test } from 'bun:test';

import {
  cascade,
  contrastRatio,
  evaluateArithmetic,
  measurePairs,
  oklchToLinearRgb,
  parseTokenRules,
  resolveToken,
} from './token-contrast.ts';

const WHITE = 'oklch(1 0 0)';
const BLACK = 'oklch(0 0 0)';

describe('parseTokenRules and cascade', () => {
  const rules = parseTokenRules([
    `:root { --a: base; --b: base; --c: base; }
     :root[data-mode='light'] { --a: light; }
     @media (prefers-reduced-motion: reduce) { :root { --a: media; } }
     .other { --a: other; }`,
    `:root[data-theme="tavern"] { --b: tavern; }
     :root[data-theme='tavern']:not([data-mode='light']) { --c: tavern-dark; }`,
  ]);

  test('keeps only top-level :root rules', () => {
    expect(rules).toHaveLength(4);
  });

  test('applies matching rules by specificity, then source order', () => {
    const tokens = cascade(rules, { 'data-theme': 'tavern', 'data-mode': 'dark' });
    expect(Object.fromEntries(tokens)).toStrictEqual({ '--a': 'base', '--b': 'tavern', '--c': 'tavern-dark' });
  });

  test('a :not() condition stops matching when its attribute does', () => {
    const tokens = cascade(rules, { 'data-theme': 'tavern', 'data-mode': 'light' });
    expect(Object.fromEntries(tokens)).toStrictEqual({ '--a': 'light', '--b': 'tavern', '--c': 'base' });
  });

  test('a later, less specific rule does not beat an earlier, more specific one', () => {
    const ordered = parseTokenRules([`:root[data-mode='light'] { --x: specific; }`, `:root { --x: plain; }`]);
    expect(cascade(ordered, { 'data-mode': 'light' }).get('--x')).toBe('specific');
  });
});

describe('resolveToken', () => {
  const tokens = new Map([
    ['--hue', '70'],
    ['--chroma', '0.02'],
    ['--ramp', 'oklch(0.5 calc(var(--chroma) * 0.5) var(--hue))'],
    ['--fg', 'var(--ramp)'],
    ['--fallback', 'var(--missing, 0.3)'],
    ['--loop-a', 'var(--loop-b)'],
    ['--loop-b', 'var(--loop-a)'],
  ]);

  test('substitutes nested var() references', () => {
    expect(resolveToken(tokens, '--fg')).toBe('oklch(0.5 calc(0.02 * 0.5) 70)');
  });

  test('uses a fallback only when the token is undefined', () => {
    expect(resolveToken(tokens, '--fallback')).toBe('0.3');
  });

  test('throws on an undefined token or a cycle', () => {
    expect(() => resolveToken(tokens, '--nope')).toThrow('--nope is not defined');
    expect(() => resolveToken(tokens, '--loop-a')).toThrow('--loop-a -> --loop-b -> --loop-a is a cycle');
  });
});

describe('evaluateArithmetic', () => {
  test('multiplies and divides before adding and subtracting', () => {
    expect(evaluateArithmetic('0.018 * 0.33')).toBeCloseTo(0.00594);
    expect(evaluateArithmetic('1 + 2 * 3')).toBe(7);
    expect(evaluateArithmetic('6/4 - 1 + -2')).toBe(-1.5);
  });

  test('rejects what it cannot read, parentheses included', () => {
    expect(() => evaluateArithmetic('1 +')).toThrow('1 + is not a number');
    expect(() => evaluateArithmetic('(1 + 2) * 3')).toThrow('(1 is not a number');
    expect(() => evaluateArithmetic('')).toThrow('is not a number');
  });
});

describe('oklchToLinearRgb', () => {
  test('white and black are the ends of the range', () => {
    expect(oklchToLinearRgb(WHITE).red).toBeCloseTo(1, 4);
    expect(oklchToLinearRgb(BLACK)).toStrictEqual({ red: 0, green: 0, blue: 0 });
  });

  test('evaluates calc() and percentages in components', () => {
    expect(oklchToLinearRgb('oklch(60% calc(0.4 * 0.4) 52)')).toStrictEqual(oklchToLinearRgb('oklch(0.6 0.16 52)'));
  });

  // Chromium paints oklch(0.705 0.19 25) as rgb(255 101 97): red is out of sRGB gamut and clipped.
  test('clips out-of-gamut channels as the browser does', () => {
    expect(oklchToLinearRgb('oklch(0.705 0.19 25)').red).toBe(1);
  });

  test('rejects other colour formats and alpha', () => {
    expect(() => oklchToLinearRgb('#fff')).toThrow('not an oklch() colour');
    expect(() => oklchToLinearRgb('oklch(1 0 0 / 0.5)')).toThrow('no alpha');
  });
});

describe('contrastRatio', () => {
  test('is 21:1 for black on white, in either order, and 1:1 for a colour on itself', () => {
    const white = oklchToLinearRgb(WHITE);
    const black = oklchToLinearRgb(BLACK);
    expect(contrastRatio(black, white)).toBeCloseTo(21, 2);
    expect(contrastRatio(white, black)).toBeCloseTo(21, 2);
    expect(contrastRatio(white, white)).toBe(1);
  });

  // WebAIM's checker gives #767676 on white 4.54:1; #767676 is oklch(0.5658 0 0).
  test('matches the WCAG 2 reference value for #767676 on white', () => {
    expect(contrastRatio(oklchToLinearRgb('oklch(0.5658 0 0)'), oklchToLinearRgb(WHITE))).toBeCloseTo(4.54, 2);
  });
});

describe('measurePairs', () => {
  test('measures every foreground against every background of a pair', () => {
    const tokens = new Map([
      ['--fr-fg', BLACK],
      ['--fr-muted', 'oklch(0.9 0 0)'],
      ['--fr-bg', WHITE],
    ]);
    const results = measurePairs(tokens, [{ foreground: ['fg', 'muted'], background: ['bg'], minimum: 4.5 }]);
    expect(results.map(({ foreground, background, ratio }) => [foreground, background, ratio < 4.5])).toStrictEqual([
      ['fg', 'bg', false],
      ['muted', 'bg', true],
    ]);
  });
});
