import { ContentKind } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { entryFromParam, entryToParam } from './side-panel-state';

describe(entryFromParam, () => {
  it('reads the kind and the name of an entry', () => {
    expect(entryFromParam('feat:power-attack')).toStrictEqual({ kind: ContentKind.Feat, name: 'power-attack' });
  });

  it.each([undefined, '', 'feat', 'feat:', ':power-attack', 'wizard:power-attack'])('drops %j', (text) => {
    expect(entryFromParam(text)).toBeUndefined();
  });

  it('round-trips an entry', () => {
    const entry = { kind: ContentKind.Spell, name: 'fireball' };
    expect(entryFromParam(entryToParam(entry))).toStrictEqual(entry);
  });
});
