import { GrantsMessage } from '@pioneer/rules/grants';
import { describe, expect, it } from 'vitest';

import {
  EXAMPLE_GRANT_ENTRIES,
  EXAMPLE_GRANT_LEVEL,
  EXAMPLE_GRANT_PICKS,
  EXAMPLE_GRANT_ROOTS,
  EXAMPLE_GRANT_TOGGLES,
} from './grant-examples';
import { checkGrants, GrantsStatus } from './grants-check';
import type { GrantsCheck, GrantsTexts } from './grants-check';
import { EXAMPLE_FACTS } from './predicate-verdict';
import { CheckStatus } from './rules-check';

/** The grants tool with the example texts unless given. */
function check(texts: Partial<GrantsTexts>): GrantsCheck {
  return checkGrants({
    entries: EXAMPLE_GRANT_ENTRIES,
    roots: EXAMPLE_GRANT_ROOTS,
    picks: EXAMPLE_GRANT_PICKS,
    toggles: EXAMPLE_GRANT_TOGGLES,
    facts: EXAMPLE_FACTS,
    level: EXAMPLE_GRANT_LEVEL,
    ...texts,
  });
}

/** What the example's first open slot offers, as typed, at `level`. */
function offeredAt(level: number): string[] {
  const result = check({ level });
  return result.status === GrantsStatus.Valid ? (result.open[0]?.options.map((option) => option.value) ?? []) : [];
}

/** The names on the character, for a check that resolves. */
function itemNames(result: GrantsCheck): string[] {
  return result.status === GrantsStatus.Valid ? result.items.map((item) => item.name) : [];
}

describe(checkGrants, () => {
  it('opens on an example that resolves, roots in id order, each entry with the chain that granted it', () => {
    expect(check({})).toMatchObject({
      status: GrantsStatus.Valid,
      items: [
        { name: 'Fighter', via: [] },
        { name: 'Shield Block (fighter)', via: ['Fighter'] },
        { name: 'Shield Block', via: ['Fighter', 'Shield Block (fighter)'] },
        { name: 'Reactive Strike', via: ['Fighter'] },
        { name: 'Bravery', via: ['Fighter'] },
        { name: 'Woodland Elf', via: [] },
      ],
      duplicates: [{ name: 'Shield Block', via: [] }],
      conditional: [{ name: 'Climb in forest', via: ['Woodland Elf'] }],
      open: [{ slot: 'fighter:4', title: 'Fighter feat', pick: undefined }],
      answered: [{ slot: 'fighter:6', title: 'Weapon group', pick: 'sword' }],
      toggles: [{ slot: 'fighter:7', option: 'self:effect:raise-a-shield', on: true, suboption: undefined }],
      rollOptions: [
        'feature:bravery',
        'feature:fighter',
        'feature:reactive-strike',
        'feature:shield-block',
        'feature:shield-block-feature',
        'feature:woodland-elf',
        'self:effect:raise-a-shield',
        'self:level:5',
        'weapon-group:sword',
      ],
      errors: [],
    });
  });

  it('offers the fighter feats the query matches up to the character level, sorted by name', () => {
    expect(offeredAt(EXAMPLE_GRANT_LEVEL)).toStrictEqual(['aggressive-block', 'double-slice', 'sudden-charge']);
    expect(offeredAt(1)).toStrictEqual(['double-slice', 'sudden-charge']);
  });

  it('opens a query that matches nothing with an empty offer, not an error', () => {
    const entries = JSON.stringify([
      {
        slug: 'fighter',
        name: 'Fighter',
        rules: [{ key: 'ChoiceSet', flag: 'feat', choices: { kind: 'feat', filter: ['item:trait:wizard'] } }],
      },
      { slug: 'sudden-charge', name: 'Sudden Charge', kind: 'feat', rollOptions: ['trait:fighter'], rules: [] },
    ]);
    expect(check({ entries, roots: 'fighter', picks: '' })).toMatchObject({
      status: GrantsStatus.Valid,
      open: [{ slot: 'fighter:0', options: [] }],
      errors: [],
    });
  });

  it('reports a grant of an entry that is not in the array', () => {
    const entries = JSON.stringify([{ slug: 'fighter', name: 'Fighter', rules: [{ key: 'GrantItem', item: 'nope' }] }]);
    const result = check({ entries, roots: 'fighter' });
    expect(result).toMatchObject({
      status: GrantsStatus.Valid,
      errors: [{ error: { key: GrantsMessage.UnknownEntry }, via: ['Fighter'] }],
    });
  });

  it('grants the picked entry, named by slug, through the choice', () => {
    expect(check({ picks: 'fighter:4 = double-slice' })).toMatchObject({
      status: GrantsStatus.Valid,
      open: [{ slot: 'fighter:6' }],
      answered: [{ slot: 'fighter:4', pick: 'double-slice' }],
      items: [
        { name: 'Fighter' },
        { name: 'Shield Block (fighter)' },
        { name: 'Shield Block' },
        { name: 'Reactive Strike' },
        { name: 'Bravery' },
        { name: 'Double Slice', via: ['Fighter'] },
        { name: 'Woodland Elf' },
      ],
      errors: [],
    });
  });

  it('reports a pick that is not on offer and leaves its slot open', () => {
    expect(check({ picks: 'fighter:4 = power-attack' })).toMatchObject({
      status: GrantsStatus.Valid,
      open: [{ slot: 'fighter:4' }, { slot: 'fighter:6' }],
      errors: [{ error: { key: GrantsMessage.PickNotOffered } }],
    });
  });

  it('points at each text that does not read: entries, roots, picks, toggles, roll options and the level', () => {
    const texts = {
      entries: '[',
      roots: 'fighter\nNot a slug',
      picks: 'fighter:4 = ok\nfighter = nope',
      toggles: 'fighter:7 = on\nfighter:x = on',
      facts: 'self:level:5\n:bad',
      level: 99,
    };
    expect(check(texts)).toMatchObject({
      status: GrantsStatus.Problems,
      entries: { status: CheckStatus.NotJson },
      rootLines: [2],
      pickLines: [2],
      toggleLines: [2],
      factLines: [2],
      badLevel: true,
    });
  });

  it('brings class features in and out with the level, whatever self:level the roll options say', () => {
    expect(itemNames(check({ level: 7 }))).toContain('Battlefield Surveyor');
    expect(itemNames(check({ level: 2, facts: 'self:level:20' }))).not.toContain('Bravery');
  });

  it('reads only situational roll options, so a typed character fact grants nothing', () => {
    const entries = JSON.stringify([
      {
        slug: 'fighter',
        name: 'Fighter',
        rules: [{ key: 'GrantItem', item: 'steady', predicate: ['feature:bravery'] }],
      },
      { slug: 'steady', name: 'Steady', rules: [] },
    ]);
    const typed = { entries, roots: 'fighter', picks: '', toggles: '', level: 2 };
    expect(itemNames(check({ ...typed, facts: 'feature:bravery\nterrain:forest' }))).toStrictEqual(['Fighter']);
  });

  it('turns a toggle off, or on with a suboption it offers', () => {
    expect(check({ toggles: 'fighter:7 = off' })).toMatchObject({ toggles: [{ slot: 'fighter:7', on: false }] });
    // The example's toggle has no suboptions, so a suboption only turns it on.
    expect(check({ toggles: 'fighter:7 = tower' })).toMatchObject({
      toggles: [{ slot: 'fighter:7', on: true, suboption: undefined }],
    });
  });

  it('follows grants that read what other entries set', () => {
    const entries = JSON.stringify([
      { slug: 'fighter', name: 'Fighter', kind: 'class', rules: [{ key: 'GrantItem', item: 'bravery' }] },
      { slug: 'bravery', name: 'Bravery', rules: [] },
      {
        slug: 'resolve',
        name: 'Resolve',
        rules: [{ key: 'GrantItem', item: 'steady', predicate: ['class:fighter', 'feature:bravery'] }],
      },
      { slug: 'steady', name: 'Steady', rules: [] },
    ]);
    expect(check({ entries, roots: 'fighter\nresolve', picks: '', toggles: '' })).toMatchObject({
      status: GrantsStatus.Valid,
      items: [{ name: 'Fighter' }, { name: 'Bravery' }, { name: 'Resolve' }, { name: 'Steady' }],
      errors: [],
    });
  });
});
