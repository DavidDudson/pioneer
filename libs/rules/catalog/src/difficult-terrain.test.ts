import { describe, expect, test } from 'bun:test';

import { deriveStatistics, factsUnderForm } from '@pioneer/rules/engine';
import type { RuleInPlay } from '@pioneer/rules/engine';
import { inPlay } from '@pioneer/rules/engine/testing';
import { ContentEntryFile, ContentKind, RuleElementKey, Selector } from '@pioneer/rules/sdk';

import { core, fighter, noFacts, totals } from './testing/core-rules';

const LAND = Selector.parse('speed:land');
const SQUARE = 5;
const DIFFICULT = 'environment:difficult-terrain';
const GREATER = 'environment:greater-difficult-terrain';
const AVATAR_ERASTIL = 'effect:spell-effect-avatar-erastil';
const AVATAR_ABADAR = 'effect:spell-effect-avatar-abadar';

/** The rule elements of a player-core entry of `kind`, by slug, as rules in play on that entry. */
async function rulesOf(
  kind: ContentKind,
  slug: string,
  keys: readonly RuleElementKey[],
): Promise<readonly RuleInPlay[]> {
  const file =
    kind === ContentKind.Environment
      ? await import('@pioneer/content/packs/player-core/environment.json')
      : await import('@pioneer/content/packs/player-core/effect.json');
  const entry = ContentEntryFile.parse(file.default).find((each) => each.kind === kind && each.slug === slug);
  const elements = (entry?.rules ?? []).filter((rule) => keys.includes(rule.key));
  return elements.map((element) => inPlay(element, slug.replace(/^[a-z]+:/u, '')));
}

/** The land Speed the fighter has with `rules` in play, the facts read through the immunities among them. */
function landSpeed(rules: readonly RuleInPlay[]): number | undefined {
  const facts = factsUnderForm({ rules, facts: noFacts() });
  return totals(deriveStatistics(core, fighter, { rules, facts }))[LAND];
}

/** The fighter's land Speed on open ground. */
const OWN_SPEED = landSpeed([]) ?? 0;
const IMMUNITY = [RuleElementKey.Immunity];
const COST = [RuleElementKey.MovementCost];

describe('difficult terrain in Player Core', () => {
  test('the fighter has a land Speed to lose', () => {
    expect(OWN_SPEED).toBeGreaterThanOrEqual(SQUARE * 2);
  });

  test('difficult terrain lowers the land Speed to what a Stride covers', async () => {
    const terrain = await rulesOf(ContentKind.Environment, DIFFICULT, COST);

    expect(landSpeed(terrain)).toBe(Math.floor(OWN_SPEED / (SQUARE * 2)) * SQUARE);
  });

  test('greater difficult terrain lowers it further', async () => {
    const terrain = await rulesOf(ContentKind.Environment, GREATER, COST);

    expect(landSpeed(terrain)).toBe(Math.floor(OWN_SPEED / (SQUARE * 3)) * SQUARE);
  });

  test.each([DIFFICULT, GREATER])('Avatar of Erastil ignores %s', async (environment) => {
    const terrain = await rulesOf(ContentKind.Environment, environment, COST);
    const avatar = await rulesOf(ContentKind.Effect, AVATAR_ERASTIL, IMMUNITY);

    expect(landSpeed([...avatar, ...terrain])).toBe(OWN_SPEED);
  });

  test('Avatar of Abadar does not ignore difficult terrain', async () => {
    const terrain = await rulesOf(ContentKind.Environment, DIFFICULT, COST);
    const avatar = await rulesOf(ContentKind.Effect, AVATAR_ABADAR, IMMUNITY);

    expect(landSpeed([...avatar, ...terrain])).toBe(Math.floor(OWN_SPEED / (SQUARE * 2)) * SQUARE);
  });
});
