import { describe, expect, test } from 'bun:test';

import {
  ChoiceValue,
  ContentId,
  ContentLicense,
  ContentPack,
  ContentRegistry,
  Level,
  VariantStructure,
} from '@pioneer/rules/sdk';
import type { SlotKey, VariantRuleEntry } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { featSlots } from './feat-slots';
import type { FeatSlot } from './feat-slots';
import { slotContent, slotRefusal } from './slot-offer';
import {
  CharacterBuilder,
  DEDICATION_FIXTURES,
  dedicationFixtureId,
  playerCoreClasses,
  playerCoreClassId,
  skillFixtures,
} from './testing';

const FREE_ARCHETYPE = 'variant-rule:free-archetype';
const FIRST_SLOT_LEVEL = 2;
const SLOT_LEVELS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map((level) => Level.parse(level));

/** Free Archetype as the core rules pack writes it: an archetype feat slot at 2nd level and every even level. */
function freeArchetypeRules(): object[] {
  return SLOT_LEVELS.flatMap((level) => {
    const flag = `free-archetype-${level}`;
    const predicate = [{ gte: ['self:level', level] }];
    return [
      {
        key: 'ChoiceSet',
        flag,
        prompt: 'Free archetype feat',
        choices: { kind: 'feat', filter: ['item:trait:archetype', { lte: ['item:level', 'self:level'] }] },
        predicate,
      },
      { key: 'GrantItem', item: { choice: flag }, predicate },
    ];
  });
}

const variantPack = ContentPack.define({
  manifest: { id: 'variants', title: 'Variants', publisher: 'Pioneer', license: ContentLicense.Homebrew },
  ancestries: [],
  creatures: [],
  variantRules: [
    {
      slug: FREE_ARCHETYPE,
      name: 'Free Archetype',
      sources: [{ kind: 'book', book: 'gm-core', page: 1 }],
      rules: freeArchetypeRules(),
      structure: [VariantStructure.ExtraSlots],
    },
    {
      slug: 'variant-rule:plain',
      name: 'Plain',
      sources: [{ kind: 'book', book: 'gm-core', page: 1 }],
      rules: freeArchetypeRules(),
    },
  ],
});

const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(playerCoreClasses());
registry.register(DEDICATION_FIXTURES);
registry.register(variantPack);
const isFree = (each: VariantRuleEntry): boolean => each.definition.slug === FREE_ARCHETYPE;
const free: readonly VariantRuleEntry[] = registry.variantRules().filter((each) => isFree(each));
const plain: readonly VariantRuleEntry[] = registry.variantRules().filter((each) => !isFree(each));
const [freeEntry] = free;

const withFree = { ...slotContent(registry, free), namespaces: CORE_NAMESPACES };
const withoutFree = { ...slotContent(registry, plain), namespaces: CORE_NAMESPACES };

function fighter(level: number): CharacterBuilder {
  return new CharacterBuilder().picking('class', playerCoreClassId('fighter')).atLevel(level);
}

const medicDedication = dedicationFixtureId('medic-dedication');

/** The feat slots the variant opens: those whose origin is the variant itself, lowest level first. */
function variantSlots(content: typeof withFree, level: number): FeatSlot[] {
  const variant = ContentId.parse(freeEntry?.id);
  return featSlots(fighter(level).build().document, content).filter((slot) => slot.entry === variant);
}

/** The key of the variant's first slot. */
function firstSlotKey(): SlotKey {
  const [slot] = variantSlots(withFree, FIRST_SLOT_LEVEL);
  if (slot === undefined) {
    throw new Error('Free Archetype opened no slot');
  }
  return slot.key;
}

describe('the Free Archetype variant', () => {
  test('opens an archetype feat slot at 2nd level and every even level, the plan above the character level too', () => {
    expect(variantSlots(withFree, 1).map((slot) => slot.level)).toStrictEqual(SLOT_LEVELS);
    expect(variantSlots(withFree, 20).map((slot) => slot.level)).toStrictEqual(SLOT_LEVELS);
  });

  test('offers archetype feats up to the level of the slot', () => {
    const [slot] = variantSlots(withFree, FIRST_SLOT_LEVEL);
    expect(slot?.options.map((each) => each.value)).toContain(medicDedication);
    expect(slot?.options.every((each) => each.level <= FIRST_SLOT_LEVEL)).toBe(true);
  });

  test('opens no slots without the variant, or with one that has no extra slots', () => {
    const [plainEntry] = plain;
    const own = featSlots(fighter(20).build().document, withoutFree).filter(
      (slot) => slot.entry === ContentId.parse(plainEntry?.id),
    );
    expect(plainEntry).toBeDefined();
    expect(own).toHaveLength(0);
    expect(variantSlots(withoutFree, 20)).toHaveLength(0);
  });

  test('keeps a pick when the variant goes off, and reads it again when it comes back', () => {
    const key = firstSlotKey();
    const taken = fighter(FIRST_SLOT_LEVEL).picking(key, medicDedication).build().document;
    const { choices } = taken.build;
    expect(choices[key]).toBe(medicDedication);
    expect(characterSlots(taken, withoutFree).find((each) => each.key === key)?.status).toBe(SlotStatus.Hidden);
    expect(characterSlots(taken, withFree).find((each) => each.key === key)?.status).not.toBe(SlotStatus.Hidden);
  });

  test('refuses a pick that is not an offered feat', () => {
    const { document } = fighter(FIRST_SLOT_LEVEL).build();
    const refused = slotRefusal(document, withFree, {
      slot: firstSlotKey(),
      selection: ChoiceValue.parse('not-a-feat'),
    });
    expect(refused).toBeDefined();
  });
});
