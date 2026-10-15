import { describe, expect, test } from 'bun:test';

import { ContentLicense, ContentPack, ContentRegistry, Selector, SlotKey, VariantStructure } from '@pioneer/rules/sdk';
import type { Proficiency, VariantRuleEntry } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { boostSets, BoostSource } from './attribute-boosts';
import { SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import {
  CHARACTER_ROOT_SLOTS,
  characterRootSlots,
  CLASS_SLOT,
  hasSecondClass,
  SECOND_CLASS_SLOT,
} from './character-slots';
import {
  characterGrants,
  characterRanks,
  classContent,
  classFeatures,
  secondSubclassSlot,
  subclassSlot,
} from './class-build';
import { rootSlotOptions, slotContent } from './slot-offer';
import { CharacterBuilder, playerCoreClasses, playerCoreClassId } from './testing';

const DUAL_CLASS = 'variant-rule:dual-class';

function variantPack(): ContentPack {
  return ContentPack.define({
    manifest: { id: 'variants', title: 'Variants', publisher: 'Pioneer', license: ContentLicense.Homebrew },
    ancestries: [],
    creatures: [],
    variantRules: [
      {
        slug: DUAL_CLASS,
        name: 'Dual Class',
        sources: [{ kind: 'book', book: 'gm-core', page: 1 }],
        rules: [],
        structure: [VariantStructure.SecondClass],
      },
      {
        slug: 'variant-rule:plain',
        name: 'Plain',
        sources: [{ kind: 'book', book: 'gm-core', page: 1 }],
        rules: [],
      },
    ],
  });
}

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
registry.register(variantPack());
const dual: readonly VariantRuleEntry[] = registry.variantRules().filter((each) => each.definition.slug === DUAL_CLASS);
const plain: readonly VariantRuleEntry[] = registry
  .variantRules()
  .filter((each) => each.definition.slug !== DUAL_CLASS);
const classes = classContent(registry);

const withDual = { ...slotContent(registry, dual), namespaces: CORE_NAMESPACES };
const withoutDual = { ...slotContent(registry, plain), namespaces: CORE_NAMESPACES };

/** A fighter (Dexterity) with a cleric (Wisdom) as the second class. */
const fighterCleric = new CharacterBuilder()
  .named('Dual')
  .picking('class', playerCoreClassId('fighter'))
  .picking('boost:1:class:0', 'dex')
  .picking(SECOND_CLASS_SLOT, playerCoreClassId('cleric'))
  .build().document;

/** The rank `ranks` hold for the statistic `selector` names. */
function rankIn(ranks: ReadonlyMap<Selector, Proficiency>, selector: string): string {
  return String(ranks.get(Selector.parse(selector)));
}

describe('the second class slot', () => {
  test('is a root slot only with a variant whose structure asks for a second class', () => {
    expect(hasSecondClass(characterRootSlots(dual))).toBe(true);
    expect(hasSecondClass(characterRootSlots(plain))).toBe(false);
    expect(hasSecondClass(characterRootSlots([]))).toBe(false);
    expect(characterRootSlots([])).toBe(CHARACTER_ROOT_SLOTS);
  });

  test('offers the same classes as the first', () => {
    const first = rootSlotOptions(fighterCleric, withDual, CLASS_SLOT).map((option) => option.value);
    const second = rootSlotOptions(fighterCleric, withDual, SECOND_CLASS_SLOT).map((option) => option.value);
    expect(second).toEqual(first);
    expect(second).toHaveLength(8);
  });

  test('is not there without the variant, and its pick is ignored but kept', () => {
    expect(rootSlotOptions(fighterCleric, withoutDual, SECOND_CLASS_SLOT)).toEqual([]);
    expect(fighterCleric.build.choices[SECOND_CLASS_SLOT]).toBe(playerCoreClassId('cleric'));
    const grants = characterGrants(fighterCleric, withoutDual);
    expect(classFeatures(grants, withoutDual.lookup, SECOND_CLASS_SLOT)).toEqual([]);
  });

  test('is listed open until a class is picked', () => {
    const first = new CharacterBuilder().named('Dual').picking('class', playerCoreClassId('fighter')).build().document;
    const slot = characterSlots(first, withDual).find((each) => each.key === SECOND_CLASS_SLOT);
    expect(slot?.status).toBe(SlotStatus.Open);
    expect(characterSlots(first, withoutDual).some((each) => each.key === SECOND_CLASS_SLOT)).toBe(false);
  });
});

describe('a Fighter with Cleric as the second class', () => {
  const grants = characterGrants(fighterCleric, withDual);

  test('has the features of both classes, each named for its class', () => {
    const first = classFeatures(grants, withDual.lookup);
    const second = classFeatures(grants, withDual.lookup, SECOND_CLASS_SLOT);
    expect(first.map((feature) => String(feature.name))).toEqual(['Reactive Strike', 'Shield Block']);
    expect(second.map((feature) => String(feature.name))).toEqual([
      'Cleric Spellcasting',
      'Deity (Cleric)',
      'Divine Font',
      'Doctrine',
      'First Doctrine',
    ]);
    expect(new Set(second.map((feature) => String(feature.className)))).toEqual(new Set(['Cleric']));
  });

  test('offers the second class its own subclass', () => {
    const doctrine = secondSubclassSlot(grants, withDual.lookup, classes);
    expect(doctrine?.options.map((option) => String(option.label))).toEqual(['Cloistered Cleric', 'Warpriest']);
    expect(subclassSlot(grants, withDual.lookup, classes)).toBeUndefined();
  });

  test('takes the better rank of the two classes in each statistic', () => {
    const ranks = characterRanks(grants);
    const alone = characterRanks(characterGrants(fighterCleric, withoutDual));
    expect(rankIn(ranks, 'save:will')).toBe('expert');
    expect(rankIn(ranks, 'save:fortitude')).toBe('expert');
    expect(rankIn(ranks, 'perception')).toBe('expert');
    expect(rankIn(alone, 'save:will')).toBe('trained');
  });

  test('has a key attribute boost for each class, the second a set of its own', () => {
    const sets = boostSets(fighterCleric, withDual.boosts).filter((each) => each.level === 1);
    const second = sets.find((each) => each.source === BoostSource.SecondClass);
    expect(second?.fixed).toEqual(['wis']);
    const firstSlots = sets.find((each) => each.source === BoostSource.Class)?.slots;
    expect(firstSlots?.map((slot) => String(slot.key))).toEqual(['boost:1:class:0']);
    const withoutSets = boostSets(fighterCleric, withoutDual.boosts);
    expect(withoutSets.some((each) => each.source === BoostSource.SecondClass)).toBe(false);
  });

  test('keeps a second key attribute pick in a slot of its own', () => {
    const fighterFighter = new CharacterBuilder()
      .named('Dual')
      .picking('class', playerCoreClassId('cleric'))
      .picking(SECOND_CLASS_SLOT, playerCoreClassId('fighter'))
      .picking(SlotKey.parse('boost:1:second-class:0'), 'str')
      .build().document;
    const second = boostSets(fighterFighter, withDual.boosts).find((each) => each.source === BoostSource.SecondClass);
    expect(second?.slots.map((slot) => [String(slot.key), slot.pick])).toEqual([['boost:1:second-class:0', 'str']]);
  });
});
