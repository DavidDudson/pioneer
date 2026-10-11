import { describe, expect, test } from 'bun:test';

import { deriveStatistics, LineStatusKind, StatisticInputsJson } from '@pioneer/rules/engine';
import type { StatisticResult } from '@pioneer/rules/engine';
import { statistic } from '@pioneer/rules/engine/testing';
import type { GrantResolution } from '@pioneer/rules/grants';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { ChoiceValue, ContentKind, ContentRegistry, Level, RollOption, Selector, SlotKey } from '@pioneer/rules/sdk';
import { ContentPackBuilder, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { ANCESTRY_SLOT, HERITAGE_SLOT } from './character-slots';
import { grantedRules } from './granted-rules';
import { resolveSlotsAt, slotContent } from './slot-offer';

/** Keen Eyes, as Player Core has it: +2 circumstance to Seek hidden or undetected creatures within 30 feet. */
const KEEN_EYES_BONUS = 2;
const seekBonus = {
  key: 'FlatModifier',
  selectors: ['perception'],
  type: 'circumstance',
  value: KEEN_EYES_BONUS,
  predicate: [
    'action:seek',
    { lte: ['target:distance', 30] },
    { or: ['target:condition:hidden', 'target:condition:undetected'] },
  ],
};

const pack = new ContentPackBuilder().withId('player-core').withAncestryFeature('keen-eyes', [seekBonus]);
const keenEyes = { key: 'GrantItem', item: pack.idOf(ContentKind.AncestryFeature, 'keen-eyes') };
pack
  .withAncestry('halfling', { rules: [keenEyes] })
  .withAncestry('human')
  .withHeritage('sharp-eyed-human', 'human', [keenEyes]);
const registry = new ContentRegistry();
registry.register(pack.build());

/** The grants of a level 1 character with these root picks. */
function grantsOf(picks: Readonly<Record<string, string>>): GrantResolution {
  return resolveSlotsAt(Level.parse(1), {
    ...slotContent(registry),
    picks: new Map(Object.entries(picks).map(([key, value]) => [SlotKey.parse(key), ChoiceValue.parse(value)])),
  });
}

function grantedNames(resolution: GrantResolution): readonly string[] {
  return resolution.items
    .map(({ entry }) => `${entry.kind}: ${entry.name}`)
    .toSorted((left, right) => left.localeCompare(right));
}

const PERCEPTION = Selector.parse('perception');
const inputs = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});

/** The character's Perception with `situation` as the roll options of the check. */
function perception(resolution: GrantResolution, situation: readonly string[]): StatisticResult | undefined {
  const facts = new PredicateFacts(
    situation.map((option) => RollOption.parse(option)),
    new Map(),
  );
  const content = { definitions: [statistic('perception', '0')], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
  return deriveStatistics(content, inputs, { rules: grantedRules(resolution), facts }).get(PERCEPTION);
}

describe('ancestry features', () => {
  test('an ancestry grants its ancestry feature', () => {
    const resolution = grantsOf({ [ANCESTRY_SLOT]: pack.idOf(ContentKind.Ancestry, 'halfling') });

    expect(resolution.errors).toEqual([]);
    expect(grantedNames(resolution)).toEqual(['ancestry-feature: Keen-eyes', 'ancestry: Halfling']);
  });

  test('a heritage grants its ancestry feature', () => {
    const resolution = grantsOf({
      [ANCESTRY_SLOT]: pack.idOf(ContentKind.Ancestry, 'human'),
      [HERITAGE_SLOT]: pack.idOf(ContentKind.Heritage, 'sharp-eyed-human'),
    });

    expect(resolution.errors).toEqual([]);
    expect(grantedNames(resolution)).toEqual([
      'ancestry-feature: Keen-eyes',
      'ancestry: Human',
      'heritage: Sharp-eyed-human',
    ]);
  });

  test('a heritage granting Keen Eyes gives the character its Seek bonus, only while Seeking a hidden creature', () => {
    const resolution = grantsOf({
      [ANCESTRY_SLOT]: pack.idOf(ContentKind.Ancestry, 'human'),
      [HERITAGE_SLOT]: pack.idOf(ContentKind.Heritage, 'sharp-eyed-human'),
    });
    const seeking = perception(resolution, ['action:seek', 'target:distance:20', 'target:condition:hidden']);
    const tooFar = perception(resolution, ['action:seek', 'target:distance:40', 'target:condition:hidden']);

    expect(seeking).toMatchObject({
      ok: true,
      total: KEEN_EYES_BONUS,
      lines: [{ status: { kind: LineStatusKind.Applied } }],
    });
    expect(tooFar).toMatchObject({ ok: true, total: 0 });
  });

  test('without it, Perception has no Seek bonus', () => {
    const resolution = grantsOf({ [ANCESTRY_SLOT]: pack.idOf(ContentKind.Ancestry, 'human') });

    expect(perception(resolution, ['action:seek', 'target:distance:20', 'target:condition:hidden'])).toMatchObject({
      ok: true,
      total: 0,
      lines: [],
    });
  });
});
