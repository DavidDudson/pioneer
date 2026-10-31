import {
  CharacterDocumentSchema,
  CharacterId,
  CharacterLevel,
  CharacterName,
  characterSlots,
  CLASS_SLOT,
  CURRENT_SCHEMA_VERSION,
  itemContent,
  slotContent,
  SlotStatus,
} from '@pioneer/character/domain';
import type { CharacterDocument, SlotContent } from '@pioneer/character/domain';
import { ContentId, ContentKind } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentRegistry } from '@pioneer/rules/sdk';
import { derivedId, FixtureNamespace, UserId } from '@pioneer/shared/kernel';

import { BUILD_LEVEL, openFills } from './level-20-fills';
import { gearedInventory } from './level-20-gear';

/*
 * A level 20 character with every slot it has filled and gear on it, built the way a player builds one: each pass gives
 * every open slot the first offer no other slot took, then slots a pick opened are filled by the next pass, and a pick
 * its slot reads as invalid is replaced. Gear is the best armor, shield and weapons the packs hold at 20th level or
 * below, the worn items that must be invested up to the limit, and consumables.
 */

/** Most passes before giving up: a level 20 character has about a hundred slots, and a pick opens at most a few. */
const PASSES_MAX = 600;
/** Most rounds of replacing invalid picks; real content settles in a few. */
const REPAIRS_MAX = 8;

/** The picks to leave out, as `slot=value`. */
type Rejected = ReadonlySet<string>;

const pickKey = (slot: string, value: string): string => `${slot}=${value}`;

function withPick(document: CharacterDocument, slot: string, value: ChoiceValue): CharacterDocument {
  const { build } = document;
  return { ...document, build: { ...build, choices: { ...build.choices, [slot]: value } } };
}

/**
 * `document` with every open slot filled once: each takes its first offer that no other slot took in this pass and
 * that is not rejected. Slots are read once per pass, not once per pick, as reading them resolves the grants at every
 * level; a pick that opens a slot, or that an earlier pick makes invalid, is dealt with by the next pass or by
 * `repaired`. Undefined when no slot could be filled.
 */
function filledOnce(
  document: CharacterDocument,
  content: SlotContent,
  rejected: Rejected,
): CharacterDocument | undefined {
  const taken = new Set<ChoiceValue>();
  let next: CharacterDocument | undefined = undefined;
  for (const { slot, candidates } of openFills(document, content)) {
    const found = candidates.find((candidate) => !taken.has(candidate) && !rejected.has(pickKey(slot, candidate)));
    if (found !== undefined) {
      taken.add(found);
      next = withPick(next ?? document, slot, found);
    }
  }
  return next;
}

/** `document` with every slot it has filled, as far as the content offers. */
function filled(start: CharacterDocument, content: SlotContent, rejected: Rejected): CharacterDocument {
  let document = start;
  for (let pass = 0; pass < PASSES_MAX; pass += 1) {
    const next = filledOnce(document, content, rejected);
    if (next === undefined) {
      return document;
    }
    document = next;
  }
  return document;
}

/** The picks the character holds that their slots read as invalid (a feat whose prerequisites are unmet). */
function invalidPicks(document: CharacterDocument, content: SlotContent): string[] {
  return characterSlots(document, content).flatMap((slot) =>
    slot.status === SlotStatus.Invalid ? [pickKey(slot.key, slot.selection)] : [],
  );
}

/** `document` without the `invalid` picks. */
function withoutPicks(document: CharacterDocument, invalid: readonly string[]): CharacterDocument {
  const { build } = document;
  const choices = Object.fromEntries(
    Object.entries(build.choices).filter(([slot, value]) => !invalid.includes(pickKey(slot, value))),
  );
  return { ...document, build: { ...build, choices } };
}

/**
 * Fills `start`, then takes out each pick its slot reads as invalid and fills again without it, until none is. A slot
 * whose every offer reads invalid (Exemplar's Energized Spark oscillates whichever element is picked) is left open.
 */
function repaired(start: CharacterDocument, content: SlotContent): CharacterDocument {
  const rejected = new Set<string>();
  let document = filled(start, content, rejected);
  for (let round = 0; round < REPAIRS_MAX; round += 1) {
    const invalid = invalidPicks(document, content);
    if (invalid.length === 0) {
      return document;
    }
    for (const pick of invalid) {
      rejected.add(pick);
    }
    document = filled(withoutPicks(document, invalid), content, rejected);
  }
  return withoutPicks(document, invalidPicks(document, content));
}

/** A character of 20th level with `classId`, ready to be filled. */
function started(classId: ContentId, name: string): CharacterDocument {
  return CharacterDocumentSchema.parse({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: CharacterId.parse(derivedId(FixtureNamespace, `character:${name}`)),
    ownerId: UserId.parse(derivedId(FixtureNamespace, 'user:bench')),
    name: CharacterName.parse(name),
    level: CharacterLevel.parse(BUILD_LEVEL),
    build: { choices: { [CLASS_SLOT]: classId } },
  });
}

/** What a build bench is given for one class. */
export interface Level20Build {
  readonly name: string;
  readonly document: CharacterDocument;
}

/** A 20th level character of every class `registry` holds, with all its slots filled and its gear on. */
export function level20Builds(registry: ContentRegistry): readonly Level20Build[] {
  const content = slotContent(registry);
  const inventory = gearedInventory(itemContent(registry));
  return content.lookup.ofKind(ContentKind.Class).map((entry) => {
    const name = String(entry.name);
    const document = repaired(started(ContentId.parse(entry.id), name), content);
    return { name, document: { ...document, inventory } };
  });
}
