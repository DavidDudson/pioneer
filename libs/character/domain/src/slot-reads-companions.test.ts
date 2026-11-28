import { describe, expect, test } from 'bun:test';

import { CompanionKind, companionRollOption, ContentRegistry, Level } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { resolveSlotsAt, slotContent, slotContextOf, withCompanions } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, skillFixtures } from './testing';

const registry = new ContentRegistry();

registry.register(playerCoreClasses());

registry.register(skillFixtures());

const content = { ...slotContent(registry), namespaces: CORE_NAMESPACES };
const { document } = new CharacterBuilder().build();
const FAMILIAR = companionRollOption(CompanionKind.Familiar);

const optionsWith = (kinds: ReadonlyArray<CompanionKind>): ReadonlyArray<string> =>
  resolveSlotsAt(Level.parse(1), slotContextOf(document, withCompanions(content, kinds))).rollOptions.map(String);

describe('slot reads with companions', () => {
  test('set the option of each live companion kind the engine reads', () => {
    expect(optionsWith([CompanionKind.Familiar])).toContain(FAMILIAR);
  });

  test('set no companion option without one', () => {
    expect(optionsWith([])).not.toContain(FAMILIAR);
  });
});
