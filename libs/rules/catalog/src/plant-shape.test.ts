import { describe, expect, test } from 'bun:test';

import { evaluatePredicate, PredicateFacts, Truth } from '@pioneer/rules/predicate';
import { ContentEntryFile, ContentKind, RollOption, RuleElementKey } from '@pioneer/rules/sdk';
import type { RuleElement } from '@pioneer/rules/sdk';

import { coreNamespaces } from './testing/fighter';

const PLANT_FORM_RANK_CAP = 10;

/** The rule elements of the Plant Shape feat, read from the player-core pack. */
async function plantShapeRules(): Promise<readonly RuleElement[]> {
  const file = await import('@pioneer/content/packs/player-core/feat.json');
  const feat = ContentEntryFile.parse(file.default).find(
    (entry) => entry.kind === ContentKind.Feat && entry.slug === 'feat:plant-shape',
  );
  return feat?.rules ?? [];
}

/** The ranks Plant Form is innate at for a druid of `level`, with Untamed Form or without it. */
async function innateRanks(level: number, untamedForm: boolean): Promise<readonly number[]> {
  const options = [`self:level:${level}`, 'feat:plant-shape', ...(untamedForm ? ['feat:untamed-form'] : [])];
  const facts = new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    coreNamespaces(),
  );
  const rules = await plantShapeRules();
  return rules
    .filter((rule) => rule.key === RuleElementKey.InnateSpells)
    .filter((rule) => rule.predicate === undefined || evaluatePredicate(rule.predicate, facts) === Truth.True)
    .flatMap((rule) => rule.spells.map(({ rank }) => Number(rank)));
}

describe('Player Core: Plant Shape', () => {
  test.each([
    [10, 5],
    [11, 6],
    [12, 6],
    [13, 7],
    [15, 8],
    [17, 9],
    [19, PLANT_FORM_RANK_CAP],
    [20, PLANT_FORM_RANK_CAP],
  ])('a level %i druid without Untamed Form casts Plant Form once a day at rank %i', async (level, rank) => {
    expect(await innateRanks(level, false)).toStrictEqual([rank]);
  });

  test('a druid with Untamed Form gets no innate Plant Form', async () => {
    expect(await innateRanks(14, true)).toStrictEqual([]);
  });

  test('the innate entry exists only without Untamed Form', async () => {
    const rules = await plantShapeRules();
    const entries = rules.filter((rule) => rule.key === RuleElementKey.SpellcastingEntry);

    expect(entries).toHaveLength(1);
    const predicate: unknown = entries[0]?.predicate;
    expect(predicate).toStrictEqual([{ not: 'feat:untamed-form' }]);
  });
});
