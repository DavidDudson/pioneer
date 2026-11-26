import { SlotKey } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { ChoiceState } from '../choices/choice-line';
import { companionChoiceLine } from './companion-choice-line';

const KEY = SlotKey.parse('animal-companion:0');

describe(companionChoiceLine, () => {
  it('is open until a species and a name are given', () => {
    expect(companionChoiceLine({ key: KEY, species: 'Wolf', name: undefined }).state).toBe(ChoiceState.Open);
    expect(companionChoiceLine({ key: KEY, species: undefined, name: 'Ash' }).state).toBe(ChoiceState.Open);
    expect(companionChoiceLine({ key: KEY, species: 'Wolf', name: '  ' }).state).toBe(ChoiceState.Open);
  });

  it('is filled with the name and species once both are given', () => {
    const line = companionChoiceLine({ key: KEY, species: 'Wolf', name: ' Ash ' });
    expect(line.state).toBe(ChoiceState.Filled);
    expect(line.selection).toStrictEqual({ name: 'Ash (Wolf)' });
    expect(line.key).toBe(KEY);
  });
});
