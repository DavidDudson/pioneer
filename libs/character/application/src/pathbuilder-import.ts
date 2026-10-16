import {
  BACKGROUND_SLOT,
  CLASS_SLOT,
  hasSecondClass,
  HERITAGE_SLOT,
  rootSlotOptions,
  SECOND_CLASS_SLOT,
} from '@pioneer/character/domain';
import type { Character, CharacterDocument, SlotContent } from '@pioneer/character/domain';
import {
  ImportKind,
  PathbuilderProblem,
  placeBoosts,
  placeFeats,
  placeFlaws,
  placeLanguages,
  placeSkills,
  placeSpells,
  readPathbuilderExport,
} from '@pioneer/interop/pathbuilder';
import type {
  BoostChoices,
  ContentLookup,
  ImportedName,
  PathbuilderImport,
  PathbuilderName,
  PathbuilderReadFailure,
  SkillGap,
  SpellGap,
  UnplacedBoost,
} from '@pioneer/interop/pathbuilder';
import { AncestryId, ChoiceValue, VariantStructure } from '@pioneer/rules/sdk';
import type { ContentRegistry, SlotKey, VariantRuleEntry } from '@pioneer/rules/sdk';
import { fieldIssues, message, ValidationError } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';

const PROBLEM_MESSAGES = {
  [PathbuilderProblem.Malformed]: 'character.import.problem.malformed',
  [PathbuilderProblem.ExportFailed]: 'character.import.problem.exportFailed',
} as const satisfies Record<PathbuilderProblem, string>;

/**
 * The Dual Class variant rule an export with a second class needs, from the loaded packs; undefined for an export
 * without one, or content that doesn't define the variant.
 */
export function dualClassVariant(value: PathbuilderImport, registry: ContentRegistry): VariantRuleEntry | undefined {
  return value.identity.classes.length < 2
    ? undefined
    : registry
        .variantRules()
        .find((entry) => entry.definition.structure?.includes(VariantStructure.SecondClass) === true);
}

/**
 * The background and class an export names, in their slots, when each matches loaded content: its second class too
 * when the character has a slot for one.
 */
function rootChoices(value: PathbuilderImport, { lookup, slots }: ImportContent): BoostChoices {
  const [first, second] = value.identity.classes;
  const picks: [SlotKey, ImportKind, PathbuilderName | undefined][] = [
    [BACKGROUND_SLOT, ImportKind.Background, value.identity.background],
    [CLASS_SLOT, ImportKind.Class, first],
    [SECOND_CLASS_SLOT, ImportKind.Class, hasSecondClass(slots.rootSlots) ? second : undefined],
  ];
  return Object.fromEntries(
    picks.flatMap(([slot, kind, name]) => {
      const match = name === undefined ? undefined : lookup.resolve(kind, name);
      return match === undefined ? [] : [[slot, ChoiceValue.parse(match.id)]];
    }),
  );
}

/** What an import is matched against: content by name, and what each slot offers, boosts included. */
export interface ImportContent {
  readonly lookup: ContentLookup;
  readonly slots: SlotContent;
}

/** The export's heritage in its slot, or the heritage named as not offered when the slot refuses it. */
interface HeritageChoice {
  readonly choices: BoostChoices;
  readonly notOffered: readonly ImportedName[];
}

/**
 * The heritage an export names, in its slot when it matches a loaded heritage that `document`'s ancestry offers (one
 * of its own or a versatile one). A loaded heritage of another ancestry stays out, named as not offered.
 */
function heritageChoice(
  value: PathbuilderImport,
  { lookup, slots }: ImportContent,
  document: CharacterDocument,
): HeritageChoice {
  const name = value.identity.heritage;
  const match = name === undefined ? undefined : lookup.resolve(ImportKind.Heritage, name);
  if (name === undefined || match === undefined) {
    return { choices: {}, notOffered: [] };
  }
  const selection = ChoiceValue.parse(match.id);
  const offered = rootSlotOptions(document, slots, HERITAGE_SLOT).some((option) => option.value === selection);
  return offered
    ? { choices: { [HERITAGE_SLOT]: selection }, notOffered: [] }
    : { choices: {}, notOffered: [{ kind: ImportKind.Heritage, name }] };
}

/**
 * The second class an export names that matched loaded content but has no slot to go in, because the character does
 * not use Dual Class: named as not offered.
 */
function secondClassNotOffered(value: PathbuilderImport, { lookup, slots }: ImportContent): readonly ImportedName[] {
  const [, name] = value.identity.classes;
  const matched = name !== undefined && lookup.resolve(ImportKind.Class, name) !== undefined;
  return matched && !hasSecondClass(slots.rootSlots) ? [{ kind: ImportKind.Class, name }] : [];
}

/** A character an export makes, the export's boosts no slot took, and the matched names their slot refused. */
export interface ImportedCharacter {
  /** Whether the second class is picked, so the character needs the Dual Class variant rule. */
  readonly dualClass: boolean;
  readonly character: Character;
  readonly unplaced: readonly UnplacedBoost[];
  readonly skillGaps: readonly SkillGap[];
  readonly spellGaps: readonly SpellGap[];
  readonly notOffered: readonly ImportedName[];
}

/** What the feat, skill and language slots took from an export, on top of the choices already made. */
interface SlotFills {
  readonly choices: BoostChoices;
  readonly skillGaps: readonly SkillGap[];
  readonly spellGaps: readonly SpellGap[];
  readonly notOffered: readonly ImportedName[];
}

/** The character `create` makes, and the choices already made in it. */
interface Build {
  readonly create: (choices: BoostChoices) => Character;
  readonly choices: BoostChoices;
}

/** The feats, then the skills and Lores, the languages and the spells in the slots `build` opens, each read after the last. */
function slotFills(value: PathbuilderImport, content: ImportContent, { create, choices: built }: Build): SlotFills {
  const feats = placeFeats(create(built).document, content, value.feats);
  const withFeats = { ...built, ...feats.choices };
  const skills = placeSkills(create(withFeats).document, content.slots, value);
  const withSkills = { ...withFeats, ...skills.choices };
  const languages = placeLanguages(create(withSkills).document, content, value.names);
  const withLanguages = { ...withSkills, ...languages.choices };
  const spells = placeSpells(create(withLanguages).document, content, value.casters);
  return {
    choices: { ...withLanguages, ...spells.choices },
    skillGaps: skills.gaps,
    spellGaps: spells.gaps,
    notOffered: [
      ...feats.unplaced.map(({ name }): ImportedName => ({ kind: ImportKind.Feat, name })),
      ...languages.unplaced.map((name): ImportedName => ({ kind: ImportKind.Language, name })),
    ],
  };
}

/**
 * The character `create` makes from an export: its background and class (and second class) picked, then the heritage
 * its ancestry offers, then each boost in the slots they open, the voluntary flaws (#550) and the feats in the slots
 * those open, the skills and Lores in the skill slots, the languages in the language slots (#308) and the spells in the
 * prepared and repertoire slots (#311); a matched feat or
 * language no slot offers is named as not offered.
 */
export function importedCharacter(
  value: PathbuilderImport,
  content: ImportContent,
  create: (choices: BoostChoices) => Character,
): ImportedCharacter {
  const roots = rootChoices(value, content);
  const heritage = heritageChoice(value, content, create(roots).document);
  const picked = { ...roots, ...heritage.choices };
  const { document } = create(picked);
  const placement = placeBoosts(document, content.slots.boosts, value.boosts);
  const flaws = placeFlaws(document, content.slots.boosts, value.flaws);
  const built = { ...picked, ...placement.choices, ...flaws };
  const fills = slotFills(value, content, { create, choices: built });
  return {
    dualClass: SECOND_CLASS_SLOT in roots,
    character: create(fills.choices),
    unplaced: placement.unplaced,
    skillGaps: fills.skillGaps,
    spellGaps: fills.spellGaps,
    notOffered: [...heritage.notOffered, ...secondClassNotOffered(value, content), ...fills.notOffered],
  };
}

/** The problem first, as the issue the UI shows, then the schema issues that explain it. */
function readIssues({ problem, issues }: PathbuilderReadFailure): FieldIssue[] {
  return [{ path: [], message: message(PROBLEM_MESSAGES[problem]) }, ...fieldIssues(issues)];
}

/** The export read again on the server; refused when it can't be read. */
export function readExport(raw: unknown): PathbuilderImport {
  const read = readPathbuilderExport(raw);
  if (!read.ok) {
    throw new ValidationError(readIssues(read));
  }
  return read.value;
}

/** The loaded ancestry the export names; refused by name when there is none. */
export function matchedAncestry(value: PathbuilderImport, lookup: ContentLookup): AncestryId {
  const match = lookup.resolve(ImportKind.Ancestry, value.identity.ancestry);
  if (match === undefined) {
    throw new ValidationError([
      {
        path: ['build', 'ancestry'],
        message: message('character.validation.unmatchedAncestry', { ancestry: value.identity.ancestry }),
      },
    ]);
  }
  return AncestryId.parse(match.id);
}
