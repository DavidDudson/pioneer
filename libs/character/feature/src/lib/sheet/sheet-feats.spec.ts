import { PrerequisiteStatus } from '@pioneer/character/domain';
import { ContentText, FeatCategory, Rarity } from '@pioneer/rules/sdk';
import { ActionKind, PrerequisiteState } from '@pioneer/rules/ui';
import type { FeatPickerRow } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { featRows } from './sheet-feats';
import type { SheetFeatOption } from './sheet-feats';
import type { TrainedAgain } from './sheet-skill-repeats';

const translate = (key: string, params: object): string => `${key} ${JSON.stringify(params)}`;
const none: TrainedAgain = () => new Map();
const twice: TrainedAgain = () => new Map([['feat', ['Religion', 'Medicine']]]);

function option(overrides: Partial<SheetFeatOption>): SheetFeatOption {
  return {
    value: 'feat',
    label: 'Feat',
    level: 1,
    category: FeatCategory.General,
    action: ActionKind.Passive,
    rarity: Rarity.Common,
    traits: [],
    sources: [],
    status: PrerequisiteStatus.Met,
    clauses: undefined,
    prerequisites: undefined,
    locked: undefined,
    ...overrides,
  };
}

function only(options: readonly SheetFeatOption[], trainedAgain: TrainedAgain = none): FeatPickerRow {
  const [row] = featRows(options, { translate, trainedAgain });
  if (row === undefined) {
    throw new Error('Expected a row');
  }
  return row;
}

describe(featRows, () => {
  it('carries the facts a player chooses a feat by', () => {
    const row = only([
      option({
        value: 'sudden-charge',
        label: 'Sudden Charge',
        level: 1,
        category: FeatCategory.Class,
        action: ActionKind.Two,
        rarity: Rarity.Uncommon,
        traits: ['fighter', 'flourish'],
      }),
    ]);

    expect(row).toMatchObject({
      id: 'sudden-charge',
      name: 'Sudden Charge',
      level: 1,
      category: FeatCategory.Class,
      action: ActionKind.Two,
      rarity: Rarity.Uncommon,
      traits: ['fighter', 'flourish'],
    });
  });

  it('lists every feat it is given, not a first few', () => {
    const many = Array.from({ length: 120 }, (_unused, index) =>
      option({ value: `feat-${index}`, label: `Feat ${index}` }),
    );

    expect(featRows(many, { translate, trainedAgain: none })).toHaveLength(120);
  });

  it('disables a locked dedication, saying which archetype it waits on and how many feats', () => {
    const locked = only([option({ label: 'Sentinel Dedication', locked: { archetype: 'Medic', needed: 2 } })]);

    expect(locked.disabledReason).toBe('character.sheet.feats.locked {"archetype":"Medic","needed":2}');
  });

  it('says a lock before unmet prerequisites', () => {
    const both = only([option({ status: PrerequisiteStatus.Unmet, locked: { archetype: 'Medic', needed: 1 } })]);

    expect(both.disabledReason).toContain('character.sheet.feats.locked');
  });

  it('disables a feat whose prerequisites are not met, saying what they are, and shows them as not met', () => {
    const unmet = only([option({ status: PrerequisiteStatus.Unmet, prerequisites: 'trained in Nature' })]);

    expect(unmet.disabledReason).toBe('character.sheet.feats.unmet {"prerequisites":"trained in Nature"}');
    expect(unmet.prerequisites).toStrictEqual([{ label: 'trained in Nature', state: PrerequisiteState.Unmet }]);
  });

  it('leaves a feat whose prerequisites cannot be checked pickable, never reading it as not met', () => {
    const unknown = only([option({ status: PrerequisiteStatus.Unknown, prerequisites: 'a deity of magic' })]);

    expect(unknown.disabledReason).toBeUndefined();
    expect(unknown.prerequisites).toStrictEqual([{ label: 'a deity of magic', state: PrerequisiteState.Unknown }]);
  });

  it('shows met prerequisites as met, and none for a feat without any', () => {
    const met = only([option({ prerequisites: 'trained in Athletics' })]);

    expect(met.disabledReason).toBeUndefined();
    expect(met.prerequisites).toStrictEqual([{ label: 'trained in Athletics', state: PrerequisiteState.Met }]);
    expect(only([option({})]).prerequisites).toStrictEqual([]);
  });

  it('shows a line for each clause of a feat with several, each in its own state', () => {
    const several = only([
      option({
        status: PrerequisiteStatus.Unmet,
        prerequisites: 'expert in Athletics; expert in Perception; an animal companion',
        clauses: [
          { text: ContentText.parse('expert in Athletics'), status: PrerequisiteStatus.Unmet },
          { text: ContentText.parse('expert in Perception'), status: PrerequisiteStatus.Met },
          { text: ContentText.parse('an animal companion'), status: PrerequisiteStatus.Unknown },
        ],
      }),
    ]);

    expect(several.prerequisites).toStrictEqual([
      { label: 'expert in Athletics', state: PrerequisiteState.Unmet },
      { label: 'expert in Perception', state: PrerequisiteState.Met },
      { label: 'an animal companion', state: PrerequisiteState.Unknown },
    ]);
    expect(several.disabledReason).toContain('character.sheet.feats.unmet');
  });

  it('marks a feat that would train a skill again, which stays pickable', () => {
    const marked = only([option({ label: 'Student of the Canon' })], twice);

    expect(marked.note).toBe('character.sheet.optionTrained {"skills":"Religion, Medicine"}');
    expect(marked.disabledReason).toBeUndefined();
  });

  it('asks which feats would train a skill again for all the feats it lists, once', () => {
    const asked: (readonly string[])[] = [];
    const again: TrainedAgain = (values) => {
      asked.push(values);
      return new Map();
    };

    featRows([option({}), option({ value: 'other', label: 'Other' })], { translate, trainedAgain: again });

    expect(asked).toStrictEqual([['feat', 'other']]);
  });

  it('leaves out the feats the filters hide, and asks nothing about them', () => {
    const asked: (readonly string[])[] = [];
    const again: TrainedAgain = (values) => {
      asked.push(values);
      return new Map();
    };
    const options = [
      option({}),
      option({ value: 'other', label: 'Other' }),
      option({ value: 'third', label: 'Third' }),
    ];

    const rows = featRows(options, { translate, trainedAgain: again }, new Set(['feat', 'third']));

    expect(rows.map((row) => row.id)).toStrictEqual(['other']);
    expect(asked).toStrictEqual([['other']]);
  });
});
