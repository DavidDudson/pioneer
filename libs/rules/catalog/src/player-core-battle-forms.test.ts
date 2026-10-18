import { describe, expect, test } from 'bun:test';

import { DefenceStatusKind } from '@pioneer/rules/engine';
import { Size } from '@pioneer/rules/sdk';
import { assert, integer, property } from 'fast-check';

import { chosen, druidWith, formRulesOf, viewOf } from './testing/battle-forms';
import type { FormView } from './testing/battle-forms';

const LOW_LIGHT_VISION = '16b42c38-9373-58ec-a7ac-2221bb17a71c';
const SCENT = '279973df-e7b9-5fa1-9bb6-1cfdc54b82b6';
const LEVEL = 10;

/** The druid in the Plant Form `form` (`arboreal` or `flytrap`), cast at `rank`. */
function plant(form: string, rank: number): FormView {
  return viewOf(formRulesOf('effect:spell-effect-plant-form', rank), chosen(`plant-form:${form}`));
}

/** The druid in the Animal Form `animal`, cast at `rank`. */
function animal(name: string, rank: number): FormView {
  return viewOf(formRulesOf(`effect:spell-effect-animal-form-${name}`, rank), chosen());
}

/** What a Strike makes of itself: its slug, attack modifier, damage dice and type, damage bonus and reach traits. */
function summary(view: FormView): unknown {
  return view.strikes.map(({ weapon, attack, damage }) => ({
    slug: weapon.slug,
    attack: attack?.ok === true ? Number(attack.total) : undefined,
    dice: `${damage?.dice}${damage?.die}`,
    type: damage?.damageType,
    bonus: damage?.bonus?.ok === true ? Number(damage.bonus.total) : undefined,
    traits: weapon.traits.map(String).filter((trait) => trait.startsWith('reach')),
  }));
}

function resistances(view: FormView): unknown {
  return view.defences.resistances
    .filter(({ status }) => status.kind === DefenceStatusKind.Applied)
    .map(({ type, value }) => [type, value]);
}

function senses(view: FormView): string[] {
  return view.senses.map(({ sense }) => String(sense));
}

describe('Player Core: Plant Form, level 10 druid', () => {
  test('arboreal, 5th rank: Large, AC 19 + level, 12 temporary HP, Athletics +19, Speed 30', () => {
    const form = plant('arboreal', 5);

    expect(form.size).toBe(Size.Large);
    expect(form.total('ac')).toBe(19 + LEVEL);
    expect(form.temporaryHitPoints).toBe(12);
    expect(form.total('skill:athletics')).toBe(19);
    expect(form.total('speed:land')).toBe(30);
  });

  test('arboreal, 5th rank: poison resistance 10, low-light vision, branch (reach 15) and foot', () => {
    const form = plant('arboreal', 5);

    expect(resistances(form)).toEqual([['poison', 10]]);
    expect(senses(form)).toEqual([LOW_LIGHT_VISION]);
    expect(summary(form)).toEqual([
      { slug: 'branch', attack: 17, dice: '2d10', type: 'bludgeoning', bonus: 11, traits: ['reach-15'] },
      { slug: 'foot', attack: 17, dice: '2d8', type: 'bludgeoning', bonus: 11, traits: [] },
    ]);
  });

  test('arboreal, 6th rank: Huge, AC 22 + level, 24 temporary HP, +21 and +16, Athletics +22, reach +5', () => {
    const form = plant('arboreal', 6);

    expect(form.size).toBe(Size.Huge);
    expect(form.total('ac')).toBe(22 + LEVEL);
    expect(form.temporaryHitPoints).toBe(24);
    expect(form.total('skill:athletics')).toBe(22);
    expect(resistances(form)).toEqual([['poison', 10]]);
    expect(summary(form)).toEqual([
      { slug: 'branch', attack: 21, dice: '2d10', type: 'bludgeoning', bonus: 16, traits: ['reach-20'] },
      { slug: 'foot', attack: 21, dice: '2d8', type: 'bludgeoning', bonus: 16, traits: ['reach-5'] },
    ]);
  });

  test('flytrap: Speed 15, acid and poison resistance 10, a leaf (reach 10) for 2d8 piercing', () => {
    const form = plant('flytrap', 5);

    expect(form.total('speed:land')).toBe(15);
    expect(resistances(form)).toEqual([
      ['acid', 10],
      ['poison', 10],
    ]);
    expect(summary(form)).toEqual([
      { slug: 'leaf', attack: 17, dice: '2d8', type: 'piercing', bonus: 11, traits: ['reach-10'] },
    ]);
  });

  test('a form the player did not choose gives nothing', () => {
    const form = viewOf(formRulesOf('effect:spell-effect-plant-form', 5), chosen());

    expect(form.size).toBeUndefined();
    expect(form.total('ac')).toBe(25);
    expect(form.temporaryHitPoints).toBe(0);
  });
});

describe('Player Core: Animal Form, level 10 druid', () => {
  test('bear, 2nd rank: Medium, AC 16 + level, 5 temporary HP, Athletics +9, +9 and +1', () => {
    const form = animal('bear', 2);

    expect(form.size).toBe(Size.Medium);
    expect(form.total('ac')).toBe(16 + LEVEL);
    expect(form.temporaryHitPoints).toBe(5);
    expect(form.total('speed:land')).toBe(30);
    expect(senses(form)).toEqual([LOW_LIGHT_VISION, SCENT]);
  });

  test('bear, 2nd rank: the druid’s own unarmed attack and Athletics stand where higher', () => {
    const form = animal('bear', 2);

    expect(form.total('skill:athletics')).toBe(9);
    expect(summary(form)).toEqual([
      { slug: 'claw', attack: 14, dice: '1d8', type: 'slashing', bonus: 1, traits: [] },
      { slug: 'jaws', attack: 14, dice: '2d8', type: 'piercing', bonus: 1, traits: [] },
    ]);
  });

  test('bear, 3rd rank: 10 temporary HP, AC 17 + level, Athletics +14, +14 and +5', () => {
    const form = animal('bear', 3);

    expect(form.temporaryHitPoints).toBe(10);
    expect(form.total('ac')).toBe(27);
    expect(form.total('skill:athletics')).toBe(14);
    expect(summary(form)).toMatchObject([
      { attack: 14, bonus: 5 },
      { attack: 14, bonus: 5 },
    ]);
  });

  test('bear, 4th rank: Large, 10-foot reach, AC 18 + level, 15 temporary HP, +16 and +9, Athletics +16', () => {
    const form = animal('bear', 4);

    expect(form.size).toBe(Size.Large);
    expect(form.temporaryHitPoints).toBe(15);
    expect(form.total('ac')).toBe(28);
    expect(form.total('skill:athletics')).toBe(16);
    expect(summary(form)).toMatchObject([
      { attack: 16, bonus: 9, traits: ['reach'] },
      { attack: 16, bonus: 9, traits: ['reach'] },
    ]);
  });

  test('bear, 5th rank: Huge, 15-foot reach, 20 temporary HP, +18 and +7 with double the dice, Athletics +20', () => {
    const form = animal('bear', 5);

    expect(form.size).toBe(Size.Huge);
    expect(form.temporaryHitPoints).toBe(20);
    expect(form.total('skill:athletics')).toBe(20);
    expect(summary(form)).toEqual([
      { slug: 'claw', attack: 18, dice: '2d8', type: 'slashing', bonus: 7, traits: ['reach-15'] },
      { slug: 'jaws', attack: 18, dice: '4d8', type: 'piercing', bonus: 7, traits: ['reach-15'] },
    ]);
  });
});

interface AnimalFormSays {
  /** Armor Class less the level. */
  readonly ac: number;
  readonly athletics: number;
  readonly attack: number;
}

/** What Animal Form says by spell rank (Player Core, 2nd rank and its heightened entries). */
const ANIMAL_FORM_SAYS = new Map<number, AnimalFormSays>([
  [2, { ac: 16, athletics: 9, attack: 9 }],
  [3, { ac: 17, athletics: 14, attack: 14 }],
  [4, { ac: 18, athletics: 16, attack: 16 }],
  [5, { ac: 18, athletics: 20, attack: 18 }],
]);

const STRENGTH_MIN = -1;
const STRENGTH_MAX = 7;
const RANK_MIN = 2;
const RANK_MAX = 5;

function says(rank: number): AnimalFormSays {
  const found = ANIMAL_FORM_SAYS.get(rank);
  if (found === undefined) {
    throw new Error(`Animal Form has no entry for rank ${rank}`);
  }
  return found;
}

/** The attack modifier of each Strike. */
function attacks(view: FormView): number[] {
  return view.strikes.map(({ attack }) => (attack?.ok === true ? Number(attack.total) : Number.NaN));
}

describe('Player Core: Animal Form, the druid’s own statistic when it is higher', () => {
  test('Armor Class, Athletics and the unarmed attack are the better of the form’s and her own, at every rank', () => {
    assert(
      property(
        integer({ min: STRENGTH_MIN, max: STRENGTH_MAX }),
        integer({ min: RANK_MIN, max: RANK_MAX }),
        (strength, rank) => {
          const character = druidWith(strength);
          const own = viewOf([], chosen(), character);
          const form = viewOf(formRulesOf('effect:spell-effect-animal-form-bear', rank), chosen(), character);
          const said = says(rank);

          expect(form.total('ac')).toBe(Math.max(said.ac + LEVEL, own.total('ac')));
          expect(form.total('skill:athletics')).toBe(Math.max(said.athletics, own.total('skill:athletics')));
          const best = Math.max(said.attack, ...attacks(own));

          expect(attacks(form)).toEqual(attacks(form).map(() => best));
        },
      ),
    );
  });
});
