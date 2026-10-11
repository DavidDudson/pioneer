import type { SelectOption } from '@pioneer/frontier';

import type { LanguageLine } from '../languages/language-line';

/** A dwarf who knows Common and Dwarven, Empyrean from a feat, and picked Goblin. */
export const DWARF_LANGUAGES: readonly LanguageLine[] = [
  { key: 'common', name: 'Common', from: 'Dwarf' },
  { key: 'dwarven', name: 'Dwarven', from: 'Dwarf' },
  { key: 'empyrean', name: 'Empyrean', from: 'Angelkin' },
  { key: 'goblin', name: 'Goblin', slot: 'language:1:0' },
];

/** What the dwarf's next language slot offers. */
export const DWARF_LANGUAGE_OPTIONS: readonly SelectOption<string>[] = [
  { value: 'draconic', label: 'Draconic' },
  { value: 'elven', label: 'Elven' },
  { value: 'petran', label: 'Petran' },
];
