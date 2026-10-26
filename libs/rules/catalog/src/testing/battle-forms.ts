import {
  deriveDefences,
  deriveStatistics,
  deriveStrikes,
  RuleInPlay,
  sensesInPlay,
  StatisticInputsJson,
  vitalsInPlay,
} from '@pioneer/rules/engine';
import type { Defences, SenseInPlay, StatisticInputs, Strike } from '@pioneer/rules/engine';
import { wielded } from '@pioneer/rules/engine/testing';
import { PredicateFacts } from '@pioneer/rules/predicate';
import {
  contentId,
  contentPackFromContents,
  EntrySlug,
  Level,
  PackId,
  RollOption,
  RuleElementKey,
  Selector,
  Size,
} from '@pioneer/rules/sdk';

import { playerCorePack } from '../json-packs';
import { core } from './core-rules';
import { coreNamespaces } from './fighter';

/** What the battle form spells' own text states, derived for the druid in one form. */
export interface FormView {
  /** The total of a statistic. */
  readonly total: (selector: string) => number;
  readonly strikes: readonly Strike[];
  readonly senses: readonly SenseInPlay[];
  readonly defences: Defences;
  /** The size the druid has in the form; undefined when no form changes it. */
  readonly size: Size | undefined;
  readonly temporaryHitPoints: number;
}

const PLAYER_CORE_EFFECTS = contentPackFromContents(await playerCorePack()).otherEntries;

const UNARMED = {
  slug: 'fist',
  category: 'unarmed',
  traits: ['agile', 'finesse', 'nonlethal'],
  damage: { dice: 1, die: 'd4', damageType: 'bludgeoning' },
};

/**
 * A level 10 druid: Strength +2, Dexterity +0, trained in unarmed attacks and untrained in Athletics, in hide armor
 * (+3 AC, check penalty 2, a worn item's origin). Out of form her Armor Class is 10 + 10 + 2 + 3 = 25 (trained), and
 * her unarmed attack +14.
 */
export function druidWith(strength: number): StatisticInputs {
  return StatisticInputsJson.parse({
    level: 10,
    attributes: { str: strength, dex: 0, con: 0, int: 0, wis: 4, cha: 0 },
    ranks: { ac: 'trained', 'attack:unarmed': 'trained' },
    ancestry: { hitPoints: 8, speed: 25 },
    class: { hitPoints: 8, keyAttribute: 'wis' },
    armor: {
      bonus: 3,
      checkPenalty: 2,
      origin: {
        hops: [{ kind: 'inventory', item: '44444444-4444-4444-8444-444444444444', state: 'worn' }],
        entry: contentId(PackId.parse('player-core'), EntrySlug.parse('armor:hide-armor')),
        sources: [{ kind: 'book', book: 'player-core', page: 1 }],
      },
    },
    weapons: [wielded(UNARMED)],
  });
}

const druid: StatisticInputs = druidWith(2);

/** The `BattleForm` rules of the Player Core effect `slug`, in play at spell rank `rank`. */
export function formRulesOf(slug: string, rank: number): readonly RuleInPlay[] {
  const entry = PLAYER_CORE_EFFECTS.find((each) => each.slug === slug);
  if (entry === undefined) {
    throw new Error(`${slug} is not in the player-core effects`);
  }
  return entry.rules.flatMap((element, rule) =>
    element.key === RuleElementKey.BattleForm
      ? [
          RuleInPlay.parse({
            element,
            origin: { hops: [], entry: entry.id, sources: entry.sources },
            rule,
            itemLevel: Level.parse(rank),
          }),
        ]
      : [],
  );
}

/** The roll options a spell's choice sets: `plant-form:arboreal`. */
export function chosen(...options: readonly string[]): PredicateFacts {
  return new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    coreNamespaces(),
  );
}

/** The druid with `rules` in play. */
export function viewOf(
  rules: readonly RuleInPlay[],
  facts: PredicateFacts,
  character: StatisticInputs = druid,
): FormView {
  const modifiers = { rules, facts };
  const results = deriveStatistics(core, character, modifiers);
  const vitals = vitalsInPlay(modifiers, { statistics: core, character, size: Size.Medium });
  return {
    total: (selector) => {
      const result = results.get(Selector.parse(selector));
      if (result === undefined || !result.ok) {
        throw new Error(`expected ${selector} to have a value`);
      }
      return Number(result.total);
    },
    strikes: deriveStrikes(character.weapons ?? [], results, {
      inputs: modifiers,
      scope: { statistics: core, character },
    }),
    senses: sensesInPlay(modifiers),
    defences: deriveDefences(core, character, modifiers),
    size: vitals.size?.size,
    temporaryHitPoints: Number(vitals.temporaryHitPoints?.amount ?? 0),
  };
}

/** Every rule of the Player Core effect `slug`, in play at spell rank `rank`: a form that is no battle form has no `BattleForm`. */
export function effectRulesOf(slug: string, rank: number): readonly RuleInPlay[] {
  const entry = PLAYER_CORE_EFFECTS.find((each) => each.slug === slug);
  if (entry === undefined) {
    throw new Error(`${slug} is not in the player-core effects`);
  }
  return entry.rules.map((element, rule) =>
    RuleInPlay.parse({
      element,
      origin: { hops: [], entry: entry.id, sources: entry.sources },
      rule,
      itemLevel: Level.parse(rank),
    }),
  );
}
