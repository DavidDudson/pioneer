import { Attribute, HitPoints, RichText, SourceRef } from '@pioneer/rules/sdk';

import type { ClassPickerRow, KeyAttributePickerRow, SubclassPickerRow } from '../class-picker/class-picker-row';

/** Player Core, page 1: a source for a fixture class. */
const PLAYER_CORE: readonly SourceRef[] = [SourceRef.parse({ kind: 'book', book: 'player-core', page: 1 })];

const WIZARD_HIT_POINTS = HitPoints.parse(6);
const WIZARD_EXTRA_SKILLS = 2;
const SCORE_BASE = 10;
const SCORE_PER_MODIFIER = 2;

/** A wizard: Intelligence, 6 HP, Arcana and two more skills, arcane, Perception trained and Will expert. */
export function classRow(overrides: Partial<ClassPickerRow> & Pick<ClassPickerRow, 'id' | 'name'>): ClassPickerRow {
  return {
    keyAttribute: [Attribute.Intelligence],
    hitPoints: WIZARD_HIT_POINTS,
    skills: ['Arcana'],
    additionalSkills: WIZARD_EXTRA_SKILLS,
    traditions: ['Arcane'],
    proficiencies: ['Perception: Trained', 'Will: Expert'],
    sources: PLAYER_CORE,
    note: undefined,
    disabledReason: undefined,
    ...overrides,
  };
}

/** A subclass that says one thing about itself. */
export function subclassRow(
  overrides: Partial<SubclassPickerRow> & Pick<SubclassPickerRow, 'id' | 'name'>,
): SubclassPickerRow {
  return {
    summary: RichText.parse([{ type: 'paragraph', content: [{ type: 'text', text: 'You study the arcane' }] }]),
    sources: PLAYER_CORE,
    note: undefined,
    disabledReason: undefined,
    ...overrides,
  };
}

/** An attribute with the character's modifier in it and the score that stands for. */
export function keyAttributeRow(attribute: Attribute, name: string, modifier: number): KeyAttributePickerRow {
  return {
    id: attribute,
    name,
    modifier,
    score: SCORE_BASE + SCORE_PER_MODIFIER * modifier,
    disabledReason: undefined,
  };
}
