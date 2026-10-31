import { featSlots, PrerequisiteStatus, SlotStatus } from '@pioneer/character/domain';
import type {
  Character,
  CharacterSlot,
  FeatOption,
  FeatSlot,
  PrerequisiteClauseStatus,
} from '@pioneer/character/domain';
import { BlockKind, ContentKind, FeatCategory, InlineKind, Rarity } from '@pioneer/rules/sdk';
import type {
  ContentEntry,
  ContentId,
  ContentRegistry,
  InlineNode,
  RichText,
  SlotKey,
  SourceRef,
} from '@pioneer/rules/sdk';
import { ActionKind, PrerequisiteState } from '@pioneer/rules/ui';
import type { FeatPickerRow, PrerequisiteLine } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { CHARACTER_CONTENT_KINDS } from '../data/content-registry-query';
import { sheetEntry } from './sheet-entry-previews';
import { sheetFeatGroups } from './sheet-feat-groups';
import type { SheetFeatGroup } from './sheet-feat-groups';
import { sheetTrainedAgain, trainedAgainNote } from './sheet-skill-repeats';
import type { TrainedAgain, Translate } from './sheet-skill-repeats';
import { sheetSlotContent } from './sheet-slot-content';

/** The kinds the feat pickers read: the character's, so its entries resolve, the feats and their archetypes. */
export const FEAT_CONTENT_KINDS: readonly ContentKind[] = [
  ...CHARACTER_CONTENT_KINDS,
  ContentKind.Feat,
  ContentKind.Archetype,
];

/** One feat slot on the sheet: its label, the feats it offers, and why its pick counts for nothing. */
export interface SheetFeatSlot {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly options: readonly SheetFeatOption[];
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
  readonly traits: readonly string[];
  readonly sources: readonly SourceRef[];
  readonly status: PrerequisiteStatus;
  /** Each clause of the prerequisites with its own state, for a feat with several; undefined for any other. */
  readonly clauses: readonly PrerequisiteClauseStatus[] | undefined;
  /** What the prerequisites are, as printed; none for a feat without any. */
  readonly prerequisites: string | undefined;
  readonly locked: SheetFeatLock | undefined;
}

/** The feats section: the slots up to the character's level, those above it, and the feats it has, by slot type. */
export interface SheetFeats {
  readonly slots: readonly SheetFeatSlot[];
  /** The slots above the character's level, lowest first, with the feats each offers once the character is there (#492). */
  readonly planned: readonly SheetFeatSlot[];
  readonly groups: readonly SheetFeatGroup[];
}

/** The words of rich text: its text, and each reference by its label or the name of the entry it names. */
function plainText(text: RichText, nameOf: (id: ContentId) => string | undefined): string {
  const inline = (node: InlineNode): string => {
    if (node.type === InlineKind.Text) {
      return node.text;
    }
    return node.type === InlineKind.Ref ? (node.label ?? nameOf(node.id) ?? '') : '';
  };
  return text
    .map((block) => (block.type === BlockKind.Paragraph ? block.content.map((node) => inline(node)).join('') : ''))
    .join(' ')
    .trim();
}

/** What a feat entry says that the domain's option does not: how it is taken and used, and where it is printed. */
interface FeatFacts {
  readonly category: FeatCategory;
  readonly action: ActionKind;
  readonly rarity: Rarity;
  readonly traits: readonly string[];
  readonly sources: readonly SourceRef[];
}

/** A feat's cost: its action glyph, a variable one, or none for a passive feat. */
function actionKindOf(entry: ContentEntry & { readonly kind: typeof ContentKind.Feat }): ActionKind {
  const { cost, upTo } = entry.data.action ?? {};
  if (cost === undefined) {
    return ActionKind.Passive;
  }
  return upTo === undefined ? cost : ActionKind.Variable;
}

function factsOf(entry: ContentEntry | undefined): FeatFacts {
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
    action: actionKindOf(entry),
    rarity: entry.rarity,
    traits: entry.traits,
    sources: entry.sources,
  };
}

function optionOf(
  option: FeatOption,
  nameOf: (id: ContentId) => string | undefined,
  entryOf: (id: ContentId) => ContentEntry | undefined,
): SheetFeatOption {
  const prerequisites = option.prerequisites === undefined ? undefined : plainText(option.prerequisites, nameOf);
  const locked =
    option.locked === undefined
      ? undefined
      : { archetype: nameOf(option.locked.archetype) ?? '', needed: option.locked.needed };
  return {
    value: option.value,
    label: option.label,
    level: option.level,
    ...factsOf(entryOf(option.value)),
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

function slotRead(slots: readonly CharacterSlot[], key: SlotKey): CharacterSlot | undefined {
  return slots.find((slot) => slot.key === key);
}

/**
 * The sheet's feats (#466): each feat slot up to the character's level, lowest first, with the feats it offers at its
 * level and whether the character meets their prerequisites there, and the feats the character has by slot type (#487).
 * Slots above the level are the plan (#492), read the same way at the level they open.
 */
export function sheetFeats(
  registry: ContentRegistry,
  character: Character,
  slots: readonly CharacterSlot[],
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
      options: slot.options.map((option) => optionOf(option, nameOf, entryOf)),
      trainedAgain: sheetTrainedAgain(registry, character, slot.key),
      storedName: read !== undefined && 'selectionName' in read ? read.selectionName : undefined,
      reason: read?.status === SlotStatus.Invalid ? read.reason : undefined,
    };
  };
  return {
    slots: reads.filter((slot) => slot.level <= character.document.level).map((slot) => slotOf(slot)),
    planned: reads.filter((slot) => slot.level > character.document.level).map((slot) => slotOf(slot)),
    groups: sheetFeatGroups(registry, character),
  };
}

/** Why a feat can't be picked, or that its prerequisites can't be checked; undefined for a feat with nothing in the way. */
function unavailableReason(option: SheetFeatOption, translate: Translate): string | undefined {
  const prerequisites = option.prerequisites ?? '';
  if (option.locked !== undefined) {
    return translate('character.sheet.feats.locked', option.locked);
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
function prerequisiteLines(option: SheetFeatOption): readonly PrerequisiteLine[] {
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
 */
export function featRows(
  options: readonly SheetFeatOption[],
  { translate, trainedAgain }: FeatRowReads,
): readonly FeatPickerRow[] {
  const marks = trainedAgain(options.map((option) => option.value));
  return options.map((option): FeatPickerRow => {
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
