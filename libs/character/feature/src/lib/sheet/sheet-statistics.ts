import { characterStatistics, characterVitals, withPlay } from '@pioneer/character/domain';
import type { ActiveEffect, Character } from '@pioneer/character/domain';
import type { StatisticResult, VitalsInPlay } from '@pioneer/rules/engine';
import { HitPoints, Selector } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import type { NamedStatistic } from '@pioneer/rules/ui';

import { withoutForms } from './sheet-effects';
import { sheetSources } from './sheet-sources';

/** The sheet's statistics, in order: Armor Class, the three saves, Perception, the class DC, then the land Speed. */
export const SHEET_STATISTICS: readonly Selector[] = [
  'ac',
  'save:fortitude',
  'save:reflex',
  'save:will',
  'perception',
  'class-dc',
  'speed:land',
].map((selector) => Selector.parse(selector));

/** The speeds beside the land Speed, which always shows; each of these only once something gives the character one. */
const OTHER_SPEEDS: readonly Selector[] = ['speed:fly', 'speed:swim', 'speed:climb', 'speed:burrow'].map((selector) =>
  Selector.parse(selector),
);

/** Everything the engine derives for a character, by statistic or instance selector. */
export type SheetDerivation = ReadonlyMap<Selector, StatisticResult>;

/** Derivations already made, by registry and character: the statistics, Strikes and spellcasting each read them. */
const DERIVED = new WeakMap<ContentRegistry, WeakMap<Character, SheetDerivation>>();

/**
 * Every statistic the engine derives for a character, with the rule elements of the items it wears, holds or has
 * invested in play when the registry holds the item kinds. Derived once per registry and character; empty without a
 * proficiency bonus table, as nothing can be derived.
 */
export function sheetDerivation(registry: ContentRegistry, character: Character): SheetDerivation {
  const byCharacter = DERIVED.get(registry) ?? new WeakMap<Character, SheetDerivation>();
  DERIVED.set(registry, byCharacter);
  const derived = byCharacter.get(character) ?? derive(registry, character);
  byCharacter.set(character, derived);
  return derived;
}

function derive(registry: ContentRegistry, character: Character): SheetDerivation {
  return characterStatistics(character.document, sheetSources(registry, character));
}

/**
 * A character's AC, saves, Perception, class DC and land Speed from the engine (`sheetDerivation`), then the fly, swim, climb and burrow
 * Speeds a rule gives them, each named by the statistic that applies: the last pack's definition of its selector, as
 * the engine chooses. A statistic no registered pack defines is left out, and so is a Speed that is not above 0.
 */
export function sheetStatistics(registry: ContentRegistry, character: Character): readonly NamedStatistic[] {
  const results = sheetDerivation(registry, character);
  return [...SHEET_STATISTICS, ...OTHER_SPEEDS].flatMap((selector): NamedStatistic[] => {
    const result = results.get(selector);
    const entry = registry.statisticsFor(selector).at(-1);
    if (result === undefined || entry === undefined || (OTHER_SPEEDS.includes(selector) && !hasSpeed(result))) {
      return [];
    }
    return [{ name: entry.definition.name, kind: entry.definition.kind, result }];
  });
}

/**
 * The named statistics for `selectors` as the engine derives them for a character, by selector: those the registry names
 * and the engine has a result for.
 */
export function namedStatistics(
  registry: ContentRegistry,
  character: Character,
  selectors: readonly Selector[],
): ReadonlyMap<Selector, NamedStatistic> {
  const results = sheetDerivation(registry, character);
  return new Map(
    selectors.flatMap((selector): [Selector, NamedStatistic][] => {
      const result = results.get(selector);
      const entry = registry.statisticsFor(selector).at(-1);
      return result === undefined || entry === undefined
        ? []
        : [[selector, { name: entry.definition.name, kind: entry.definition.kind, result }]];
    }),
  );
}

/**
 * The fast healing, temporary Hit Points and size the character's rule elements give, from the engine (`vitalsInPlay`);
 * undefined until the character has an ancestry.
 */
export function sheetVitalsInPlay(registry: ContentRegistry, character: Character): VitalsInPlay | undefined {
  return characterVitals(sheetSources(registry, character), character.document);
}

/**
 * The temporary Hit Points `candidate`, a polymorph effect, would give the character: what its form sets, worked out by
 * the engine with the effect on the character in place of any form it has, and none when the effect is not what the character would get them from.
 */
export function sheetFormTempHp(
  registry: ContentRegistry,
  character: Character,
  candidate: ActiveEffect,
): HitPoints | undefined {
  const effects = [...withoutForms(registry, character.document.play.effects), candidate];
  const vitals = sheetVitalsInPlay(registry, withPlay(character, { ...character.document.play, effects }));
  const temp = vitals?.temporaryHitPoints;
  const fromEffect = temp?.origins.some(({ entry }) => entry === candidate.effect) === true;
  return temp === undefined || !fromEffect ? undefined : HitPoints.parse(temp.amount);
}

/** Whether a derived Speed is above 0: the character moves that way. */
function hasSpeed(result: StatisticResult): boolean {
  return result.ok && result.total > 0;
}
