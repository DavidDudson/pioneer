import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { LazyIcuTranspiler } from './lazy-icu-transpiler';

const PLURAL = '{count, plural, one {# character} other {# characters}}';
const ORDINAL = '{place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}';

function transpile(transpiler: LazyIcuTranspiler, value: string, params: Record<string, unknown>): unknown {
  return transpiler.transpile({ value, params, translation: {}, key: 'key' });
}

function setup(): LazyIcuTranspiler {
  TestBed.configureTestingModule({ providers: [LazyIcuTranspiler] });
  return TestBed.inject(LazyIcuTranspiler);
}

describe(LazyIcuTranspiler, () => {
  it('fills placeholders before the compiler has loaded', () => {
    expect(transpile(setup(), 'Hello {{ name }}', { name: 'Ezren' })).toBe('Hello Ezren');
  });

  it('formats plurals and ordinals once loaded', async () => {
    const transpiler = setup();
    await transpiler.load();
    expect(transpile(transpiler, PLURAL, { count: 1 })).toBe('1 character');
    expect(transpile(transpiler, PLURAL, { count: 3 })).toBe('3 characters');
    expect(transpile(transpiler, ORDINAL, { place: 22 })).toBe('22nd');
  });

  it('can be loaded twice', async () => {
    const transpiler = setup();
    await transpiler.load();
    await transpiler.load();
    expect(transpile(transpiler, PLURAL, { count: 2 })).toBe('2 characters');
  });

  it('applies a language chosen before it loaded', async () => {
    const transpiler = setup();
    transpiler.onLangChanged('en');
    await transpiler.load();
    expect(transpile(transpiler, PLURAL, { count: 1 })).toBe('1 character');
  });
});
