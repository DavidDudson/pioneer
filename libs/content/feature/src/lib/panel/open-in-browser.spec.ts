import { TableViewKey } from '@pioneer/frontier/data';
import { describe, expect, it } from 'vitest';

import { browserLink, ORIGIN_STATE, originOf } from './open-in-browser';

describe(browserLink, () => {
  it('opens the entry page with the kind and the words', () => {
    expect(browserLink({ kind: 'feat', name: 'power-attack' }, ' attack ')).toStrictEqual({
      commands: ['/content', 'feat', 'power-attack'],
      queryParams: { kind: 'feat', [TableViewKey.Search]: 'attack' },
    });
  });

  it('leaves the words out when there are none', () => {
    expect(browserLink({ kind: 'spell', name: 'fireball' }, '  ').queryParams).toStrictEqual({
      kind: 'spell',
      [TableViewKey.Search]: undefined,
    });
  });
});

describe(originOf, () => {
  it('reads an address of the app', () => {
    expect(originOf({ [ORIGIN_STATE]: '/characters/1/plan?drawer=open' })).toBe('/characters/1/plan?drawer=open');
  });

  it.each([
    undefined,
    {},
    { [ORIGIN_STATE]: 5 },
    { [ORIGIN_STATE]: 'https://evil.example' },
    { [ORIGIN_STATE]: '//evil.example' },
  ])('ignores %j', (state) => {
    expect(originOf(state)).toBeUndefined();
  });
});
