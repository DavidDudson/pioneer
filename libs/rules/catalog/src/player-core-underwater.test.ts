import { describe, expect, test } from 'bun:test';

import { ContentKind, contentPackFromContents, RuleElementKey } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

import { playerCorePack } from './json-packs';

const PLAYER_CORE = contentPackFromContents(await playerCorePack()).otherEntries;

/** The committed underwater environment: Aquatic Combat, Player Core page 437. */
function underwater(): ContentEntry {
  const found = PLAYER_CORE.find(({ slug }) => slug === 'environment:underwater');
  if (found === undefined) {
    throw new Error('environment:underwater is not in the player-core entries');
  }
  return found;
}

describe('Player Core underwater environment', () => {
  test('is an environment citing Aquatic Combat on Player Core page 437', () => {
    const { kind, sources } = underwater();

    expect(kind).toBe(ContentKind.Environment);
    expect(sources).toMatchObject([{ kind: 'book', book: 'player-core', page: 437 }]);
  });

  test('forbids fire actions, and speech costs the air', () => {
    const { data } = underwater();

    expect(data).toMatchObject({ restrictions: [{ id: 'fire-effects' }, { id: 'speech' }] });
  });

  test('gives resistance 5 to acid and fire', () => {
    const resistance = underwater().rules.find((rule) => rule.key === RuleElementKey.Resistance);

    expect(resistance).toMatchObject({ type: ['acid', 'fire'], value: 5 });
  });

  test('makes the character off-guard unless they have a swim Speed', () => {
    const grant = underwater().rules.find((rule) => rule.key === RuleElementKey.GrantItem);

    expect(JSON.stringify(grant?.predicate)).toBe(
      JSON.stringify([{ nor: ['aquatic-combat:not-off-guard', 'speed:swim'] }]),
    );
  });

  test('takes 2 off the attack roll of bludgeoning and slashing attacks, and halves ranged increments in a note', () => {
    const { rules } = underwater();
    const penalty = rules.find((rule) => rule.key === RuleElementKey.FlatModifier);
    const note = rules.find((rule) => rule.key === RuleElementKey.Note);

    expect(penalty).toMatchObject({ selectors: ['attack-roll'], type: 'circumstance', value: -2 });
    expect(note).toMatchObject({ selectors: ['ranged-attack-roll'] });
  });
});

describe('Aquatic Combat effect', () => {
  test('is not committed beside the underwater environment, which would apply its rules twice', () => {
    expect(PLAYER_CORE.some(({ slug }) => slug === 'effect:effect-aquatic-combat')).toBe(false);
  });
});
