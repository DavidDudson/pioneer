import { TargetValue } from '@pioneer/rules/sdk';
import type { DamageType } from '@pioneer/rules/sdk';
import type { SpellDetailLine, SpellRowLine } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { spellLine } from '../testing/spell-line-testing';
import {
  filterSpells,
  NO_SPELL_FILTER,
  spellFilterFromQuery,
  SpellFilterGroupId,
  spellFilterGroups,
  spellFilterToQuery,
  withSpellPicks,
  wordValue,
} from './sheet-spell-filter';
import type { SourcedSpell, SpellPicks } from './sheet-spell-filter';

interface Spell {
  readonly name: string;
  readonly source?: string;
  readonly targets?: ReadonlyArray<TargetValue>;
  readonly traits?: ReadonlyArray<string>;
  readonly damage?: ReadonlyArray<DamageType>;
  readonly cost?: SpellDetailLine['cost'];
}

function spell({ name, source, targets, traits, damage, cost }: Spell): SourcedSpell {
  const detail = spellLine({ slug: name.toLowerCase().replaceAll(' ', '-'), name, targets, traits, damage, cost });

  const line: SpellRowLine = { key: name, detail };

  return { line, source };
}

const SPELLS: ReadonlyArray<SourcedSpell> = [
  spell({ name: 'Daze', source: 'Cleric', targets: [TargetValue.Single], traits: ['Mental'], damage: ['mental'] }),
  spell({
    name: 'Fireball',
    source: 'Wizard',
    targets: [TargetValue.Multiple],
    traits: ['Fire'],
    damage: ['fire'],
    cost: { kind: 'actions', cost: 'two', upTo: undefined },
  }),
  spell({ name: 'Wand of Fear', source: 'Wand of Fear', targets: [TargetValue.Single], traits: ['Fear', 'Mental'] }),
];

const picks = (...entries: ReadonlyArray<readonly [SpellFilterGroupId, ReadonlyArray<string>]>): SpellPicks =>
  new Map(entries.map(([group, values]) => [group, new Set(values)]));

const names = (spells: ReadonlyArray<SourcedSpell>): Array<string> => spells.map(({ line }) => line.detail.name);

describe(filterSpells, () => {
  it('keeps every spell when nothing is picked', () => {
    expect(names(filterSpells(SPELLS, NO_SPELL_FILTER))).toStrictEqual(['Daze', 'Fireball', 'Wand of Fear']);
  });

  it('keeps a spell with any value picked within a group', () => {
    const filter = picks([SpellFilterGroupId.Trait, ['Fire', 'Fear']]);

    expect(names(filterSpells(SPELLS, filter))).toStrictEqual(['Fireball', 'Wand of Fear']);
  });

  it('keeps only the spells that pass every group', () => {
    const filter = picks([SpellFilterGroupId.Trait, ['Mental']], [SpellFilterGroupId.Target, [TargetValue.Single]]);
    const filtered = new Map([...filter, [SpellFilterGroupId.Source, new Set(['Cleric'])]]);

    expect(names(filterSpells(SPELLS, filter))).toStrictEqual(['Daze', 'Wand of Fear']);
    expect(names(filterSpells(SPELLS, filtered))).toStrictEqual(['Daze']);
  });

  it('filters by damage type and by action cost', () => {
    const fire = filterSpells(SPELLS, picks([SpellFilterGroupId.Damage, ['fire']]));
    const two = filterSpells(SPELLS, picks([SpellFilterGroupId.Actions, ['two']]));

    expect(names(fire)).toStrictEqual(['Fireball']);
    expect(names(two)).toStrictEqual(['Fireball']);
  });

  it('reads a variable cost as each count it spans', () => {
    const variable = spell({ name: 'Heal', cost: { kind: 'actions', cost: 'one', upTo: 'three' } });

    expect(filterSpells([variable], picks([SpellFilterGroupId.Actions, ['three']]))).toHaveLength(1);
  });
});

describe(spellFilterGroups, () => {
  const words = { label: (key: string): string => key, value: wordValue((key) => key) };

  it('offers only the values the spells have, each with the spells it would leave', () => {
    const groups = spellFilterGroups(SPELLS, NO_SPELL_FILTER, words);

    const traits = groups.find(({ id }) => id === SpellFilterGroupId.Trait);
    expect(traits?.options.map(({ value, count }) => [value, count])).toStrictEqual([
      ['Fear', 1],
      ['Fire', 1],
      ['Mental', 2],
    ]);
  });

  it('counts a group against the picks of the other groups', () => {
    const groups = spellFilterGroups(SPELLS, picks([SpellFilterGroupId.Target, [TargetValue.Single]]), words);

    const traits = groups.find(({ id }) => id === SpellFilterGroupId.Trait);
    expect(traits?.options.map(({ value, count }) => [value, count])).toStrictEqual([
      ['Fear', 1],
      ['Mental', 2],
    ]);
  });

  it('keeps a pick no spell has, at zero, so it can be cleared', () => {
    const groups = spellFilterGroups(SPELLS, picks([SpellFilterGroupId.Source, ['Gone']]), words);

    const sources = groups.find(({ id }) => id === SpellFilterGroupId.Source);
    expect(sources?.options.find(({ value }) => value === 'Gone')?.count).toBe(0);
  });

  it('words a target with the keys the old target filter used', () => {
    const groups = spellFilterGroups(SPELLS, NO_SPELL_FILTER, words);

    const targets = groups.find(({ id }) => id === SpellFilterGroupId.Target);
    expect(targets?.options.map(({ label }) => label)).toContain('character.sheet.spellTargets.single');
  });
});

describe('spell filters in the URL', () => {
  it('round-trips the picks, a value with a comma included', () => {
    const filter = picks(
      [SpellFilterGroupId.Source, ['Wand, Greater', 'Cleric']],
      [SpellFilterGroupId.Trait, ['Mental']],
    );

    expect(spellFilterFromQuery(spellFilterToQuery(filter))).toStrictEqual(filter);
  });

  it('clears the params of a group with no picks', () => {
    const query = spellFilterToQuery(picks([SpellFilterGroupId.Trait, ['Mental']]));

    expect(query['s.trait']).toStrictEqual(['Mental']);
    expect(query['s.source']).toBeUndefined();
    expect(Object.keys(query)).toContain('s.source');
  });

  it('reads a single param and ignores what is not text', () => {
    const filter = spellFilterFromQuery({ 's.trait': 'Mental', 's.source': 1, 's.damage': undefined });

    expect(filter).toStrictEqual(picks([SpellFilterGroupId.Trait, ['Mental']]));
  });
});

describe(withSpellPicks, () => {
  it('drops a group with nothing picked, and ignores an unknown one', () => {
    const filter = picks([SpellFilterGroupId.Trait, ['Mental']]);

    expect(withSpellPicks(filter, SpellFilterGroupId.Trait, new Set())).toStrictEqual(NO_SPELL_FILTER);
    expect(withSpellPicks(filter, 'nope', new Set(['x']))).toBe(filter);
  });
});
