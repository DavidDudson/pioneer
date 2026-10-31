import { RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

/**
 * A `RollOption` that names the pick of a `ChoiceSet` on the same item in a namespace of its own, as Foundry writes a
 * dedication's muse: `feature:{item|flags.system.rulesSelections.dedicationMuse}`. Pioneer's `ChoiceSet` sets that option
 * itself through its `rollOption`, so the two elements become one. A `RollOption` that is conditional or scoped
 * (a `predicate`, `domain`, `toggleable`, `value` or `suboptions`) says more than the pick's name, so it stays as it is.
 */

const PICK_OPTION = /^(?<namespace>[a-z][a-z0-9-]*):\{item\|flags\.system\.rulesSelections\.(?<flag>[A-Za-z0-9]+)\}$/u;

const FoundryPickOption = z.looseObject({
  key: z.literal(RuleElementKey.RollOption),
  option: z.string().regex(PICK_OPTION),
  predicate: z.undefined().optional(),
  domain: z.undefined().optional(),
  toggleable: z.undefined().optional(),
  value: z.undefined().optional(),
  suboptions: z.undefined().optional(),
});

const FoundryChoiceSet = z.looseObject({
  key: z.literal(RuleElementKey.ChoiceSet),
  flag: z.string(),
  rollOption: z.undefined().optional(),
});

/** The namespace an option is set in, and the flag of the `ChoiceSet` whose pick it names. */
interface PickOption {
  readonly namespace: string;
  readonly flag: string;
}

/** The namespace and flag of a `RollOption` element naming a pick; undefined for any other element. */
function pickOptionOf(raw: unknown): PickOption | undefined {
  const option = FoundryPickOption.safeParse(raw);
  const groups = option.success ? PICK_OPTION.exec(option.data.option)?.groups : undefined;
  const { namespace, flag } = groups ?? {};
  return namespace === undefined || flag === undefined ? undefined : { namespace, flag };
}

/**
 * `raws` with each such `RollOption` folded into the `ChoiceSet` it names as its `rollOption`. A `RollOption` with no
 * `ChoiceSet` of that flag on the item, or that is conditional or scoped, stays as it is.
 */
export function withPickRollOptions(raws: readonly unknown[]): unknown[] {
  const flags = new Set(
    raws.flatMap((raw) => {
      const choice = FoundryChoiceSet.safeParse(raw);
      return choice.success ? [choice.data.flag] : [];
    }),
  );
  const namespaces = new Map(
    raws.flatMap((raw) => {
      const found = pickOptionOf(raw);
      return found !== undefined && flags.has(found.flag) ? [[found.flag, found.namespace] as const] : [];
    }),
  );
  return raws.flatMap((raw): unknown[] => {
    const option = pickOptionOf(raw);
    if (option !== undefined && namespaces.has(option.flag)) {
      return [];
    }
    const choice = FoundryChoiceSet.safeParse(raw);
    const namespace = choice.success ? namespaces.get(choice.data.flag) : undefined;
    return choice.success && namespace !== undefined ? [{ ...choice.data, rollOption: namespace }] : [raw];
  });
}
