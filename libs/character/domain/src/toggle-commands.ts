import type { ToggleState, ToggleStates } from '@pioneer/rules/grants';
import { Slug, ToggleKey } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** The most toggles a character remembers; a toggle past it is not kept, so a request cannot grow the play state. */
export const TOGGLES_MAX = 128;

/** How the player left one `RollOption` toggle: on or off, and the suboption picked, for one that has them. */
export const ToggleStateSchema = z.strictObject({ on: z.boolean(), suboption: Slug.optional() });
export type StoredToggle = z.infer<typeof ToggleStateSchema>;

/**
 * The `RollOption` toggles as the player left them, as inputs, by toggle key (`<entry id>:<rule index>`). A toggle
 * left out keeps the `value` its element starts with.
 */
export const TogglesSchema = z.partialRecord(ToggleKey, ToggleStateSchema).default({});
export type Toggles = z.infer<typeof TogglesSchema>;

/** The play edits that set a toggle. */
export const ToggleCommandField = {
  /** A `RollOption` toggle set on or off, with the suboption picked when it has them. */
  SetToggle: 'setToggle',
} as const;
export type ToggleCommandField = ValueOf<typeof ToggleCommandField>;

export const ToggleCommandSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal(ToggleCommandField.SetToggle), toggle: ToggleKey, state: ToggleStateSchema }),
]);
export type ToggleCommand = z.infer<typeof ToggleCommandSchema>;

/** Whether `command` is a toggle edit. */
export function isToggleCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, ToggleCommand> {
  return command.field === ToggleCommandField.SetToggle;
}

/** `toggles` after `command`: the toggle set as asked, unless it is new and the character already holds the most. */
export function applyToggleCommand(toggles: Toggles, command: ToggleCommand): Toggles {
  const known = command.toggle in toggles;
  if (!known && Object.keys(toggles).length >= TOGGLES_MAX) {
    return toggles;
  }
  return { ...toggles, [command.toggle]: command.state };
}

/** The toggles as the grants engine reads them. */
export function toggleStates(toggles: Toggles): ToggleStates {
  return new Map(
    Object.entries(toggles).flatMap(([key, state]): [ToggleKey, ToggleState][] =>
      state === undefined ? [] : [[ToggleKey.parse(key), { on: state.on, suboption: state.suboption }]],
    ),
  );
}
