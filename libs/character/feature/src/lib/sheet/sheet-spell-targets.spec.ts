import { TargetValue } from '@pioneer/rules/sdk';
import type { FocusLine, SpellDetailLine } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { filterFocus, passesTargetFilter, SpellTargetFilter } from './sheet-spell-targets';

function spellTargeting(...targetValues: readonly TargetValue[]): SpellDetailLine {
  return { targetValues } as SpellDetailLine;
}

describe(passesTargetFilter, () => {
  it('lets every spell through when no filter is set', () => {
    expect(passesTargetFilter(spellTargeting(TargetValue.Multiple), SpellTargetFilter.All)).toBe(true);
  });

  it('keeps single-target spells under the single filter and drops the rest', () => {
    expect(passesTargetFilter(spellTargeting(TargetValue.Single), SpellTargetFilter.Single)).toBe(true);
    expect(passesTargetFilter(spellTargeting(TargetValue.Multiple), SpellTargetFilter.Single)).toBe(false);
    expect(passesTargetFilter(spellTargeting(TargetValue.None), SpellTargetFilter.Single)).toBe(false);
  });

  it('keeps a spell that targets both ways under either filter', () => {
    const both = spellTargeting(TargetValue.Single, TargetValue.Multiple);
    expect(passesTargetFilter(both, SpellTargetFilter.Single)).toBe(true);
    expect(passesTargetFilter(both, SpellTargetFilter.Multiple)).toBe(true);
  });

  it('keeps an empty slot so it can still be picked', () => {
    expect(passesTargetFilter(undefined, SpellTargetFilter.Multiple)).toBe(true);
  });
});

describe(filterFocus, () => {
  const focus = {
    entries: [
      { key: 'one', spells: [{ key: 'a', detail: spellTargeting(TargetValue.Single) }] },
      { key: 'two', spells: [{ key: 'b', detail: spellTargeting(TargetValue.Multiple) }] },
    ],
  } as unknown as FocusLine;

  it('drops spells that fail the filter and the entries left empty', () => {
    expect(filterFocus(focus, SpellTargetFilter.Multiple).entries.map((entry) => entry.key)).toStrictEqual(['two']);
  });

  it('returns the focus line untouched when no filter is set', () => {
    expect(filterFocus(focus, SpellTargetFilter.All)).toBe(focus);
  });
});
