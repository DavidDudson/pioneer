import { describe, expect, test } from 'bun:test';

import { slotContent } from '@pioneer/character/domain';
import type { CharacterDocument } from '@pioneer/character/domain';
import {
  CharacterBuilder,
  FEAT_SLOT_FIGHTER,
  FEAT_SLOT_FIXTURES,
  FEAT_SLOT_KEYS,
  featSlotFixtureId,
  skillFixtures,
} from '@pioneer/character/domain/testing';
import type { FeatSlotFixture } from '@pioneer/character/domain/testing';
import { ContentId, ContentKind, ContentRegistry, ContentText, Level, Slug } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { entryLookup } from './content-lookup';
import { placeFeats } from './feat-placement';
import { ImportKind, PathbuilderName } from './import-kind';
import type { ImportedFeat } from './read-feats';

const registry = new ContentRegistry();
registry.register(skillFixtures());
registry.register(FEAT_SLOT_FIXTURES);
const slots = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const NAMES: readonly FeatSlotFixture[] = ['power-attack', 'lunge', 'knockdown', 'skill-training', 'assurance'];
const lookup = entryLookup({
  [ImportKind.Feat]: NAMES.map((name) => ({ id: featSlotFixtureId(name), name: ContentText.parse(name) })),
});

function fighter(level: number): CharacterDocument {
  return new CharacterBuilder().picking('class', FEAT_SLOT_FIGHTER).atLevel(level).build().document;
}

function feat(name: string, level: number, overrides: Partial<ImportedFeat> = {}): ImportedFeat {
  return {
    name: PathbuilderName.parse(name),
    choice: undefined,
    type: PathbuilderName.parse('Class Feat'),
    level: Level.parse(level),
    slot: undefined,
    slotted: true,
    ...overrides,
  };
}

describe('placeFeats', () => {
  test('puts each feat in the open slot of its level that offers it', () => {
    const { choices, unplaced } = placeFeats(fighter(4), { slots, lookup }, [
      feat('Power Attack', 1),
      feat('Lunge', 2),
      feat('Knockdown', 4),
    ]);
    expect(choices).toStrictEqual({
      [FEAT_SLOT_KEYS.level1]: featSlotFixtureId('power-attack'),
      [FEAT_SLOT_KEYS.level2]: featSlotFixtureId('lunge'),
      [FEAT_SLOT_KEYS.level4]: featSlotFixtureId('knockdown'),
    });
    expect(unplaced).toStrictEqual([]);
  });

  test('leaves a feat unplaced when no slot of its level offers it', () => {
    const wanted = feat('Knockdown', 2);
    const { choices, unplaced } = placeFeats(fighter(4), { slots, lookup }, [wanted]);
    expect(choices).toStrictEqual({});
    expect(unplaced).toStrictEqual([wanted]);
  });

  test('skips awarded and heritage feats, which no slot holds', () => {
    const awarded = feat('Power Attack', 1, { slotted: false });
    expect(placeFeats(fighter(4), { slots, lookup }, [awarded])).toStrictEqual({ choices: {}, unplaced: [] });
  });

  test('a feat is placed once per slot: two wanting the same slot leave one unplaced', () => {
    const { unplaced } = placeFeats(fighter(1), { slots, lookup }, [feat('Power Attack', 1), feat('Power Attack', 1)]);
    expect(unplaced).toHaveLength(1);
  });

  test("answers the feat's own choice with the option of that name", () => {
    const { choices } = placeFeats(fighter(1), { slots, lookup }, [
      feat('Skill Training', 1, { choice: PathbuilderName.parse('Athletics') }),
    ]);
    expect(Object.values(choices)).toContain(Slug.parse('athletics'));
  });
});

describe('placeFeats where two slots of a level offer the same feat', () => {
  const pack = new ContentPackBuilder()
    .withId('labelled-slots')
    .withClass('rogue', ['dex'], {
      rules: [
        {
          key: 'ChoiceSet',
          flag: 'class-feat',
          prompt: 'Rogue feat',
          choices: { kind: 'feat', filter: [{ or: ['item:trait:rogue', 'item:trait:archetype'] }] },
        },
        { key: 'GrantItem', item: { choice: 'class-feat' } },
        {
          key: 'ChoiceSet',
          flag: 'free-archetype',
          prompt: 'Free archetype feat',
          choices: { kind: 'feat', filter: ['item:trait:archetype'] },
        },
        { key: 'GrantItem', item: { choice: 'free-archetype' } },
      ],
    })
    .withFeat('sneak-dedication', { traits: ['archetype', 'dedication'] })
    .build();
  const labelledRegistry = new ContentRegistry();
  labelledRegistry.register(pack);
  const labelledSlots = { ...slotContent(labelledRegistry), namespaces: CORE_NAMESPACES };
  const dedication = ContentId.parse(
    new ContentPackBuilder().withId('labelled-slots').idOf(ContentKind.Feat, 'sneak-dedication'),
  );
  const labelledLookup = entryLookup({
    [ImportKind.Feat]: [{ id: dedication, name: ContentText.parse('Sneak Dedication') }],
  });
  const rogue = new CharacterBuilder()
    .picking(
      'class',
      ContentId.parse(new ContentPackBuilder().withId('labelled-slots').idOf(ContentKind.Class, 'rogue')),
    )
    .atLevel(1)
    .build().document;

  const placedIn = (label: string): string | undefined => {
    const { choices } = placeFeats(rogue, { slots: labelledSlots, lookup: labelledLookup }, [
      feat('Sneak Dedication', 1, { slot: PathbuilderName.parse(label) }),
    ]);
    return Object.keys(choices)[0];
  };

  test('puts an archetype feat in the slot Pathbuilder labels, the class feat slot or the free archetype one', () => {
    const classSlot = placedIn('Rogue Feat 1');
    const freeSlot = placedIn('Free Archetype 1');
    expect(classSlot).toBeDefined();
    expect(freeSlot).toBeDefined();
    expect(classSlot).not.toBe(freeSlot);
  });
});
