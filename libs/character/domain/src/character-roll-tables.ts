import { RollTable } from './roll-table';

/** Names for a generated character. Pioneer's own table, not from a rulebook: no ancestry owns a name. */
export const CHARACTER_NAMES: RollTable = RollTable.parse({
  id: 'character-names',
  entries: [
    'Alder Venn',
    'Brisa Thornwick',
    'Calder Moss',
    'Dara Quillon',
    'Edric Ashgrove',
    'Fenna Marrow',
    'Garrick Holt',
    'Hesper Lindqvist',
    'Isolde Cray',
    'Joren Fairweather',
    'Kestrel Dunmore',
    'Lysa Brandt',
    'Maren Oakhollow',
    'Nikos Vane',
    'Orla Penhallow',
    'Perrin Wick',
    'Quill Sorrel',
    'Rowan Tallis',
    'Sabine Corvane',
    'Tobiah Greer',
    'Una Ravenscar',
    'Varek Stonebrook',
    'Wren Halloway',
    'Yara Dunstan',
  ],
});

/** What a generated character is like. Pioneer's own table, not from a rulebook. */
export const CHARACTER_TRAITS: RollTable = RollTable.parse({
  id: 'character-traits',
  entries: [
    'Always the first to volunteer, and the last to ask what the job pays.',
    'Keeps a careful ledger of every favour owed, in either direction.',
    'Hums while working, and stops only when something is wrong.',
    'Cannot pass a stray animal without feeding it.',
    'Speaks plainly and expects the same in return.',
    'Collects stories from strangers and retells them at the next fire.',
    'Calm when everyone else is shouting.',
    'Treats every promise as binding, however casually it was made.',
    'Laughs easily, even at their own expense.',
    'Reads the weather in the sky before reading the room.',
    'Gives gifts that are always a little too thoughtful.',
    'Sleeps lightly and wakes before the watch changes.',
  ],
});

/** What holds a generated character back. Pioneer's own table, not from a rulebook. */
export const CHARACTER_FLAWS: RollTable = RollTable.parse({
  id: 'character-flaws',
  entries: [
    'Cannot let an insult go unanswered.',
    'Trusts anyone who shares a meal.',
    'Hoards small, useless keepsakes.',
    'Sure that the plan is fine, right up until it is not.',
    'Avoids asking for help, then resents not getting it.',
    'Bluffs when unsure, and is bad at it.',
    'Holds a grudge long after the reason is forgotten.',
    'Cannot resist a locked door.',
    'Spends coin the day it is earned.',
    'Tells the same three stories at every camp.',
    'Judges people by their boots.',
    'Puts off bad news until it cannot be put off.',
  ],
});
