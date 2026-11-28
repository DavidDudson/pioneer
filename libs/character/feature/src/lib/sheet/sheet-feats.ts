import { featSlots, PrerequisiteStatus, SlotStatus } from '@pioneer/character/domain';
import type {
  Character,
  CharacterSlot,
  FeatOption,
  FeatSlot,
  PrerequisiteClauseStatus,
} from '@pioneer/character/domain';
import { ContentKind, FeatCategory, Rarity, Trait } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry, SlotKey, SourceRef } from '@pioneer/rules/sdk';
import { ActionKind, featActionKind, PrerequisiteState, richTextWords } from '@pioneer/rules/ui';
import type { Chip, FeatPickerRow, PrerequisiteLine } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { CHARACTER_CONTENT_KINDS } from '../data/content-registry-query';
import { traitChips } from './sheet-build';
import { sheetEntry } from './sheet-entry-previews';
import { sheetTrainedAgain, trainedAgainNote } from './sheet-skill-repeats';
import type { TrainedAgain, Translate } from './sheet-skill-repeats';
import { sheetSlotContent } from './sheet-slot-content';

/** The kinds the feat pickers read: the character's, so its entries resolve, the feats and their archetypes. */
export const FEAT_CONTENT_KINDS: ReadonlyArray<ContentKind> = [
  ...CHARACTER_CONTENT_KINDS,
  ContentKind.Feat,
  ContentKind.Archetype,
];

/** One feat slot on the sheet: its label, the feats it offers, and why its pick counts for nothing. */
export interface SheetFeatSlot {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly options: ReadonlyArray<SheetFeatOption>;
  /** The stored pick's name, so a pick the slot no longer offers still reads by name. */
  readonly storedName: string | undefined;
  /** What each of some feats would train again, by skill name; reads only the ones asked about. */
  readonly trainedAgain: TrainedAgain;
  /** The server's reason when the slot's pick is invalid. */
  readonly reason: MessageDescriptor | undefined;
}

/** A dedication kept out of reach (#467): the archetype it waits on and how many of its feats are still needed. */
interface SheetFeatLock {
  readonly archetype: string;
  readonly needed: number;
}

/**
 * A feat a slot offers, as its picker shows it: unmet prerequisites and a dedication lock shown but not picked, saying
 * what they are.
 */
export interface SheetFeatOption {
  readonly value: string;
  readonly label: string;
  readonly level: number;
  readonly category: FeatCategory;
  readonly action: ActionKind;
  readonly rarity: Rarity;
  readonly traits: ReadonlyArray<Chip>;
  readonly sources: ReadonlyArray<SourceRef>;
  readonly status: PrerequisiteStatus;
  /** Each clause of the prerequisites with its own state, for a feat with several; undefined for any other. */
  readonly clauses: ReadonlyArray<PrerequisiteClauseStatus> | undefined;
  /** What the prerequisites are, as printed; none for a feat without any. */
  readonly prerequisites: string | undefined;
  readonly locked: SheetFeatLock | undefined;
}

/** Every feat slot, lowest first, with the feats each offers at its level (#492): the level tabs' pickers. */
export interface SheetFeats {
  readonly planned: ReadonlyArray<SheetFeatSlot>;
}

/** What a feat entry says that the domain's option does not: how it is taken and used, and where it is printed. */
interface FeatFacts {
  readonly category: FeatCategory;
  readonly action: ActionKind;
  readonly rarity: Rarity;
  readonly traits: ReadonlyArray<Chip>;
  readonly sources: ReadonlyArray<SourceRef>;
}

function factsOf(registry: ContentRegistry, entry: ContentEntry | undefined): FeatFacts {
  if (entry?.kind !== ContentKind.Feat) {
    return {
      category: FeatCategory.General,
      action: ActionKind.Passive,
      rarity: Rarity.Common,
      traits: [],
      sources: [],
    };
  }

  return {
    category: entry.data.category,
    action: featActionKind(entry),
    rarity: entry.rarity,
    traits: traitChips(
      registry,
      entry.traits.map((trait) => Trait.parse(trait)),
    ),
    sources: entry.sources,
  };
}

/** What a feat option is worded from: the registry that names its traits, and the entries it reads. */
interface OptionReads {
  readonly registry: ContentRegistry;
  readonly nameOf: (id: ContentId) => string | undefined;
  readonly entryOf: (id: ContentId) => ContentEntry | undefined;
}

function optionOf(option: FeatOption, { registry, nameOf, entryOf }: OptionReads): SheetFeatOption {
  const prerequisites = option.prerequisites === undefined ? undefined : richTextWords(option.prerequisites, nameOf);

  const locked =
    option.locked === undefined
      ? undefined
      : { archetype: nameOf(option.locked.archetype) ?? '', needed: option.locked.needed };

  return {
    value: option.value,
    label: option.label,
    level: option.level,
    ...factsOf(registry, entryOf(option.value)),
    status: option.status,
    clauses: option.clauses,
    prerequisites,
    locked,
  };
}

/** "Fighter feat, level 2"; "Feat from Natural Ambition, level 1" for a slot without a prompt. */
function labelOf(slot: FeatSlot, nameOf: (id: ContentId) => string | undefined): MessageDescriptor {
  if (slot.prompt !== undefined) {
    return message('character.sheet.feats.slot', { prompt: slot.prompt, level: slot.level });
  }

  return message('character.sheet.feats.slotFrom', { entry: nameOf(slot.entry) ?? '', level: slot.level });
}

function slotRead(slots: ReadonlyArray<CharacterSlot>, key: SlotKey): CharacterSlot | undefined {
  return slots.find((slot) => slot.key === key);
}

/**
 * The sheet's feats (#466): each feat slot, lowest first, with the feats it offers at its level and whether the
 * character meets their prerequisites there (#492).
 */
export function sheetFeats(
  registry: ContentRegistry,
  character: Character,
  slots: ReadonlyArray<CharacterSlot>,
): SheetFeats {
  const content = sheetSlotContent(registry);
  const nameOf = (id: ContentId): string | undefined => content.lookup.entry(id)?.name;
  const entryOf = (id: ContentId): ContentEntry | undefined => sheetEntry(registry, id);
  const reads = featSlots(character.document, content);

  const slotOf = (slot: FeatSlot): SheetFeatSlot => {
    const read = slotRead(slots, slot.key);

    return {
      key: slot.key,
      label: labelOf(slot, nameOf),
      options: slot.options.map((option) => optionOf(option, { registry, nameOf, entryOf })),
      trainedAgain: sheetTrainedAgain(registry, character, slot.key),
      storedName: read !== undefined && 'selectionName' in read ? read.selectionName : undefined,
      reason: read?.status === SlotStatus.Invalid ? read.reason : undefined,
    };
  };

  return { planned: reads.map((slot) => slotOf(slot)) };
}

/** Why a feat can't be picked, or that its prerequisites can't be checked; undefined for a feat with nothing in the way. */
function unavailableReason(option: SheetFeatOption, translate: Translate): string | undefined {
  const prerequisites = option.prerequisites ?? '';

  if (option.locked !== undefined) {
    const { archetype, needed } = option.locked;

    return translate('character.sheet.feats.locked', { archetype, needed });
  }

  return option.status === PrerequisiteStatus.Unmet
    ? translate('character.sheet.feats.unmet', { prerequisites })
    : undefined;
}

/** What a feat picker words its rows with: its messages, and what each feat would train again. */
export interface FeatRowReads {
  readonly translate: Translate;
  readonly trainedAgain: TrainedAgain;
}

const PREREQUISITE_STATES: Readonly<Record<PrerequisiteStatus, PrerequisiteState>> = {
  [PrerequisiteStatus.Met]: PrerequisiteState.Met,
  [PrerequisiteStatus.Unmet]: PrerequisiteState.Unmet,
  [PrerequisiteStatus.Unknown]: PrerequisiteState.Unknown,
};

/**
 * The prerequisites as the cell shows them: a line for each clause of a feat with several, each in its own state;
 * otherwise the printed text once, in the state the engine read for the feat.
 */
function prerequisiteLines(option: SheetFeatOption): ReadonlyArray<PrerequisiteLine> {
  if (option.clauses !== undefined) {
    return option.clauses.map(({ text, status }) => ({ label: text, state: PREREQUISITE_STATES[status] }));
  }

  if (option.prerequisites === undefined || option.prerequisites === '') {
    return [];
  }

  return [{ label: option.prerequisites, state: PREREQUISITE_STATES[option.status] }];
}

/**
 * The rows of a feat picker: every feat the slot offers with the facts to choose by. One whose prerequisites are not
 * met, or that is a dedication still locked, can't be picked, and says why; one whose prerequisites can't be checked
 * can be, since unknown is never read as not met. One that would train a skill the character is trained in already
 * says so (#674) and stays pickable.
 *
 * `hidden` are the feats the filters leave out. They get no row and nothing is read for them: what a feat would train
 * again is the costly part (about a millisecond a feat), and the player's filters usually leave most feats out.
 */
export function featRows(
  options: ReadonlyArray<SheetFeatOption>,
  { translate, trainedAgain }: FeatRowReads,
  hidden: ReadonlySet<string> = new Set(),
): ReadonlyArray<FeatPickerRow> {
  const shown = options.filter((option) => !hidden.has(option.value));
  const marks = trainedAgain(shown.map((option) => option.value));

  return shown.map((option): FeatPickerRow => {
    const skills = marks.get(option.value);

    return {
      id: option.value,
      name: option.label,
      level: option.level,
      category: option.category,
      action: option.action,
      rarity: option.rarity,
      traits: option.traits,
      prerequisites: prerequisiteLines(option),
      sources: option.sources,
      disabledReason: unavailableReason(option, translate),
      note: skills === undefined ? undefined : trainedAgainNote(skills, translate),
    };
  });
}
