import { characterGrants, featSlots, PrerequisiteStatus, SlotStatus } from '@pioneer/character/domain';
import type { Character, CharacterSlot, FeatOption, FeatSlot } from '@pioneer/character/domain';
import type { ComboboxOption } from '@pioneer/frontier/data';
import { BlockKind, ContentKind, InlineKind, OriginHopKind } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry, InlineNode, RichText, SlotKey } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { CHARACTER_CONTENT_KINDS } from '../data/content-registry-query';
import { sheetSlotContent } from './sheet-slot-content';

/** The kinds the feat pickers read: the character's, so its entries resolve, and the feats. */
export const FEAT_CONTENT_KINDS: readonly ContentKind[] = [...CHARACTER_CONTENT_KINDS, ContentKind.Feat];

/** The most feats a feat picker lists for one query; typing narrows it. */
const FEAT_MATCHES_MAX = 50;

/** One feat slot on the sheet: its label, the feats it offers, and why its pick counts for nothing. */
export interface SheetFeatSlot {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly options: readonly SheetFeatOption[];
  /** The stored pick's name, so a pick the slot no longer offers still reads by name. */
  readonly storedName: string | undefined;
  /** The server's reason when the slot's pick is invalid. */
  readonly reason: MessageDescriptor | undefined;
}

/** A feat a slot offers, as its picker shows it: unmet prerequisites shown but not picked, saying what they are. */
export interface SheetFeatOption {
  readonly value: string;
  readonly label: string;
  readonly status: PrerequisiteStatus;
  /** What the prerequisites are, as printed; none for a feat without any. */
  readonly prerequisites: string | undefined;
}

/** A feat the character has from a feature rather than a slot: Shield Block from a warpriest's First Doctrine. */
export interface SheetGrantedFeat {
  readonly id: ContentId;
  readonly name: string;
  readonly from: string;
}

/** The feats section: the slots up to the character's level and the feats its features grant. */
export interface SheetFeats {
  readonly slots: readonly SheetFeatSlot[];
  readonly granted: readonly SheetGrantedFeat[];
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

function optionOf(option: FeatOption, nameOf: (id: ContentId) => string | undefined): SheetFeatOption {
  const prerequisites = option.prerequisites === undefined ? undefined : plainText(option.prerequisites, nameOf);
  return { value: option.value, label: option.label, status: option.status, prerequisites };
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

/** Each feat the effective set has whose last hop is a grant, not a pick: a feature gave it. */
function grantedFeats(registry: ContentRegistry, character: Character): SheetGrantedFeat[] {
  const content = sheetSlotContent(registry);
  const nameOf = (id: ContentId): string | undefined => content.lookup.entry(id)?.name;
  return characterGrants(character.document, content).items.flatMap(({ entry, origin }): SheetGrantedFeat[] => {
    const hop = origin.hops.at(-1);
    if (entry.kind !== ContentKind.Feat || hop?.kind !== OriginHopKind.Grant) {
      return [];
    }
    return [{ id: entry.id, name: entry.name, from: nameOf(hop.by) ?? '' }];
  });
}

/**
 * The sheet's feats (#466): each feat slot up to the character's level, lowest first, with the feats it offers at its
 * level and whether the character meets their prerequisites there, and the feats its features grant.
 */
export function sheetFeats(
  registry: ContentRegistry,
  character: Character,
  slots: readonly CharacterSlot[],
): SheetFeats {
  const content = sheetSlotContent(registry);
  const nameOf = (id: ContentId): string | undefined => content.lookup.entry(id)?.name;
  const reads = featSlots(character.document, content).filter((slot) => slot.level <= character.document.level);
  return {
    slots: reads.map((slot) => {
      const read = slotRead(slots, slot.key);
      return {
        key: slot.key,
        label: labelOf(slot, nameOf),
        options: slot.options.map((option) => optionOf(option, nameOf)),
        storedName: read !== undefined && 'selectionName' in read ? read.selectionName : undefined,
        reason: read?.status === SlotStatus.Invalid ? read.reason : undefined,
      };
    }),
    granted: grantedFeats(registry, character),
  };
}

/** What a feat option says under its name, for one whose prerequisites are not met or can't be checked. */
function descriptionOf(
  option: SheetFeatOption,
  translate: (key: string, params: object) => string,
): string | undefined {
  const prerequisites = option.prerequisites ?? '';
  if (option.status === PrerequisiteStatus.Unmet) {
    return translate('character.sheet.feats.unmet', { prerequisites });
  }
  return option.status === PrerequisiteStatus.Unknown
    ? translate('character.sheet.feats.unknown', { prerequisites })
    : undefined;
}

/**
 * `options` whose name holds `query`, ignoring case, up to the most a picker lists, as combobox options: one whose
 * prerequisites are not met is shown but can't be picked, saying what they are; one whose prerequisites can't be
 * checked says so too, and can be picked, since unknown is never read as not met.
 */
export function featMatches(
  options: readonly SheetFeatOption[],
  query: string,
  translate: (key: string, params: object) => string,
): readonly ComboboxOption<string>[] {
  const needle = query.trim().toLocaleLowerCase();
  return options
    .filter((option) => option.label.toLocaleLowerCase().includes(needle))
    .slice(0, FEAT_MATCHES_MAX)
    .map((option): ComboboxOption<string> => {
      const { value, label } = option;
      const description = descriptionOf(option, translate);
      const disabled = option.status === PrerequisiteStatus.Unmet;
      return description === undefined ? { value, label } : { value, label, description, disabled };
    });
}
