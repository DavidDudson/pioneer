import { Level, SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { AttributesMessage } from '../attributes/attributes-messages';
import { ChoiceState } from '../choices/choice-line';
import type { ChoiceLine } from '../choices/choice-line';

const FIFTH = Level.parse(5);
const NONE = { selection: undefined, level: undefined, reason: undefined };

/**
 * A 3rd-level elf: ancestry picked, background still open, a boost placed, a planned 5th-level boost and one that
 * repeats it, a skill that stopped being offered, and a pick kept from a choice it no longer has.
 */
export const ELF_CHOICES: readonly ChoiceLine[] = [
  {
    ...NONE,
    key: SlotKey.parse('ancestry'),
    label: message('rules.choices.slot.ancestry'),
    state: ChoiceState.Filled,
    selection: { name: 'Elf' },
  },
  {
    ...NONE,
    key: SlotKey.parse('background'),
    label: message('rules.choices.slot.background'),
    state: ChoiceState.Open,
  },
  {
    ...NONE,
    key: SlotKey.parse('boost:1:free:0'),
    label: message(AttributesMessage.FreeBoost, { level: 1 }),
    state: ChoiceState.Filled,
    selection: { attribute: 'dex' },
  },
  {
    ...NONE,
    key: SlotKey.parse('boost:5:free:0'),
    label: message(AttributesMessage.FreeBoost, { level: 5 }),
    state: ChoiceState.Planned,
    selection: { attribute: 'str' },
    level: FIFTH,
  },
  {
    ...NONE,
    key: SlotKey.parse('boost:5:free:1'),
    label: message(AttributesMessage.FreeBoost, { level: 5 }),
    state: ChoiceState.Invalid,
    selection: { attribute: 'str' },
    level: FIFTH,
    reason: message('rules.choices.invalid.boostTaken'),
  },
  {
    ...NONE,
    key: SlotKey.parse('choice:elf:skill'),
    label: message('rules.choices.slot.choice', { entry: 'Elf', prompt: 'Skill' }),
    state: ChoiceState.Invalid,
    selection: { name: 'Stealth' },
    reason: message('rules.choices.invalid.notOffered'),
  },
  {
    ...NONE,
    key: SlotKey.parse('choice:cavern-elf:0'),
    label: message('rules.choices.slot.unknown'),
    state: ChoiceState.Hidden,
    selection: { name: 'Cavern' },
  },
];
