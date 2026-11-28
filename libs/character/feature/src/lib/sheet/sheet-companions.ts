import { SlotStatus, SlotSubjectKind } from '@pioneer/character/domain';
import type { CharacterSlot, Companion } from '@pioneer/character/domain';
import { companionProficiencyBonus, deriveCompanionStatistics } from '@pioneer/rules/engine';
import type { CompanionStatistics } from '@pioneer/rules/engine';
import { CompanionKind, ContentId, contentId, ContentKind, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type {
  CompanionStatBlock,
  CompanionTier,
  ContentRegistry,
  ContentText,
  Level,
  ProficiencyBonusTable,
  SlotKey,
} from '@pioneer/rules/sdk';

/** One species a character can take as an animal companion, as the content offers it. */
export interface SpeciesOption {
  readonly id: ContentId;
  readonly name: ContentText;
  readonly block: CompanionStatBlock;
}

/** The feats whose species choice grants an animal companion, by the pack that holds each and its slug. */
const GRANTING_FEATS: ReadonlyArray<readonly [string, string]> = [
  ['player-core', 'feat:animal-companion'],
  ['player-core', 'feat:animal-companion-ranger'],
  ['player-core-2', 'feat:beastmaster-dedication'],
  ['player-core-2', 'feat:additional-companion'],
  ['player-core-2', 'feat:cavalier-dedication'],
  ['advanced-players-guide', 'feat:beastmaster-dedication'],
  ['advanced-players-guide', 'feat:additional-companion'],
  ['advanced-players-guide', 'feat:cavalier-dedication'],
];

const GRANTING_FEAT_IDS: ReadonlySet<ContentId> = new Set(
  GRANTING_FEATS.map(([pack, slug]) => ContentId.parse(contentId(PackId.parse(pack), EntrySlug.parse(slug)))),
);

/** Every companion species the registry holds, by name. */
export function speciesOf(registry: ContentRegistry): ReadonlyArray<SpeciesOption> {
  return registry.packs
    .flatMap((pack) => pack.otherEntries)
    .flatMap((entry): ReadonlyArray<SpeciesOption> =>
      entry.kind === ContentKind.CompanionSpecies
        ? [{ id: ContentId.parse(entry.id), name: entry.name, block: entry.data.block }]
        : [],
    )
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

/** A species choice a feat grants, with the companion it holds, if any, and the species picked. */
export interface CompanionSlotView {
  readonly slot: SlotKey;
  /** The species picked in the slot; undefined while it is open. */
  readonly picked: SpeciesOption | undefined;
  /** The live companion this slot granted. */
  readonly companion: Companion | undefined;
}

/** Whether `slot` is the species choice of an animal companion feat: a choice of one of `GRANTING_FEAT_IDS`. */
function grantsCompanion(slot: CharacterSlot): boolean {
  return (
    'subject' in slot &&
    slot.subject.kind === SlotSubjectKind.Choice &&
    GRANTING_FEAT_IDS.has(ContentId.parse(slot.subject.entry))
  );
}

/** The species choices the character has, each with the live animal companion it granted. */
export function companionSlots(
  slots: ReadonlyArray<CharacterSlot>,
  species: ReadonlyArray<SpeciesOption>,
  companions: ReadonlyArray<Companion>,
): ReadonlyArray<CompanionSlotView> {
  return slots.flatMap((slot): ReadonlyArray<CompanionSlotView> => {
    if (!grantsCompanion(slot)) {
      return [];
    }

    const chosen = slot.status === SlotStatus.Filled ? slot.selection : undefined;

    return [
      {
        slot: slot.key,
        picked: species.find(({ id }) => id === chosen),
        companion: companions.find(
          (companion) =>
            companion.kind === CompanionKind.AnimalCompanion &&
            companion.archived === undefined &&
            companion.grantedBy === slot.key,
        ),
      },
    ];
  });
}

/** The species a companion is, when the content still holds it. */
export function speciesOfCompanion(
  companion: Companion,
  species: ReadonlyArray<SpeciesOption>,
): SpeciesOption | undefined {
  return companion.kind === CompanionKind.AnimalCompanion
    ? species.find(({ id }) => id === companion.form.species)
    : undefined;
}

/** What of the master decides a companion's statistics: its level and the tiers its feats give. */
export interface CompanionMaster {
  readonly level: Level;
  readonly tiers: ReadonlySet<CompanionTier>;
}

/** What a companion card shows of its statistics: the master's level and the content's proficiency table decide them. */
export function statisticsOfCompanion(
  species: SpeciesOption,
  master: CompanionMaster,
  table: ProficiencyBonusTable,
): CompanionStatistics {
  const { level, tiers } = master;

  return deriveCompanionStatistics({
    level,
    block: species.block,
    tiers,
    proficiencyBonus: companionProficiencyBonus(table, level),
  });
}
