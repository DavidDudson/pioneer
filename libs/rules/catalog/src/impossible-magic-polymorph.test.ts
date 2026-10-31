import { describe, expect, test } from 'bun:test';

import { contentPackFromContents } from '@pioneer/rules/sdk';

import { impossibleMagicPack } from './orc-packs';
import { chosen, effectRulesOf, viewOf } from './testing/battle-forms';
import type { FormView } from './testing/battle-forms';

const EFFECTS = contentPackFromContents(await impossibleMagicPack()).otherEntries;

/** The rules of the effect `slug` as plain JSON, so a test can compare them with the data it reads. */
function rulesOf(slug: string): readonly unknown[] {
  const found = EFFECTS.find((entry) => entry.slug === slug);
  if (found === undefined) {
    throw new Error(`${slug} is not in the impossible-magic pack`);
  }
  return structuredClone(found.rules);
}

/** What the druid test character has in `slug` cast at spell rank `rank`. */
function inEffect(slug: string, rank: number): FormView {
  return viewOf(effectRulesOf(slug, rank, EFFECTS), chosen());
}

describe('Impossible Magic: polymorph effects', () => {
  test('Juvenile Companion halves the Speeds, and leaves a Speed the creature lacks at 0', () => {
    const view = inEffect('effect:spell-effect-juvenile-companion', 1);

    expect(view.total('speed:land')).toBe(12);
    expect(view.total('speed:fly')).toBe(0);
  });

  test("Patron's Protector: AC 28 and 20 temporary Hit Points, AC 36 and 30 from the 9th rank", () => {
    const sixth = inEffect('effect:spell-effect-patrons-protector', 6);
    const ninth = inEffect('effect:spell-effect-patrons-protector', 9);

    expect(sixth.temporaryHitPoints).toBe(20);
    expect(ninth.temporaryHitPoints).toBe(30);
    expect(ninth.total('ac') - sixth.total('ac')).toBe(8);
  });

  test('Sudden Swarm: resistances and weaknesses rise by 1 for each rank above the 4th', () => {
    const rules = rulesOf('effect:spell-effect-sudden-swarm');

    expect(rules).toContainEqual({ key: 'Resistance', type: ['piercing', 'slashing'], value: '@item.level' });
    expect(rules).toContainEqual({ key: 'Weakness', type: ['area-damage', 'splash-damage'], value: '@item.level' });
  });
});
