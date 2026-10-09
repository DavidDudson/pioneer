import { DamageAdjustment } from '@pioneer/rules/sdk';
import type { DamageAdjustmentTarget } from '@pioneer/rules/sdk';

import { DamageInstance, NO_DEFENCES } from '../damage';
import type { DamageTarget } from '../damage';
import { parseDiceExpression } from '../parse';
import { rollDice } from '../roll';
import type { RollResult } from '../roll';
import { DamageTotal, DiceExpressionText, DieFace } from '../units';
import { scriptedRandom } from './seeded-random';

/*
 * Fixtures shared by the damage tests. Not exported from `testing/index.ts`: they are for this lib's
 * own tests.
 */

export const CRITICAL = { critical: true };

export function roll(text: string, faces: readonly number[] = []): RollResult {
  const outcome = parseDiceExpression(DiceExpressionText.parse(text));
  if (!outcome.ok) {
    throw new Error(outcome.error.key);
  }
  return rollDice(outcome.expression, scriptedRandom(faces.map((face) => DieFace.parse(face))));
}

export function amount(value: number): DamageTotal {
  return DamageTotal.parse(value);
}

export function expectedInstance(raw: unknown): DamageInstance {
  return DamageInstance.parse(raw);
}

export function adjustment(type: DamageAdjustmentTarget, value: number): DamageAdjustment {
  return DamageAdjustment.parse({ type, value });
}

export function target(defences: Partial<DamageTarget>): DamageTarget {
  return { ...NO_DEFENCES, ...defences };
}
