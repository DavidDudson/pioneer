import type { SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { ChoiceState } from '../choices/choice-line';
import type { ChoiceLine } from '../choices/choice-line';

/** Message keys for a companion's line in the Choices list, spelled out so the key check sees them. */
const CompanionChoiceMessage = {
  Label: 'rules.companion.choiceLabel',
} as const;

/** What was picked for a companion slot; either part is missing until the player gives it. */
export interface CompanionChoice {
  readonly key: SlotKey;
  /** The species' name, from the content. */
  readonly species: string | undefined;
  readonly name: string | undefined;
}

/**
 * The companion slot as the Choices list shows it, with a status like any other slot: filled once both the species
 * and the name are given, open until then.
 */
export function companionChoiceLine({ key, species, name }: CompanionChoice): ChoiceLine {
  const complete = species !== undefined && name !== undefined && name.trim() !== '';

  return {
    key,
    label: message(CompanionChoiceMessage.Label),
    state: complete ? ChoiceState.Filled : ChoiceState.Open,
    selection: complete ? { name: `${name.trim()} (${species})` } : undefined,
    level: undefined,
    reason: undefined,
  };
}
