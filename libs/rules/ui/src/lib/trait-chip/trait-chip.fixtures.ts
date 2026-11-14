import { ContentText, RichText, Trait, traitId } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import type { EntryPreview, EntryPreviews } from '../entry-preview/entry-preview';

export const FIRE = Trait.parse('fire');
export const MANIPULATE = Trait.parse('manipulate');
export const DEADLY_D8 = Trait.parse('deadly-d8');
export const NOT_A_TRAIT = Trait.parse('not-a-trait');

function trait(name: string, text: string | undefined): EntryPreview {
  return {
    name: ContentText.parse(name),
    level: undefined,
    traits: [],
    summary: RichText.parse(text === undefined ? [] : [{ type: 'paragraph', content: [{ type: 'text', text }] }]),
    sources: [],
  };
}

/** The trait entries a page holds; Manipulate has an entry with an empty description. */
const TRAIT_CARDS: ReadonlyMap<ContentId, EntryPreview> = new Map([
  [traitId(FIRE), trait('Fire', 'Effects with this trait deal fire damage or use the power of fire.')],
  [traitId(MANIPULATE), trait('Manipulate', undefined)],
  [traitId(DEADLY_D8), trait('Deadly d8', 'On a critical hit, the weapon adds a die of the listed size.')],
]);

/** Previews that hold the trait entries and know nothing else, so a slug outside them has no card. */
export const HELD_TRAIT_PREVIEWS: EntryPreviews = { preview: (id) => TRAIT_CARDS.get(id) };

/** The app-wide shape: nothing held, every trait fetched on first open, a slug outside the vocabulary missing. */
export const FETCHED_TRAIT_PREVIEWS: EntryPreviews = {
  preview: (): undefined => undefined,
  load: async (id): Promise<EntryPreview | undefined> => TRAIT_CARDS.get(id),
};
