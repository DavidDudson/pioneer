import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PrerequisiteStatus } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { CharacterBuilder, playerCoreClassId } from '@pioneer/character/domain/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import { PackId, packContentsFromFiles } from '@pioneer/rules/sdk';
import type { ContentRegistry, PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { beforeAll, describe, expect, it } from 'vitest';

import { classFeatSlotKey } from '../testing/class-feat-slots';
import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { cutTo } from '../testing/test-packs';
import { featFieldsOf, plannedFeatFieldsOf } from './sheet-feat-picks';
import type { FeatPickSources } from './sheet-feat-picks';
import { FEAT_CONTENT_KINDS, sheetFeats } from './sheet-feats';
import type { SheetFeats } from './sheet-feats';

const FIGHTER = ['fighter'];
const FEAT_PACKS = cutTo(FEAT_CONTENT_KINDS);
const FIGHTER_FEAT_1 = await classFeatSlotKey('fighter', 1);

const prerequisites = (text: string): object[] => [{ type: 'paragraph', content: [{ type: 'text', text }] }];

function keysOf(read: readonly { readonly key: string }[] | undefined): readonly string[] {
  return (read ?? []).map((each) => each.key);
}

const GATED_FEATS_PACK = 'gated-feats';

/** A fighter feat that waits on 4th level, so a slot below it holds it back and a slot from it offers it. */
const gatedFeats = new ContentPackBuilder()
  .withId(GATED_FEATS_PACK)
  .withFeat('veteran-stance', {
    traits: FIGHTER,
    data: {
      prerequisites: prerequisites('4th level'),
      prerequisitePredicate: [{ gte: ['self:level', 4] }],
    },
  })
  .build();

const GATED_FEATS: PackContentsLoader = {
  id: PackId.parse(GATED_FEATS_PACK),
  load: async (): Promise<PackContents> =>
    packContentsFromFiles(
      { id: GATED_FEATS_PACK, title: 'Gated feats', publisher: 'Pioneer tests', license: 'homebrew' },
      [gatedFeats.otherEntries],
    ),
};

/** The fighter's 2nd- and 4th-level class feat slots: the class and the rule index of each `ChoiceSet`. */
const FIGHTER_FEAT_2 = await classFeatSlotKey('fighter', 2);
const FIGHTER_FEAT_4 = await classFeatSlotKey('fighter', 4);

/** A fighter at `level`. */
function fighterAt(level: number): Character {
  return new CharacterBuilder().atLevel(level).picking('class', playerCoreClassId('fighter')).build();
}

async function gatedRegistry(): Promise<ContentRegistry> {
  TestBed.configureTestingModule({ providers: provideServerStateTesting([], [...FEAT_PACKS, GATED_FEATS]) });
  return TestBed.inject(ContentLoader).registry(FEAT_CONTENT_KINDS);
}

/** The planned slot `key`'s Veteran-stance: whether its prerequisites are met at the slot's level. */
function stanceAt(feats: SheetFeats, key: string): PrerequisiteStatus | undefined {
  return feats.planned.find((slot) => slot.key === key)?.options.find((option) => option.label === 'Veteran-stance')
    ?.status;
}

describe(sheetFeats, () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], [...FEAT_PACKS, GATED_FEATS]);
  }, PREBUILD_TIMEOUT);

  it('reads the slots above the character’s level as the plan, and the rest as its feats', async () => {
    const registry = await gatedRegistry();

    const atOne = sheetFeats(registry, fighterAt(1), []);
    const atTwo = sheetFeats(registry, fighterAt(2), []);

    expect(atOne.slots.map((slot) => slot.key)).toContain(FIGHTER_FEAT_1);
    expect(atOne.planned.map((slot) => slot.key)).toContain(FIGHTER_FEAT_2);
    expect(atOne.slots.map((slot) => slot.key)).not.toContain(FIGHTER_FEAT_2);
    expect(atTwo.slots.map((slot) => slot.key)).toContain(FIGHTER_FEAT_2);
    expect(atTwo.planned.map((slot) => slot.key)).not.toContain(FIGHTER_FEAT_2);
  });

  it('holds a feat back in a planned slot below the level it needs, and offers it from that level', async () => {
    const registry = await gatedRegistry();

    const feats = sheetFeats(registry, fighterAt(1), []);

    expect(stanceAt(feats, FIGHTER_FEAT_2)).toBe(PrerequisiteStatus.Unmet);
    expect(stanceAt(feats, FIGHTER_FEAT_4)).toBe(PrerequisiteStatus.Met);
  });
});

describe('feat pickers across a level change', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], [...FEAT_PACKS, GATED_FEATS]);
  }, PREBUILD_TIMEOUT);

  it('moves a slot from the planned pickers to the feats once the level reaches it', async () => {
    const registry = await gatedRegistry();
    const character = signal<Character | undefined>(fighterAt(1));
    const sources: FeatPickSources = {
      registry: signal(registry),
      character,
      slots: signal([]),
      select: async () => undefined,
      clear: async () => undefined,
      translate: (key) => key,
      showGrantOnly: signal(false),
      messages: signal(undefined),
    };
    const { fields, planned } = TestBed.runInInjectionContext(() => ({
      fields: featFieldsOf(sources),
      planned: plannedFeatFieldsOf(sources),
    }));

    expect(keysOf(fields()?.fields)).toContain(FIGHTER_FEAT_1);
    expect(keysOf(planned())).toContain(FIGHTER_FEAT_2);

    character.set(fighterAt(2));

    expect(keysOf(fields()?.fields)).toContain(FIGHTER_FEAT_2);
    expect(keysOf(planned())).not.toContain(FIGHTER_FEAT_2);
    expect(keysOf(planned())).toContain(FIGHTER_FEAT_4);
  });
});
