import { characterGrants, characterSpellcasting, companionPlay, CompanionStatus } from '@pioneer/character/domain';
import type { Character, Companion, CompanionPlay, CompanionsPlay } from '@pioneer/character/domain';
import { FamiliarSense } from '@pioneer/rules/engine';
import type { FamiliarInputs, FamiliarStatistics, StatisticResult } from '@pioneer/rules/engine';
import { CompanionKind, CompanionMovement, EntrySlug, Level, Modifier, Selector, Trait } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { FamiliarCardMovement, FamiliarCardSense, FamiliarCardStatus } from '@pioneer/rules/ui';
import type { FamiliarCardHitPoints, FamiliarCardSpeed, FamiliarCardView } from '@pioneer/rules/ui';

import { sheetAttributes } from './sheet-attributes';
import type { Translate } from './sheet-companion-facts';
import { sheetSlotContent } from './sheet-slot-content';
import { sheetDerivation } from './sheet-statistics';

const AC = Selector.parse('ac');
const FORTITUDE = Selector.parse('save:fortitude');
const REFLEX = Selector.parse('save:reflex');
const WILL = Selector.parse('save:will');

/** A familiar is a tiny minion (Player Core pg. 212). */
const FAMILIAR_TRAITS: ReadonlyArray<Trait> = [Trait.parse('minion'), Trait.parse('tiny')];

/** The words the card names its skills with. */
const SkillMessage = {
  Acrobatics: 'rules.facet.skill.acrobatics',
  Stealth: 'rules.facet.skill.stealth',
  Other: 'rules.familiar.otherSkills',
} as const;

/** The live familiar the character has: at most one (ADR-0079). */
export function liveFamiliar(companions: ReadonlyArray<Companion>): Companion | undefined {
  return companions.find((companion) => companion.kind === CompanionKind.Familiar && companion.archived === undefined);
}

/** The total the engine derived for `selector`, when it derived a value. */
function totalOf(results: ReadonlyMap<Selector, StatisticResult>, selector: Selector): Modifier | undefined {
  const result = results.get(selector);

  return result?.ok === true ? Modifier.parse(result.total) : undefined;
}

/**
 * What the character's own sheet hands a familiar: its level, AC and saves from the engine, and the spellcasting
 * attribute modifier of its best entry. Undefined while the master's AC or saves are not derived (no core rules pack).
 * No abilities are chosen yet, so none change a statistic.
 */
export function familiarInputs(registry: ContentRegistry, character: Character): FamiliarInputs | undefined {
  const results = sheetDerivation(registry, character);
  const armorClass = totalOf(results, AC);
  const fortitude = totalOf(results, FORTITUDE);
  const reflex = totalOf(results, REFLEX);
  const will = totalOf(results, WILL);

  if (armorClass === undefined || fortitude === undefined || reflex === undefined || will === undefined) {
    return undefined;
  }

  const { modifiers } = sheetAttributes(registry, character);
  const entries = characterSpellcasting(characterGrants(character.document, sheetSlotContent(registry)));
  const attributes = entries.map(({ attribute }) => modifiers.get(attribute));

  return {
    level: Level.parse(character.level),
    armorClass,
    saves: { fortitude, reflex, will },
    spellcasting: attributes.length === 0 ? undefined : Modifier.parse(Math.max(...attributes)),
    abilities: new Set(),
    skilled: new Set(),
    aquatic: false,
  };
}

const STATUSES: Readonly<Record<CompanionStatus, FamiliarCardStatus>> = {
  [CompanionStatus.Active]: FamiliarCardStatus.Active,
  [CompanionStatus.Absent]: FamiliarCardStatus.Absent,
  [CompanionStatus.Absorbed]: FamiliarCardStatus.Absorbed,
  [CompanionStatus.Dead]: FamiliarCardStatus.Dead,
};

const SENSES: Readonly<Record<FamiliarSense, FamiliarCardSense>> = {
  [FamiliarSense.LowLightVision]: FamiliarCardSense.LowLightVision,
  [FamiliarSense.Darkvision]: FamiliarCardSense.Darkvision,
  [FamiliarSense.Echolocation]: FamiliarCardSense.Echolocation,
  [FamiliarSense.Scent]: FamiliarCardSense.Scent,
};

/** The other Speeds in the order the card lists them. */
const MOVEMENTS: ReadonlyArray<readonly [CompanionMovement, FamiliarCardMovement]> = [
  [CompanionMovement.Burrow, FamiliarCardMovement.Burrow],
  [CompanionMovement.Climb, FamiliarCardMovement.Climb],
  [CompanionMovement.Fly, FamiliarCardMovement.Fly],
  [CompanionMovement.Swim, FamiliarCardMovement.Swim],
];

function speedsOf(statistics: FamiliarStatistics): ReadonlyArray<FamiliarCardSpeed> {
  const land: ReadonlyArray<FamiliarCardSpeed> =
    statistics.speed === undefined ? [] : [{ movement: FamiliarCardMovement.Land, feet: statistics.speed }];

  const others = MOVEMENTS.flatMap(([movement, shown]): ReadonlyArray<FamiliarCardSpeed> => {
    const feet = statistics.movement[movement];

    return feet === undefined ? [] : [{ movement: shown, feet }];
  });

  return [...land, ...others];
}

/** What the card is built from: the familiar, its derived statistics, the companions' play state and the words. */
export interface FamiliarCardSource {
  readonly companion: Companion;
  readonly statistics: FamiliarStatistics;
  readonly play: CompanionsPlay;
  readonly translate: Translate;
}

/** The Hit Points the familiar has left of the most its master's level gives it, and its temporary ones. */
function hitPointsOf(statistics: FamiliarStatistics, entry: CompanionPlay): FamiliarCardHitPoints {
  const max = statistics.hitPoints.total;

  return { current: Math.max(0, max - entry.damage), max, temp: entry.temp };
}

const COMMAND_AN_ANIMAL = EntrySlug.parse('action:command-an-animal');

/** The Command an Animal action of the content, which a master spends an action on to give its familiar 2 actions; undefined when the content lacks it. */
export function commandActionId(registry: ContentRegistry): ContentId | undefined {
  return registry.packs.flatMap((pack) => pack.otherEntries).find((entry) => entry.slug === COMMAND_AN_ANIMAL)?.id;
}

/**
 * What the card shows of the character's familiar: the engine's statistics for its master, its status and damage in
 * play, and its name. Its species is not yet chosen on the form, so the card names it as a familiar.
 */
export function familiarCardView({ companion, statistics, play, translate }: FamiliarCardSource): FamiliarCardView {
  const entry = companionPlay(play, companion.id);

  return {
    name: companion.name,
    species: translate('rules.familiar.species'),
    status: STATUSES[entry.status],
    hitPoints: hitPointsOf(statistics, entry),
    armorClass: statistics.armorClass.total,
    saves: { fortitude: statistics.fortitude.total, reflex: statistics.reflex.total, will: statistics.will.total },
    perception: statistics.perception.total,
    skills: [
      { name: translate(SkillMessage.Acrobatics), modifier: statistics.acrobatics.total },
      { name: translate(SkillMessage.Stealth), modifier: statistics.stealth.total },
      { name: translate(SkillMessage.Other), modifier: statistics.otherSkills.total },
    ],
    speeds: speedsOf(statistics),
    senses: statistics.senses.map((sense) => SENSES[sense]),
    traits: FAMILIAR_TRAITS,
  };
}
