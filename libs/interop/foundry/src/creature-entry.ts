import { FoundryItemType } from './foundry-document';
import type { FoundryDocument } from './foundry-document';
import type { SelectedCreature, SelectedEntry } from './select-entries';

/** The description Foundry keeps for a creature: its public notes, the book's flavour text. */
function publicNotes(system: Readonly<Record<string, unknown>>): string {
  const { details } = system;
  if (typeof details !== 'object' || details === null || !('publicNotes' in details)) {
    return '';
  }
  return typeof details.publicNotes === 'string' ? details.publicNotes : '';
}

/**
 * A selected creature as the document the item pipeline reads: the publication, level and traits move up to where an
 * item keeps them, the public notes become the description, and an actor has no rule elements. Every other field stays
 * on `system` beside them, for the creature translators. Its embedded items are kept on the document.
 */
export function creatureEntry({ pack, path, actor, book }: SelectedCreature): SelectedEntry {
  const { details, traits } = actor.system;
  const document: FoundryDocument = {
    ...actor,
    type: FoundryItemType.Npc,
    system: {
      ...actor.system,
      publication: details.publication,
      level: details.level,
      traits,
      description: { value: publicNotes(actor.system) },
      rules: [],
    },
  };
  return { pack, path, document, type: FoundryItemType.Npc, book };
}
