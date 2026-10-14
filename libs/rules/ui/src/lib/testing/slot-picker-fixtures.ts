import { Attribute, Proficiency, Rarity, RichText, SourceRef } from '@pioneer/rules/sdk';

import type {
  AttributePickerRow,
  LanguagePickerRow,
  SkillPickerRow,
  SlotPickerFacts,
  SlotPickerRow,
} from '../slot-picker/slot-picker-row';

/** Player Core, page 1: a source for a fixture option. */
const PLAYER_CORE: readonly SourceRef[] = [SourceRef.parse({ kind: 'book', book: 'player-core', page: 1 })];

/** An option of a slot that lists its options: a name and a source. */
export function slotRow(overrides: Partial<SlotPickerRow> & Pick<SlotPickerRow, 'id' | 'name'>): SlotPickerRow {
  return { sources: PLAYER_CORE, facts: undefined, disabledReason: undefined, ...overrides };
}

/** An Arcana-like skill the character is trained in, with +5. */
export function skillRow(overrides: Partial<SkillPickerRow> & Pick<SkillPickerRow, 'id' | 'name'>): SkillPickerRow {
  return {
    attribute: Attribute.Intelligence,
    rank: Proficiency.Trained,
    modifier: 5,
    disabledReason: undefined,
    ...overrides,
  };
}

/** A common language the character does not know. */
export function languageRow(
  overrides: Partial<LanguagePickerRow> & Pick<LanguagePickerRow, 'id' | 'name'>,
): LanguagePickerRow {
  return { rarity: Rarity.Common, known: false, sources: PLAYER_CORE, disabledReason: undefined, ...overrides };
}

/** Strength at +2, which a boost would make +3. */
export function attributeRow(
  overrides: Partial<AttributePickerRow> & Pick<AttributePickerRow, 'id' | 'name'>,
): AttributePickerRow {
  return { modifier: 2, boosted: 3, disabledReason: undefined, ...overrides };
}

/** A 3rd-level uncommon option's facts: its level, rarity, traits and a one-line summary. */
export const SLOT_FACTS: SlotPickerFacts = {
  level: 3,
  rarity: Rarity.Uncommon,
  traits: ['Fire', 'Magical'],
  summary: RichText.parse([{ type: 'paragraph', content: [{ type: 'text', text: 'Burns what it touches.' }] }]),
};
