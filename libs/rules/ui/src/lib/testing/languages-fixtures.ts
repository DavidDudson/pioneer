import { Rarity } from '@pioneer/rules/sdk';

import type { LanguageLine } from '../languages/language-line';
import type { LanguagePickerRow } from '../slot-picker/slot-picker-row';
import { languageRow } from './slot-picker-fixtures';

/** A dwarf who knows Common and Dwarven, Empyrean from a feat, and picked Goblin. */
export const DWARF_LANGUAGES: readonly LanguageLine[] = [
  { key: 'common', name: 'Common', from: 'Dwarf' },
  { key: 'dwarven', name: 'Dwarven', from: 'Dwarf' },
  { key: 'empyrean', name: 'Empyrean', from: 'Angelkin' },
  { key: 'goblin', name: 'Goblin', slot: 'language:1:0' },
];

/** What the dwarf's next language slot offers. */
export const DWARF_LANGUAGE_ROWS: readonly LanguagePickerRow[] = [
  languageRow({ id: 'draconic', name: 'Draconic', rarity: Rarity.Uncommon }),
  languageRow({ id: 'elven', name: 'Elven' }),
  languageRow({ id: 'petran', name: 'Petran', rarity: Rarity.Rare }),
];
