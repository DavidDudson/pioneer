import { describe, expect, it } from 'vitest';

import { withoutUntranslated } from './untranslated';

describe(withoutUntranslated, () => {
  it('drops empty messages at any depth, so en shows for them', () => {
    expect(withoutUntranslated({ title: 'Charaktere', empty: '', list: { name: 'Name', hint: '' } })).toStrictEqual({
      title: 'Charaktere',
      list: { name: 'Name' },
    });
  });

  it('keeps a group that translated nothing as an empty group', () => {
    expect(withoutUntranslated({ list: { name: '' } })).toStrictEqual({ list: {} });
  });
});
