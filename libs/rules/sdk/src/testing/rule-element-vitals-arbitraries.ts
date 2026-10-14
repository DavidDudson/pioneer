import { boolean, integer, oneof, record, uniqueArray } from 'fast-check';

import { DamageType } from '../damage';
import { SIZE_STEPS_MAX } from '../rule-element-creature-size';
import { FastHealingType } from '../rule-element-healing';
import { Size } from '../size';
import { anyOf, element, LIST_MAX, modifierValue, SMALLINT_MAX } from './rule-element-arbitrary-kit';

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
