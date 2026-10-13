import { DisplayCategory, RuleElementKey } from '@pioneer/rules/sdk';
import type { RuleElement } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { featDisplayCategory } from './sheet-feat-groups';
import type { FeatDerivation } from './sheet-feat-groups';

type Derivable = FeatDerivation;

const GRANT = { key: RuleElementKey.GrantItem } as RuleElement;
const CHOICE = { key: RuleElementKey.ChoiceSet } as RuleElement;
const MODIFIER = { key: RuleElementKey.FlatModifier } as RuleElement;

function feat(overrides: Partial<Derivable>): Derivable {
  return { data: {} as Derivable['data'], display: undefined, rules: [], ...overrides };
}

const none = (): boolean => false;
const grantsActions = (): boolean => true;

describe(featDisplayCategory, () => {
  it('is narrative for a feat with no rule elements', () => {
    expect(featDisplayCategory(feat({}), none)).toBe(DisplayCategory.Narrative);
  });

  it('is grant-only for a feat with only grants and choices', () => {
    expect(featDisplayCategory(feat({ rules: [GRANT, CHOICE] }), none)).toBe(DisplayCategory.GrantOnly);
  });

  it('is modifier for a feat with any other rule element', () => {
    expect(featDisplayCategory(feat({ rules: [GRANT, MODIFIER] }), none)).toBe(DisplayCategory.Modifier);
  });

  it('is active for a feat that grants an action, or is one', () => {
    expect(featDisplayCategory(feat({ rules: [GRANT] }), grantsActions)).toBe(DisplayCategory.Active);
    const action = { action: { cost: 'one' } } as unknown as Derivable['data'];
    expect(featDisplayCategory(feat({ data: action }), none)).toBe(DisplayCategory.Active);
  });

  it('takes the content’s display category over what its rule elements say', () => {
    const overridden = feat({ rules: [MODIFIER], display: { category: DisplayCategory.Narrative } });

    expect(featDisplayCategory(overridden, none)).toBe(DisplayCategory.Narrative);
  });
});
