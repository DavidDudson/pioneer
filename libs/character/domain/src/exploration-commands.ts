import { ContentId } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/**
 * What the character is doing while exploring (Defend, Search, Avoid Notice, Follow the Expert), as the id of the
 * action; none when it has not picked one. An exploration activity is an action, so the choice is an id, not a copy.
 */
export const ExplorationActivitySchema = ContentId.optional();
export type ExplorationActivity = z.infer<typeof ExplorationActivitySchema>;

/** The play edits that choose the exploration activity. */
export const ExplorationCommandField = {
  /** The activity picked, or none when it is left out. */
  SetExplorationActivity: 'setExplorationActivity',
} as const;
export type ExplorationCommandField = ValueOf<typeof ExplorationCommandField>;

export const ExplorationCommandSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal(ExplorationCommandField.SetExplorationActivity),
    activity: ContentId.optional(),
  }),
]);
export type ExplorationCommand = z.infer<typeof ExplorationCommandSchema>;

/** Whether `command` chooses the exploration activity. */
export function isExplorationCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, ExplorationCommand> {
  return command.field === ExplorationCommandField.SetExplorationActivity;
}

/** The activity after `command`: the one picked, or none. */
export function applyExplorationCommand(command: ExplorationCommand): ExplorationActivity {
  return command.activity;
}
