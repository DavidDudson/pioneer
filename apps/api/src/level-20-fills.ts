import {
  ANCESTRY_SLOT,
  boostSets,
  CLASS_SLOT,
  DEITY_SLOT,
  languageReads,
  languageSlots,
  needsDeity,
  preparedReads,
  preparedSlots,
  signatureSlots,
  skillReads,
  skillSlots,
} from '@pioneer/character/domain';
import type { CharacterDocument, SlotContent } from '@pioneer/character/domain';
import { resolveGrants } from '@pioneer/rules/grants';
import type { GrantResolution } from '@pioneer/rules/grants';
import { ChoiceValue, ContentId, Level, SlotKey } from '@pioneer/rules/sdk';

/** The ancestry the builds take when the packs have it; another is taken if not. */
const PREFERRED_ANCESTRY = 'Human';

/** The level every build is read at. */
export const BUILD_LEVEL = Level.parse(20);

/** One slot to fill and the values it would take, best first. */
export interface Fill {
  readonly slot: SlotKey;
  readonly candidates: readonly ChoiceValue[];
}

/** A slot's offer: an option with the value a pick stores, and the name a player knows it by. */
interface Offered {
  readonly value: ChoiceValue;
  readonly label: string;
}

/** The character's grants at the build level over its picks, with its own slots as roots. */
function grantsOf(document: CharacterDocument, content: SlotContent): GrantResolution {
  const picks = new Map(Object.entries(document.build.choices).map(([key, value]) => [SlotKey.parse(key), value]));
  return resolveGrants({
    roots: [],
    lookup: content.lookup,
    level: BUILD_LEVEL,
    situation: [],
    picks,
    toggles: new Map(),
    rootSlots: content.rootSlots,
    namespaces: content.namespaces,
  });
}

/** The level of the entry `value` names; 0 for one without, such as a listed option. */
function levelOf(content: SlotContent, value: ChoiceValue): number {
  const id = ContentId.safeParse(value);
  return (id.success ? content.lookup.entry(id.data)?.facts?.level : undefined) ?? 0;
}

/**
 * The offers of a root or `ChoiceSet` slot in the order they are tried: lowest level first, as a slot takes no feat
 * above the level it opens at, and the ancestry slot's `PREFERRED_ANCESTRY` first.
 */
function ordered(slot: SlotKey, options: readonly Offered[], content: SlotContent): Fill {
  const preferred = slot === ANCESTRY_SLOT ? options.filter(({ label }) => label === PREFERRED_ANCESTRY) : [];
  const lowest = options
    .map(({ value }) => value)
    .toSorted((left, right) => levelOf(content, left) - levelOf(content, right));
  return { slot, candidates: [...preferred.map(({ value }) => value), ...lowest] };
}

/** The character's own slots that are open: ancestry, heritage, background and, when it needs one, deity. */
function rootFills(grants: GrantResolution, content: SlotContent): Fill[] {
  return grants.rootSlots
    .filter((root) => root.pick === undefined && root.key !== CLASS_SLOT)
    .filter((root) => root.key !== DEITY_SLOT || needsDeity(grants.rollOptions))
    .map((root) => ordered(root.key, root.options, content));
}

/** The attribute boosts not placed yet. */
function boostFills(document: CharacterDocument, content: SlotContent): Fill[] {
  return boostSets(document, content.boosts)
    .flatMap((set) => set.slots)
    .filter((slot) => slot.pick === undefined)
    .map((slot) => ({ slot: slot.key, candidates: slot.options.map((option) => ChoiceValue.parse(option)) }));
}

/** The trained skills and skill increases not placed yet, then the languages. */
function trainingFills(document: CharacterDocument, content: SlotContent): Fill[] {
  const skills = skillSlots(document, skillReads(document, content));
  const languages = languageSlots(document, languageReads(document, content));
  return [...skills, ...languages]
    .filter((slot) => slot.pick === undefined)
    .map((slot) => ({ slot: slot.key, candidates: slot.options.map((option) => ChoiceValue.parse(option.id)) }));
}

/** The `ChoiceSet` slots not answered: feats, subclasses and the like. */
function choiceFills(document: CharacterDocument, grants: GrantResolution, content: SlotContent): Fill[] {
  const { choices } = document.build;
  return grants.open
    .filter((slot) => choices[slot.key] === undefined && !slot.optional)
    .map((slot) => ordered(slot.key, slot.options, content));
}

/** The prepared, repertoire and signature spell slots not filled yet. */
function spellFills(document: CharacterDocument, content: SlotContent): Fill[] {
  const reads = preparedReads(document, content);
  return [...preparedSlots(document, reads), ...signatureSlots(document, reads)]
    .filter((slot) => slot.pick === undefined)
    .map((slot) => ({ slot: slot.key, candidates: slot.options.map((option) => ChoiceValue.parse(option.id)) }));
}

/** The slots that are open, in the order a builder fills them: its own, boosts, skills, languages, choices, spells. */
export function openFills(document: CharacterDocument, content: SlotContent): Fill[] {
  const grants = grantsOf(document, content);
  return [
    ...rootFills(grants, content),
    ...boostFills(document, content),
    ...trainingFills(document, content),
    ...choiceFills(document, grants, content),
    ...spellFills(document, content),
  ];
}
