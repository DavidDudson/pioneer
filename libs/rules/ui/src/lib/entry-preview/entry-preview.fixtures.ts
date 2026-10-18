import {
  ConditionValue,
  contentId,
  ContentId,
  ContentLevel,
  ContentText,
  EntrySlug,
  ModifierType,
  PackId,
  RichText,
  SourceRef,
} from '@pioneer/rules/sdk';

import { line } from '../testing/breakdown-fixtures';
import type { EntryPreview, EntryPreviews } from './entry-preview';

const SPELL_LEVEL = ContentLevel.parse(3);

export const FIREBALL = contentId(PackId.parse('player-core'), EntrySlug.parse('spell:fireball'));

/** Fireball as a preview shows it: two paragraphs, of which the card keeps the first. */
export const FIREBALL_PREVIEW: EntryPreview = {
  name: ContentText.parse('Fireball'),
  level: SPELL_LEVEL,
  traits: ['concentrate', 'fire', 'manipulate'],
  summary: RichText.parse([
    { type: 'paragraph', content: [{ type: 'text', text: 'A roaring blast of fire burns creatures in the area.' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Heightened: the damage increases by 2d6.' }] },
  ]),
  sources: [SourceRef.parse({ kind: 'book', book: 'player-core', page: 326 })],
};

const CLUMSY = contentId(PackId.parse('player-core'), EntrySlug.parse('condition:clumsy'));

/** Clumsy 2 on a character: the entry with its value, and the statistics it lowers by that value. */
export const CLUMSY_PREVIEW: EntryPreview = {
  name: ContentText.parse('Clumsy'),
  level: undefined,
  traits: [],
  summary: RichText.parse([
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Your movements become clumsy and inexact. Clumsy always includes a value.' }],
    },
  ]),
  sources: [SourceRef.parse({ kind: 'book', book: 'player-core', page: 442 })],
  value: ConditionValue.parse(2),
  effects: [
    { statistic: 'Armor Class', line: line(ContentId.parse(CLUMSY), { type: ModifierType.Status, value: -2 }) },
    { statistic: 'Reflex', line: line(ContentId.parse(CLUMSY), { type: ModifierType.Status, value: -2 }) },
  ],
};

/** Previews that hold fireball and nothing else. */
export const FIREBALL_PREVIEWS: EntryPreviews = {
  preview: (id): EntryPreview | undefined => (id === FIREBALL ? FIREBALL_PREVIEW : undefined),
};
