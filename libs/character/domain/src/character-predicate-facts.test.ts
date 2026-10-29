import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { characterPredicateFacts } from './action-context';
import { slotContent } from './slot-offer';
import { CharacterBuilder } from './testing';

const pack = new ContentPackBuilder().withId('shapes').withFeat('plant-shape');
pack.withClass('druid', ['wis'], {
  rules: [{ key: 'GrantItem', item: pack.idOf(ContentKind.Feat, 'plant-shape') }],
});
const registry = new ContentRegistry();
registry.register(pack.build());
const slots = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

describe('characterPredicateFacts', () => {
  test('has the feat roll option of a feat the build gives', () => {
    const druid = new CharacterBuilder().atLevel(4).picking('class', pack.idOf(ContentKind.Class, 'druid')).build();
    expect(characterPredicateFacts(druid.document, { slots }).has('feat:plant-shape')).toBe(true);
  });

  test('lacks it for a character without the feat', () => {
    const none = new CharacterBuilder().atLevel(4).build();
    expect(characterPredicateFacts(none.document, { slots }).has('feat:plant-shape')).toBe(false);
  });
});
