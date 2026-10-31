import { EngineMessage } from '@pioneer/rules/engine';
import type { ModifierLabel, RuleId, StatisticValue } from '@pioneer/rules/engine';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

/** A rule as the breakdown names it: its id and the label it carries. */
export interface RuleLabel {
  readonly id: RuleId;
  readonly label: ModifierLabel;
}

/** The rule that lowered the Speed, so the breakdown can name it like any other rule: none when nothing did. */
export function movementCostRule({ movementCost }: StatisticValue): readonly RuleLabel[] {
  return movementCost === undefined ? [] : [{ id: movementCost.rule, label: movementCost.label }];
}

/**
 * "Difficult Terrain: a Stride covers 10 feet, not 25; each square costs 5 feet more", worded with the name of the
 * terrain; undefined when no terrain lowered the Speed.
 */
export function movementCostWords(
  { movementCost, total }: StatisticValue,
  nameOf: (rule: RuleId) => string,
  translate: (descriptor: MessageDescriptor) => string,
): string | undefined {
  if (movementCost === undefined) {
    return undefined;
  }
  return translate(
    message(EngineMessage.MovementCostReduces, {
      name: nameOf(movementCost.rule),
      value: total,
      was: movementCost.was,
      extra: movementCost.extra,
    }),
  );
}
