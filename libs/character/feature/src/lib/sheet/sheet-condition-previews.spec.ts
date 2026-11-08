import { TestBed } from '@angular/core/testing';
import { ConditionInstanceId, UNLIMITED, withPlay } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { CharacterBuilder, clumsyFixtureId, ITEM_FIXTURE_FILES } from '@pioneer/character/domain/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import { EffectChange } from '@pioneer/rules/engine';
import { ConditionValue, ContentId, ContentKind, ContentRegistry, RichText } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { genericConditionPreview, sheetConditionPreviews, withHeldConditions } from './sheet-condition-previews';
import { sheetEntryPreviews, sheetFetchingPreviews } from './sheet-entry-previews';
import { EQUIPMENT_CONTENT_KINDS } from './sheet-equipment';

const INSTANCE = ConditionInstanceId.parse('00000000-0000-4000-8000-000000000001');

async function registry(): Promise<ContentRegistry> {
  TestBed.configureTestingModule({ providers: provideServerStateTesting([ITEM_FIXTURE_FILES]) });
  return TestBed.inject(ContentLoader).registry(EQUIPMENT_CONTENT_KINDS);
}

/** A character with clumsy 2, or with no condition. */
function clumsyCharacter(clumsy: boolean): Character {
  const built = new CharacterBuilder().build();
  return clumsy
    ? withPlay(built, {
        ...built.document.play,
        conditions: [
          {
            id: INSTANCE,
            condition: clumsyFixtureId(),
            value: ConditionValue.parse(2),
            duration: UNLIMITED,
          },
        ],
      })
    : built;
}

describe(sheetConditionPreviews, () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('previews a condition the character has with its value and the penalties it applies', async () => {
    const held = await registry();
    const previews = TestBed.runInInjectionContext(() =>
      sheetConditionPreviews(
        () => held,
        () => clumsyCharacter(true),
      ),
    );
    const preview = previews.preview(clumsyFixtureId());

    expect(preview?.value).toBe(2);
    expect(preview?.effects?.map(({ statistic }) => statistic)).toContain('Armor Class');
    expect(preview?.effects?.every(({ line }) => line.change === EffectChange.Penalty)).toBe(true);
  });

  it('previews a condition the character lacks as its entry alone', async () => {
    const held = await registry();
    const previews = TestBed.runInInjectionContext(() =>
      sheetConditionPreviews(
        () => held,
        () => clumsyCharacter(false),
      ),
    );
    const preview = previews.preview(clumsyFixtureId());

    expect(preview?.name).toBeDefined();
    expect(preview?.effects).toBeUndefined();
  });

  it('previews any entry with what it would do to the character, derived only when the card reads it', async () => {
    const held = await registry();
    const previews = TestBed.runInInjectionContext(() =>
      sheetFetchingPreviews(
        () => held,
        () => clumsyCharacter(false),
      ),
    );
    const preview = previews.preview(clumsyFixtureId());

    expect(preview?.effects?.map(({ statistic }) => statistic)).toContain('Armor Class');
  });

  describe(withHeldConditions, () => {
    it('previews a held condition a section does not hold with its value and effects', async () => {
      const held = await registry();
      const character = clumsyCharacter(true);
      const layered = withHeldConditions(
        sheetEntryPreviews(() => undefined),
        { registry: () => held, character: () => character },
      );
      const preview = layered.preview(clumsyFixtureId());

      expect(preview?.value).toBe(2);
      expect(preview?.effects?.map(({ statistic }) => statistic)).toContain('Armor Class');
    });

    it("keeps the section's own preview for a condition the character lacks", async () => {
      const held = await registry();
      const character = clumsyCharacter(false);
      const layered = withHeldConditions(
        sheetEntryPreviews(() => held),
        {
          registry: () => held,
          character: () => character,
        },
      );
      const preview = layered.preview(clumsyFixtureId());

      expect(preview?.name).toBeDefined();
      expect(preview?.value).toBeUndefined();
      expect(preview?.effects).toBeUndefined();
    });
  });
});

describe(genericConditionPreview, () => {
  const ENDING_TEXT = RichText.parse([{ type: 'paragraph', content: [{ type: 'text', text: 'Rest ends it.' }] }]);
  const pack = new ContentPackBuilder()
    .withId('generic-condition')
    .withCondition('dazed', [], {
      recovery: [{ kind: 'automatic', trigger: 'rest', change: { effect: 'remove' }, text: ENDING_TEXT }],
    })
    .withCondition('plain');
  const held = new ContentRegistry();
  held.register(pack.build());

  it('previews a condition with the ways it ends, for a reader who lacks it', () => {
    const dazed = ContentId.parse(pack.idOf(ContentKind.Condition, 'dazed'));
    const preview = genericConditionPreview(held, dazed);

    expect(preview?.endings?.map(({ kind }) => kind)).toStrictEqual(['automatic']);
    expect(preview?.effects).toBeUndefined();
  });

  it('previews a condition with no endings as its entry alone', () => {
    const plain = ContentId.parse(pack.idOf(ContentKind.Condition, 'plain'));
    const preview = genericConditionPreview(held, plain);

    expect(preview?.name).toBeDefined();
    expect(preview?.endings).toBeUndefined();
  });

  it('previews nothing for an entry that is not a condition, or a registry still loading', () => {
    const feat = new ContentPackBuilder().withId('generic-feat').withFeat('toughness');

    const dazed = ContentId.parse(pack.idOf(ContentKind.Condition, 'dazed'));
    const toughness = ContentId.parse(feat.idOf(ContentKind.Feat, 'toughness'));
    const other = new ContentRegistry();
    other.register(feat.build());

    expect(genericConditionPreview(undefined, dazed)).toBeUndefined();
    expect(genericConditionPreview(other, toughness)).toBeUndefined();
  });
});
