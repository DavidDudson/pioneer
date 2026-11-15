import { FormulaValue } from '@pioneer/rules/formula';
import { DamageFormula, NumericItemProperty, RichText, RollOptionTail, slugName, Trait } from '@pioneer/rules/sdk';
import type { ContentEntry, DamageType } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { alterItem } from './item-alterations';
import type { AlterableItem } from './item-alterations';
import type { ModifierInputs } from './rule-in-play';

/**
 * An action entry as the `ItemAlteration` elements in play change it: a granted action reads as the effect that grants
 * it says (Dragon Breath is a cone or a line, of the dragon's damage type, with more dice from the 8th rank). The
 * alterations reach it by its own roll options, `item:type:action` and `item:slug:<slug>`.
 */

/** What an action reads as once the elements in play have changed it. */
export interface AlteredAction {
  readonly traits: readonly Trait[];
  /** The entry's description, replaced by an alteration that gives one, with the damage it deals as altered. */
  readonly description: RichText;
}

type JsonValue = z.core.util.JSONType;

type JsonObject = Readonly<Record<string, JsonValue>>;

const DICE = /^(?<count>\d+)(?<rest>d\d+.*)$/u;

/** Whether `value` is a JSON object rather than a list or a plain value. */
function isJsonObject(value: JsonValue): value is JsonObject {
  return value instanceof Object && !Array.isArray(value);
}

/** A JSON value with each `damage` node's first instance changed by `change`; anything else as it is. */
function mapDamage(node: JsonValue, change: (instance: JsonObject) => JsonObject): JsonValue {
  if (Array.isArray(node)) {
    return node.map((each) => mapDamage(each, change));
  }

  if (!isJsonObject(node)) {
    return node;
  }

  const fields = Object.entries(node).map(([field, each]): [string, JsonValue] => [field, mapDamage(each, change)]);
  const mapped = Object.fromEntries(fields);
  const { instances } = mapped;

  if (mapped['type'] === 'damage' && Array.isArray(instances)) {
    const [first, ...others] = instances;

    return first === undefined || !isJsonObject(first) ? mapped : { ...mapped, instances: [change(first), ...others] };
  }

  return mapped;
}

/** The number of dice of the first damage a description deals; undefined when it deals none in dice. */
function diceOf(description: RichText): FormulaValue | undefined {
  const found: FormulaValue[] = [];
  mapDamage(z.json().parse(description), (instance) => {
    const formula = DamageFormula.safeParse(instance['formula']);
    const count = formula.success ? DICE.exec(formula.data)?.groups?.['count'] : undefined;

    if (count !== undefined) {
      found.push(FormulaValue.parse(Number(count)));
    }

    return instance;
  });

  return found[0];
}

/** The description with its damage dealt as `dice` dice of `damageType`; a description with neither change as it is. */
function withDamage(
  description: RichText,
  { dice, damageType }: { readonly dice: FormulaValue | undefined; readonly damageType: DamageType | undefined },
): RichText {
  const mapped = mapDamage(z.json().parse(description), (instance) => {
    const text = DamageFormula.safeParse(instance['formula']);
    const formula = text.success ? DICE.exec(text.data) : undefined;

    const counted =
      dice === undefined || formula?.groups === undefined
        ? instance
        : { ...instance, formula: `${dice}${formula.groups['rest']}` };

    return damageType === undefined ? counted : { ...counted, damageType };
  });

  return RichText.parse(mapped);
}

function rollOptionsOf(entry: ContentEntry): readonly RollOptionTail[] {
  return [
    RollOptionTail.parse(`type:${entry.kind}`),
    RollOptionTail.parse(`slug:${slugName(entry.slug)}`),
    ...entry.traits.map((trait) => RollOptionTail.parse(`trait:${trait}`)),
  ];
}

/**
 * `entry` as the `ItemAlteration` elements in play change it (`alterItem`): its traits, its description, and the dice
 * and type of the damage the description deals. An entry no element reaches reads as written.
 */
export function alterAction(inputs: ModifierInputs, entry: ContentEntry): AlteredAction {
  const base = diceOf(entry.description);

  const item: AlterableItem = {
    rollOptions: rollOptionsOf(entry),
    numbers: new Map(base === undefined ? [] : [[NumericItemProperty.DamageDice, base]]),
    traits: entry.traits.map((trait) => Trait.parse(trait)),
    damageType: undefined,
    materials: [],
    propertyRunes: [],
  };

  const altered = alterItem(inputs, item);
  const dice = altered.numbers.get(NumericItemProperty.DamageDice);

  return {
    traits: altered.traits,
    description: withDamage(altered.description ?? entry.description, {
      dice: dice === base ? undefined : dice,
      damageType: altered.damageType,
    }),
  };
}
