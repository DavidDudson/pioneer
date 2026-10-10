import { toggleKeyOf } from '@pioneer/rules/grants';
import type { ToggleSlot, ToggleState, ToggleStates } from '@pioneer/rules/grants';
import { RuleIndex, Slug } from '@pioneer/rules/sdk';
import type { ToggleKey } from '@pioneer/rules/sdk';

import type { SlugTable } from './grant-choices';

/** A toggle as typed: the entry's slug and the `RollOption`'s rule index, then on, off or a suboption. */
const TOGGLE_LINE = /^(?<entry>[^:\s]+):(?<rule>\d+)\s*=\s*(?<state>\S+)$/u;
const LINE = /\r?\n/u;
const ON = 'on';
const OFF = 'off';

/** What a typed state means: on, off, or on with that suboption. */
function stateOf(text: Slug): ToggleState {
  if (text === ON) {
    return { on: true, suboption: undefined };
  }
  return text === OFF ? { on: false, suboption: undefined } : { on: true, suboption: text };
}

export interface TogglesParse {
  readonly toggles: ToggleStates;
  /** The 1-based lines that are not `entry:rule = state`. */
  readonly bad: readonly number[];
}

/** Each filled line as a toggle's state; a later line for the same toggle wins. */
export function parseToggles(text: string, table: SlugTable): TogglesParse {
  const toggles = new Map<ToggleKey, ToggleState>();
  const bad: number[] = [];
  for (const [index, raw] of text.split(LINE).entries()) {
    const line = raw.trim();
    const groups = TOGGLE_LINE.exec(line)?.groups;
    const entry = Slug.safeParse(groups?.['entry']);
    const rule = RuleIndex.safeParse(Number(groups?.['rule']));
    const state = Slug.safeParse(groups?.['state']);
    if (entry.success && rule.success && state.success) {
      toggles.set(toggleKeyOf(table.idOf(entry.data), rule.data), stateOf(state.data));
    } else if (line !== '') {
      bad.push(index + 1);
    }
  }
  return { toggles, bad };
}

/** A toggle as the playground shows it: its slot as typed, the option it sets, and its state. */
export interface ToggleRow {
  readonly slot: string;
  readonly option: string;
  readonly on: boolean;
  readonly suboption: string | undefined;
}

/** Shows a toggle with its slot as typed (`barbarian:0`), or its key for an entry with no slug. */
export function toggleRow({ key, origin, rule, option, on, suboption }: ToggleSlot, table: SlugTable): ToggleRow {
  const entry = table.slugOf(origin.entry);
  return { slot: entry === undefined ? key : `${entry}:${rule}`, option, on, suboption };
}
