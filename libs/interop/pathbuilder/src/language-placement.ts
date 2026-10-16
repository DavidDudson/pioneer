import { knownLanguages, languageReads, languageSlots } from '@pioneer/character/domain';
import type { CharacterDocument, SlotContent } from '@pioneer/character/domain';
import { ChoiceValue, ContentId, Level } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';

import type { ContentLookup } from './content-lookup';
import { ImportKind } from './import-kind';
import type { ImportedName, PathbuilderName } from './import-kind';

export type LanguagePicks = Readonly<Record<SlotKey, ChoiceValue>>;

/** The picks for the character's language slots, and the matched languages the character still doesn't know. */
export interface LanguagePlacement {
  readonly choices: LanguagePicks;
  readonly unplaced: readonly PathbuilderName[];
}

/** A language the export lists that matched content. */
interface Wanted {
  readonly name: PathbuilderName;
  readonly id: ContentId;
}

function matched(names: readonly ImportedName[], lookup: ContentLookup): Wanted[] {
  return names
    .filter(({ kind }) => kind === ImportKind.Language)
    .flatMap(({ name }): Wanted[] => {
      const match = lookup.resolve(ImportKind.Language, name);
      return match === undefined ? [] : [{ name, id: ContentId.parse(match.id) }];
    });
}

/** What placing needs beside the document: the slots' content and the languages' names. */
export interface LanguagePlacementContent {
  readonly slots: SlotContent;
  readonly lookup: ContentLookup;
}

function withPicks(document: CharacterDocument, picks: LanguagePicks): CharacterDocument {
  return { ...document, build: { ...document.build, choices: { ...document.build.choices, ...picks } } };
}

/** The first offer of each open slot up to the character's level that the export wants, no language twice. */
function pick(document: CharacterDocument, slots: SlotContent, wantedIds: ReadonlySet<ContentId>): LanguagePicks {
  const level = Level.parse(document.level);
  const picks: Record<SlotKey, ChoiceValue> = {};
  const taken = new Set<ContentId>();
  for (const slot of languageSlots(document, languageReads(document, slots))) {
    const option =
      slot.level <= level && slot.stored === undefined
        ? slot.options.find(({ id }) => wantedIds.has(id) && !taken.has(id))
        : undefined;
    if (option !== undefined) {
      taken.add(option.id);
      picks[slot.key] = ChoiceValue.parse(option.id);
    }
  }
  return picks;
}

/**
 * Pathbuilder's languages in `document`'s language slots (#308): each open slot up to the character's level takes the
 * first language it offers that the export lists. Languages the ancestry and features grant need no slot. Whatever
 * the character still doesn't know afterwards is unplaced: no slot offers it, or none is left.
 */
export function placeLanguages(
  document: CharacterDocument,
  { slots, lookup }: LanguagePlacementContent,
  names: readonly ImportedName[],
): LanguagePlacement {
  const wanted = matched(names, lookup);
  const picks = pick(document, slots, new Set(wanted.map(({ id }) => id)));
  const placed = withPicks(document, picks);
  const known = new Set(knownLanguages(placed, languageReads(placed, slots)).map(({ language }) => language.id));
  return { choices: picks, unplaced: wanted.filter(({ id }) => !known.has(id)).map(({ name }) => name) };
}
