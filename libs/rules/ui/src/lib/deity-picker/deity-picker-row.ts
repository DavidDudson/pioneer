import type { DeityDomain, DivineFont, RichText, SourceRef } from '@pioneer/rules/sdk';

import type { DeitySanctificationLine } from '../deity/deity-line';

/** The columns a deity picker sorts by; the others show facts to choose by. */
export const DeityPickerColumn = { Name: 'name' } as const;

/** One deity a slot offers: what a player weighs to choose it. */
export interface DeityPickerRow {
  /** The deity's content id, which is the value picked; empty for the row that picks no deity. */
  readonly id: string;
  readonly name: string;
  /** Undefined when the deity sanctifies no one. */
  readonly sanctification: DeitySanctificationLine | undefined;
  /** The divine fonts a cleric of the deity gets; none for a philosophy. */
  readonly fonts: readonly DivineFont[];
  readonly domains: readonly DeityDomain[];
  /** Favoured weapons, by name. */
  readonly favoredWeapons: readonly string[];
  /** Divine skills, by name. */
  readonly skills: readonly string[];
  /** Its description, which holds its edicts and anathema. */
  readonly description: RichText;
  readonly sources: readonly SourceRef[];
  /** Why the deity can't be picked, already translated; undefined when it can. */
  readonly disabledReason: string | undefined;
}
