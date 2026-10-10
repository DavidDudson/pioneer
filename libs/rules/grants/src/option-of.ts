import { RollOption } from '@pioneer/rules/sdk';

/**
 * `<prefix>:<value>` as a roll option, or undefined when it is not one: each part is valid on its own, but together
 * they can outgrow a roll option's length. Resolution then leaves the option out rather than throwing.
 */
export function optionOf(prefix: string, value: string): RollOption | undefined {
  const option = RollOption.safeParse(`${prefix}:${value}`);
  return option.success ? option.data : undefined;
}
