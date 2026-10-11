import { BACKGROUND_SLOT, CLASS_SLOT, HERITAGE_SLOT, rootSlotOptions } from '@pioneer/character/domain';
import type { Character, CharacterDocument, SlotContent } from '@pioneer/character/domain';
import {
  ImportKind,
  PathbuilderProblem,
  placeBoosts,
  placeFlaws,
  readPathbuilderExport,
} from '@pioneer/interop/pathbuilder';
import type {
  BoostChoices,
  ContentLookup,
  ImportedName,
  PathbuilderImport,
  PathbuilderName,
  PathbuilderReadFailure,
  UnplacedBoost,
} from '@pioneer/interop/pathbuilder';
import { AncestryId, ChoiceValue } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';
import { fieldIssues, message, ValidationError } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';

const PROBLEM_MESSAGES = {
  [PathbuilderProblem.Malformed]: 'character.import.problem.malformed',
  [PathbuilderProblem.ExportFailed]: 'character.import.problem.exportFailed',
} as const satisfies Record<PathbuilderProblem, string>;

/** The background and first class an export names, in their slots, when each matches loaded content. */
function rootChoices(value: PathbuilderImport, lookup: ContentLookup): BoostChoices {
  const picks: [SlotKey, ImportKind, PathbuilderName | undefined][] = [
    [BACKGROUND_SLOT, ImportKind.Background, value.identity.background],
    [CLASS_SLOT, ImportKind.Class, value.identity.classes[0]],
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

/** A character an export makes, the export's boosts no slot took, and the matched names their slot refused. */
export interface ImportedCharacter {
  readonly character: Character;
  readonly unplaced: readonly UnplacedBoost[];
  readonly notOffered: readonly ImportedName[];
}

/**
 * The character `create` makes from an export: its background and class picked, then the heritage its ancestry
 * offers, then each boost in the slots they open, and the voluntary flaws (#550).
 */
export function importedCharacter(
  value: PathbuilderImport,
  content: ImportContent,
  create: (choices: BoostChoices) => Character,
): ImportedCharacter {
  const roots = rootChoices(value, content.lookup);
  const heritage = heritageChoice(value, content, create(roots).document);
  const picked = { ...roots, ...heritage.choices };
  const document = create(picked).document;
  const placement = placeBoosts(document, content.slots.boosts, value.boosts);
  const flaws = placeFlaws(document, content.slots.boosts, value.flaws);
  return {
    character: create({ ...picked, ...placement.choices, ...flaws }),
    unplaced: placement.unplaced,
    notOffered: heritage.notOffered,
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
