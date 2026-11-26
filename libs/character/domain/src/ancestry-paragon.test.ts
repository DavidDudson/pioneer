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
import { CharacterBuilder, playerCoreClasses, playerCoreClassId, skillFixtures } from './testing';

const ANCESTRY_PARAGON = 'variant-rule:ancestry-paragon';
const FIRST_SLOT_LEVEL = 1;
const ANY_FEAT = ChoiceValue.parse('any-feat');
const SLOT_LEVELS = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map((level) => Level.parse(level));

/** Ancestry Paragon as the core rules pack writes it: an ancestry feat slot at 1st level and every even level. */
function paragonRules(): object[] {
  return SLOT_LEVELS.flatMap((level) => {
    const flag = `ancestry-paragon-${level}`;
    const predicate = [{ gte: ['self:level', level] }];

    return [
      {
        key: 'ChoiceSet',
        flag,
        prompt: 'Ancestry paragon feat',
        choices: { kind: 'feat', ownTrait: 'ancestry', filter: [{ lte: ['item:level', 'self:level'] }] },
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
      slug: ANCESTRY_PARAGON,
      name: 'Ancestry Paragon',
      sources: [{ kind: 'book', book: 'gm-core', page: 1 }],
      rules: paragonRules(),
      structure: [VariantStructure.ExtraSlots],
    },
    {
      slug: 'variant-rule:plain',
      name: 'Plain',
      sources: [{ kind: 'book', book: 'gm-core', page: 1 }],
      rules: paragonRules(),
    },
  ],
});

const registry = new ContentRegistry();

registry.register(skillFixtures());

registry.register(playerCoreClasses());

registry.register(variantPack);

const isParagon = (each: VariantRuleEntry): boolean => each.definition.slug === ANCESTRY_PARAGON;
const paragon: readonly VariantRuleEntry[] = registry.variantRules().filter((each) => isParagon(each));
const plain: readonly VariantRuleEntry[] = registry.variantRules().filter((each) => !isParagon(each));
const [paragonEntry] = paragon;

const withParagon = { ...slotContent(registry, paragon), namespaces: CORE_NAMESPACES };
const withoutParagon = { ...slotContent(registry, plain), namespaces: CORE_NAMESPACES };

function fighter(level: number): CharacterBuilder {
  return new CharacterBuilder().picking('class', playerCoreClassId('fighter')).atLevel(level);
}

/** The feat slots the variant opens: those whose origin is the variant itself, lowest level first. */
function variantSlots(content: typeof withParagon, level: number): FeatSlot[] {
  const variant = ContentId.parse(paragonEntry?.id);

  return featSlots(fighter(level).build().document, content).filter((slot) => slot.entry === variant);
}

/** The key of the variant's first slot. */
function firstSlotKey(): SlotKey {
  const [slot] = variantSlots(withParagon, FIRST_SLOT_LEVEL);

  if (slot === undefined) {
    throw new Error('Ancestry Paragon opened no slot');
  }

  return slot.key;
}

describe('the Ancestry Paragon variant', () => {
  test('opens an ancestry feat slot at 1st level and every even level, the plan above the character level too', () => {
    expect(variantSlots(withParagon, 1).map((slot) => slot.level)).toStrictEqual(SLOT_LEVELS);
    expect(variantSlots(withParagon, 20).map((slot) => slot.level)).toStrictEqual(SLOT_LEVELS);
  });

  test('opens no slots without the variant, or with one that has no extra slots', () => {
    expect(variantSlots(withoutParagon, 20)).toHaveLength(0);
  });

  test('keeps a pick when the variant goes off, and reads it again when it comes back', () => {
    const key = firstSlotKey();
    const taken = fighter(FIRST_SLOT_LEVEL).picking(key, ANY_FEAT).build().document;
    expect(taken.build.choices[key]).toBe(ANY_FEAT);
    expect(characterSlots(taken, withoutParagon).find((each) => each.key === key)?.status).toBe(SlotStatus.Hidden);
    expect(characterSlots(taken, withParagon).find((each) => each.key === key)?.status).not.toBe(SlotStatus.Hidden);
  });

  test('refuses a pick that is not an offered feat', () => {
    const { document } = fighter(FIRST_SLOT_LEVEL).build();

    const refused = slotRefusal(document, withParagon, {
      slot: firstSlotKey(),
      selection: ChoiceValue.parse('not-a-feat'),
    });

    expect(refused).toBeDefined();
  });
});
