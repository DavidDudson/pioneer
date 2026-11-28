import { parse } from '@messageformat/parser';
import { describe, expect, it } from 'vitest';

import { pseudoLocalise, pseudoLocaliseTree } from './pseudo-locale';

describe(pseudoLocalise, () => {
  it('accents the text and makes it at least 30% longer', () => {
    const result = pseudoLocalise('Characters');
    expect(result).toContain('Çĥáŕáçţéŕš');
    expect(result.length / 'Characters'.length).toBeGreaterThanOrEqual(1.3);
  });

  it('keeps arguments and plural syntax working', () => {
    const result = pseudoLocalise('{name} owns {count, plural, one {# gem} other {# gems}}');
    expect(result).toContain('{name}');
    expect(result).toContain('{count, plural, one {# ');
    expect(() => parse(result)).not.toThrow();
  });

  it('keeps select arms and formatted arguments', () => {
    const result = pseudoLocalise('{kind, select, gem {A gem worth {price, number}} other {Nothing}}');
    expect(result).toContain('{kind, select, gem {');
    expect(result).toContain('{price, number}');
    expect(() => parse(result)).not.toThrow();
  });

  it('keeps quoted apostrophes and braces as text', () => {
    const result = pseudoLocalise("It''s '{literal}'");
    expect(() => parse(result)).not.toThrow();
    expect(result).toContain("''");
    expect(result).toContain("'{'");
  });

  it('leaves a message with no text alone, whitespace included', () => {
    expect(pseudoLocalise('{count}')).toBe('{count}');
    expect(pseudoLocalise('{a} {b}')).toBe('{a} {b}');
  });
});

describe(pseudoLocaliseTree, () => {
  it('transforms every message and keeps the nesting', () => {
    const result = pseudoLocaliseTree({ list: { title: 'Characters' }, name: '{name}' });
    expect(result).toStrictEqual({ list: { title: pseudoLocalise('Characters') }, name: '{name}' });
  });
});
