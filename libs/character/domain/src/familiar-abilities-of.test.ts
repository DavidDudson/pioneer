import { describe, expect, test } from 'bun:test';

import { ContentRegistry } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { familiarAbilitiesOf } from './familiar-abilities';
import { slotContent } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId, skillFixtures } from './testing';
import type { PlayerCoreClass } from './testing';

const registry = new ContentRegistry();

registry.register(playerCoreClasses());

registry.register(skillFixtures());

const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const totalFor = (className: PlayerCoreClass, level: number): number => {
  const { document } = new CharacterBuilder().picking('class', playerCoreClassId(className)).atLevel(level).build();

  return familiarAbilitiesOf(document, content).total;
};

describe('the abilities a character reads from its document', () => {
  test('are the base two for a class that adds none', () => {
    expect(totalFor('fighter', 6)).toBe(2);
  });

  test('add the witch bonus and its growth from the class the character picked', () => {
    expect(totalFor('witch', 1)).toBe(4);
    expect(totalFor('witch', 6)).toBe(5);
  });
});
