import { Feet, HitPoints, RichText, Size, SourceRef } from '@pioneer/rules/sdk';

import type { AncestryPickerRow, BackgroundPickerRow, HeritagePickerRow } from '../origin-picker/origin-picker-row';

/** Player Core, page 1: a source for a fixture origin. */
const PLAYER_CORE: readonly SourceRef[] = [SourceRef.parse({ kind: 'book', book: 'player-core', page: 1 })];

const ELF_HIT_POINTS = HitPoints.parse(6);
const ELF_SPEED = Feet.parse(30);

const ALL_ATTRIBUTES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

/** An elf: 6 HP, Medium, speed 30, a Dexterity and a free boost, a Constitution flaw, common and elven. */
export function ancestryRow(
  overrides: Partial<AncestryPickerRow> & Pick<AncestryPickerRow, 'id' | 'name'>,
): AncestryPickerRow {
  return {
    hitPoints: ELF_HIT_POINTS,
    size: Size.Medium,
    speed: ELF_SPEED,
    boosts: [['dex'], [...ALL_ATTRIBUTES]],
    flaws: ['con'],
    languages: ['Common', 'Elven'],
    traits: ['Elf', 'Humanoid'],
    sources: PLAYER_CORE,
    disabledReason: undefined,
    ...overrides,
  };
}

/** A heritage of the elf ancestry that grants one feature, which `overrides` change. */
export function heritageRow(
  overrides: Partial<HeritagePickerRow> & Pick<HeritagePickerRow, 'id' | 'name'>,
): HeritagePickerRow {
  return {
    ancestry: 'Elf',
    summary: RichText.parse([{ type: 'paragraph', content: [{ type: 'text', text: 'You resist the cold' }] }]),
    grants: ['Cold resistance'],
    sources: PLAYER_CORE,
    disabledReason: undefined,
    ...overrides,
  };
}

/** A background that boosts Intelligence or Wisdom and a free boost, trains Arcana and a Lore and grants a feat. */
export function backgroundRow(
  overrides: Partial<BackgroundPickerRow> & Pick<BackgroundPickerRow, 'id' | 'name'>,
): BackgroundPickerRow {
  return {
    boosts: [['int', 'wis'], [...ALL_ATTRIBUTES]],
    skills: ['Arcana'],
    lores: ['Academia Lore'],
    feats: ['Assurance'],
    note: undefined,
    sources: PLAYER_CORE,
    disabledReason: undefined,
    ...overrides,
  };
}
