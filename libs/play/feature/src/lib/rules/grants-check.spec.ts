import { GrantsMessage } from '@pioneer/rules/grants';
import { describe, expect, it } from 'vitest';

import { EXAMPLE_GRANT_ENTRIES, EXAMPLE_GRANT_PICKS, EXAMPLE_GRANT_ROOTS } from './grant-examples';
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
    facts: EXAMPLE_FACTS,
    ...texts,
  });
}

/** What the example's first open slot offers, as typed, given `facts`. */
function offeredGiven(facts: string): string[] {
  const result = check({ facts });
  return result.status === GrantsStatus.Valid ? (result.open[0]?.options.map((option) => option.value) ?? []) : [];
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
      rollOptions: ['weapon-group:sword'],
      errors: [],
    });
  });

  it('offers the fighter feats the query matches up to the character level, sorted by name', () => {
    expect(offeredGiven(EXAMPLE_FACTS)).toStrictEqual(['aggressive-block', 'double-slice', 'sudden-charge']);
    expect(offeredGiven('self:level:1')).toStrictEqual(['double-slice', 'sudden-charge']);
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

  it('points at each text that does not read: entries, roots, picks and roll options', () => {
    const texts = {
      entries: '[',
      roots: 'fighter\nNot a slug',
      picks: 'fighter:4 = ok\nfighter = nope',
      facts: 'self:level:5\n:bad',
    };
    expect(check(texts)).toMatchObject({
      status: GrantsStatus.Problems,
      entries: { status: CheckStatus.NotJson },
      rootLines: [2],
      pickLines: [2],
      factLines: [2],
    });
  });
});
