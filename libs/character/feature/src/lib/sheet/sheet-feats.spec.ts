import { PrerequisiteStatus } from '@pioneer/character/domain';
import { describe, expect, it } from 'vitest';

import { featMatches } from './sheet-feats';
import type { SheetFeatOption } from './sheet-feats';

const translate = (key: string, params: object): string => `${key} ${JSON.stringify(params)}`;

function option(overrides: Partial<SheetFeatOption>): SheetFeatOption {
  return {
    value: 'feat',
    label: 'Feat',
    status: PrerequisiteStatus.Met,
    prerequisites: undefined,
    locked: undefined,
    ...overrides,
  };
}

describe(featMatches, () => {
  it('shows a locked dedication disabled, saying which archetype it waits on and how many feats', () => {
    const locked = option({ label: 'Sentinel Dedication', locked: { archetype: 'Medic', needed: 2 } });

    expect(featMatches([locked], '', translate)).toStrictEqual([
      {
        value: 'feat',
        label: 'Sentinel Dedication',
        description: 'character.sheet.feats.locked {"archetype":"Medic","needed":2}',
        disabled: true,
      },
    ]);
  });

  it('says a lock before unmet prerequisites, and leaves a free feat plain', () => {
    const both = option({ status: PrerequisiteStatus.Unmet, locked: { archetype: 'Medic', needed: 1 } });
    const [described] = featMatches([both], '', translate);

    expect(described?.description).toContain('character.sheet.feats.locked');
    expect(featMatches([option({ label: 'Power Attack' })], '', translate)).toStrictEqual([
      { value: 'feat', label: 'Power Attack' },
    ]);
  });
});
