import { array, boolean, integer, oneof, record, uniqueArray, uuid } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { DamageType } from '../damage';
import { DegreeChange } from '../degree-of-success';
import { AuraAffects, AuraEvent } from '../rule-element-aura';
import { SIZE_STEPS_MAX } from '../rule-element-creature-size';
import { FastHealingType } from '../rule-element-healing';
import { AdjustedCheck, RollKept } from '../rule-element-rolls';
import { Size } from '../size';
import { validFormulaText } from './arbitraries';
import {
  anyOf,
  element,
  LIST_MAX,
  modifierValue,
  slugText,
  SMALLINT_MAX,
  targets,
  withOptional,
} from './rule-element-arbitrary-kit';

const feet = integer({ min: 0, max: SMALLINT_MAX });
const damageType = anyOf(DamageType);

export const fastHealing = element(
  'FastHealing',
  { value: modifierValue },
  { type: anyOf(FastHealingType), deactivatedBy: uniqueArray(damageType, { minLength: 1, maxLength: LIST_MAX }) },
);
export const tempHp = element('TempHP', { value: modifierValue });
export const creatureSize = element(
  'CreatureSize',
  { value: oneof(anyOf(Size), integer({ min: -SIZE_STEPS_MAX, max: SIZE_STEPS_MAX })) },
  {
    resizeEquipment: boolean(),
    maximumSize: anyOf(Size),
    reach: oneof(record({ override: feet }), record({ add: feet })),
  },
);

const DEGREE_FIELDS = ['all', 'criticalFailure', 'failure', 'success', 'criticalSuccess'];
const ROLL_MAX = 99;

/** Some of the degrees, each with a change; never none. */
const adjustment: Arbitrary<object> = record(
  Object.fromEntries(DEGREE_FIELDS.map((field) => [field, anyOf(DegreeChange)])),
  { requiredKeys: [] },
).filter((fields) => Object.keys(fields).length > 0);

export const adjustDegreeOfSuccess = element(
  'AdjustDegreeOfSuccess',
  { selectors: targets, adjustment },
  { checkType: anyOf(AdjustedCheck) },
);
export const rollTwice = element('RollTwice', { selectors: targets, keep: anyOf(RollKept) });
export const substituteRoll = element('SubstituteRoll', {
  selectors: targets,
  slug: slugText,
  value: integer({ min: 1, max: ROLL_MAX }),
});

const auraEffect = withOptional(record({ effect: uuid() }), {
  affects: anyOf(AuraAffects),
  includesSelf: boolean(),
  events: uniqueArray(anyOf(AuraEvent), { minLength: 1, maxLength: LIST_MAX }),
});
export const aura = element(
  'Aura',
  { radius: oneof(feet, validFormulaText) },
  {
    slug: slugText,
    traits: uniqueArray(slugText, { maxLength: LIST_MAX }),
    effects: array(auraEffect, { maxLength: LIST_MAX }),
  },
);
