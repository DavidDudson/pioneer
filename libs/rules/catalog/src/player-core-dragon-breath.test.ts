import { describe, expect, test } from 'bun:test';

import { alterAction } from '@pioneer/rules/engine';
import { PredicateFacts, withKnown } from '@pioneer/rules/predicate';
import { contentPackFromContents, RollOption, RollOptionNamespace } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

import { playerCorePack } from './json-packs';
import { effectRulesOf } from './testing/battle-forms';
import { coreNamespaces } from './testing/fighter';

const BREATH_SLUG = 'action:dragon-breath-dragon-form';

const ENTRIES = contentPackFromContents(await playerCorePack()).otherEntries;

function breathEntry(): ContentEntry {
  const found = ENTRIES.find(({ slug }) => slug === BREATH_SLUG);
  if (found === undefined) {
    throw new Error(`${BREATH_SLUG} is not in the player-core pack`);
  }
  return found;
}

const breath = breathEntry();

const FORMULA = /"formula":"(?<formula>[^"]+)"/u;
const DAMAGE_TYPE = /"damageType":"(?<type>[^"]+)"/u;

/** What the sheet reads once the druid picks `dragon-form:<type>`: the namespace a choice writes to is known. */
function pickedFacts(type?: string): PredicateFacts {
  const namespaces = withKnown(coreNamespaces(), [RollOptionNamespace.parse('dragon-form')]);
  return new PredicateFacts(type === undefined ? [] : [RollOption.parse(`dragon-form:${type}`)], namespaces);
}

interface BreathReading {
  readonly traits: readonly string[];
  /** The dice and the damage type of the first damage the description deals. */
  readonly damage: readonly (string | undefined)[];
}

/** The Dragon Breath of a druid in Dragon Form as the dragon `type`, cast at `rank`, as its traits and damage read. */
function breathOf(type: string, rank: number): BreathReading {
  const rules = effectRulesOf('effect:spell-effect-dragon-form', rank);
  const altered = alterAction({ rules, facts: pickedFacts(type) }, breath);
  const text = JSON.stringify(altered.description);
  const damage = [FORMULA.exec(text)?.groups?.['formula'], DAMAGE_TYPE.exec(text)?.groups?.['type']];
  return { traits: altered.traits.map(String), damage };
}

describe('Player Core: Dragon Form, Dragon Breath', () => {
  test('the breath takes the damage type and tradition of the dragon, and 10d6 at the 6th rank', () => {
    const magma = breathOf('magma', 6);

    expect(magma.traits).toContain('fire');
    expect(magma.damage).toEqual(['10d6', 'fire']);
  });

  test('from the 8th rank the breath deals 14d6', () => {
    expect(breathOf('magma', 8).damage).toEqual(['14d6', 'fire']);
  });

  test('a dragon whose breath names no damage trait (brine) gets the type but not the trait', () => {
    const brine = breathOf('brine', 6);

    expect(brine.traits).not.toContain('bludgeoning');
    expect(brine.damage).toEqual(['10d6', 'bludgeoning']);
  });

  test('without a pick the breath reads as written', () => {
    const plain = alterAction(
      { rules: effectRulesOf('effect:spell-effect-dragon-form', 6), facts: pickedFacts() },
      breath,
    );

    expect(plain.traits).toEqual(breath.traits);
    expect(plain.description).toEqual(breath.description);
  });
});
