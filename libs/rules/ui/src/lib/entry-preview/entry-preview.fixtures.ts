import { contentId, ContentLevel, ContentText, EntrySlug, PackId, RichText, SourceRef } from '@pioneer/rules/sdk';

import type { EntryPreview } from './entry-preview';

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
