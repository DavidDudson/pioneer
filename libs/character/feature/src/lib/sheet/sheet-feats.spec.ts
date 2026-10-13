import { PrerequisiteStatus } from '@pioneer/character/domain';
import { describe, expect, it } from 'vitest';

import { featMatches } from './sheet-feats';
import type { SheetFeatOption } from './sheet-feats';
import type { TrainedAgain } from './sheet-skill-repeats';

const translate = (key: string, params: object): string => `${key} ${JSON.stringify(params)}`;
const none: TrainedAgain = () => new Map();
const twice: TrainedAgain = () => new Map([['feat', ['Religion', 'Medicine']]]);

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

    expect(featMatches([locked], '', { translate, trainedAgain: none })).toStrictEqual([
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
    const [described] = featMatches([both], '', { translate, trainedAgain: none });

    expect(described?.description).toContain('character.sheet.feats.locked');
    expect(featMatches([option({ label: 'Power Attack' })], '', { translate, trainedAgain: none })).toStrictEqual([
      { value: 'feat', label: 'Power Attack' },
    ]);
  });

  it('marks a feat that would train a skill again, which stays pickable', () => {
    expect(
      featMatches([option({ label: 'Student of the Canon' })], '', { translate, trainedAgain: twice }),
    ).toStrictEqual([
      {
        value: 'feat',
        label: 'Student of the Canon',
        description: 'character.sheet.optionTrained {"skills":"Religion, Medicine"}',
        disabled: false,
      },
    ]);
  });

  it('adds the mark after unmet prerequisites, and asks only about the feats it lists', () => {
    const asked: (readonly string[])[] = [];
    const again: TrainedAgain = (values) => {
      asked.push(values);
      return new Map([['feat', ['Religion']]]);
    };
    const unmet = option({ status: PrerequisiteStatus.Unmet, prerequisites: 'trained in Nature' });
    const other = option({ value: 'other', label: 'Other' });

    const [marked] = featMatches([unmet, other], 'fea', { translate, trainedAgain: again });

    expect(marked?.description).toBe(
      'character.sheet.feats.unmet {"prerequisites":"trained in Nature"} character.sheet.optionTrained {"skills":"Religion"}',
    );
    expect(marked?.disabled).toBe(true);
    expect(asked).toStrictEqual([['feat']]);
  });
});
