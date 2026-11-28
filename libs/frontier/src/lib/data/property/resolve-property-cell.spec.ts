import { describe, expect, it } from 'vitest';

import { resolvePropertyCell } from './resolve-property-cell';

class PropertyOwn {
  public readonly name = 'PropertyOwn';
}

class KindOwn {
  public readonly name = 'KindOwn';
}

class EntityOwn {
  public readonly name = 'EntityOwn';
}

describe(resolvePropertyCell, () => {
  it('prefers the property cell', () => {
    expect(resolvePropertyCell({ cell: PropertyOwn }, { cell: KindOwn }, EntityOwn)).toBe(PropertyOwn);
  });

  it('then the kind cell', () => {
    expect(resolvePropertyCell({}, { cell: KindOwn }, EntityOwn)).toBe(KindOwn);
  });

  it('then the entity cell', () => {
    expect(resolvePropertyCell({}, {}, EntityOwn)).toBe(EntityOwn);
  });

  it('then nothing, which is text', () => {
    expect(resolvePropertyCell({}, {}, undefined)).toBeUndefined();
  });
});
