import { ETCHED_DAMAGE, RuleInPlay } from '@pioneer/rules/engine';
import type { ContentLookup } from '@pioneer/rules/grants';
import {
  ContentKind,
  DamageAmount,
  DamageType,
  DieSize,
  Origin,
  RuleElement,
  RuleElementKey,
  RuleIndex,
  Slug,
  slugName,
  Trait,
} from '@pioneer/rules/sdk';

import { activeItems, inventoryHop } from './active-items';
import type { Inventory } from './inventory';
import type { ItemContent } from './inventory-content';
import { runeReader, workingEtchedRunes } from './item-runes';
import type { RuneEntry } from './item-runes';
import { RuneChoice } from './rune-etching';

const LESSER_RESISTANCE = DamageAmount.parse(5);
const GREATER_RESISTANCE = DamageAmount.parse(10);
const LESSER_WEAKNESS = DamageAmount.parse(5);
const GREATER_WEAKNESS = DamageAmount.parse(10);

/** The energies an energy-resistant rune is made for (GM Core). */
const RUNE_ENERGIES: readonly RuneChoice[] = [
  DamageType.Acid,
  DamageType.Cold,
  DamageType.Electricity,
  DamageType.Fire,
].map((energy) => RuneChoice.parse(energy));

/** The energies an energy vulnerability rune is made for (Impossible Magic): the four, and sonic. */
const VULNERABILITY_ENERGIES: readonly RuneChoice[] = [...RUNE_ENERGIES, RuneChoice.parse(DamageType.Sonic)];

/** The creature types a bane rune is made for (Impossible Magic): fungus and plant are one choice, for both traits. */
const BANE_CREATURE_TYPES: readonly RuneChoice[] = [
  'aberration',
  'animal',
  'beast',
  'celestial',
  'construct',
  'dragon',
  'elemental',
  'fey',
  'fiend',
  'fungus-plant',
  'giant',
  'monitor',
  'ooze',
].map((type) => RuneChoice.parse(type));

/** The creature traits a bane choice reaches: one, or both of fungus and plant. */
function baneTraits(choice: RuneChoice): readonly Trait[] {
  return choice === 'fungus-plant' ? [Trait.parse('fungus'), Trait.parse('plant')] : [Trait.parse(choice)];
}

/** The energies a conducting rune channels (Ancestry Guide): the four, and sonic, as for resonant weapons. */
const CONDUCTING_ENERGIES: readonly RuneChoice[] = VULNERABILITY_ENERGIES;

/**
 * Conducting: the weapon gains the resonant trait, deals 1d8 of the chosen energy, and 1d8 persistent damage of it on
 * a critical hit. The extra damage a weapon that already had resonant gains (1 per die) is not applied.
 */
function conductingElements(choice: RuneChoice): readonly object[] {
  const extra = { key: RuleElementKey.DamageDice, selectors: [ETCHED_DAMAGE], dieSize: DieSize.D8, damageType: choice };
  return [
    { key: RuleElementKey.AdjustStrike, property: 'traits', mode: 'add', value: 'resonant', etched: true },
    { ...extra, diceNumber: 1 },
    { ...extra, diceNumber: 1, category: 'persistent', critical: true },
  ];
}

/** The most elements one chosen rune gives, so each element has its own rule index within its etching. */
const CHOSEN_ELEMENTS_MAX = 4;

/** A rune whose rules depend on what its crafter chose: what it can be made for, and the rule one choice gives. */
interface ChosenRune {
  readonly choices: readonly RuneChoice[];
  /** The elements for `choice`, which the rule schema then checks. */
  readonly elements: (choice: RuneChoice) => readonly object[];
  /** Whether an item can have only one such rune for each choice, as energy-resistant runes must resist different types. */
  readonly distinct: boolean;
}

function resistance(value: DamageAmount): ChosenRune {
  return {
    choices: RUNE_ENERGIES,
    elements: (choice) => [{ key: RuleElementKey.Resistance, type: [choice], value }],
    distinct: true,
  };
}

function vulnerability(value: DamageAmount): ChosenRune {
  return {
    choices: VULNERABILITY_ENERGIES,
    elements: (choice) => [
      {
        key: RuleElementKey.CriticalWeakness,
        selectors: [ETCHED_DAMAGE],
        type: choice,
        value,
      },
    ],
    distinct: false,
  };
}

/** The runes made for a choice, by their entry slug: energy-resistant (GM Core), and bane and energy vulnerability (Impossible Magic). */
const CHOSEN_RUNES: ReadonlyMap<Slug, ChosenRune> = new Map([
  [Slug.parse('energy-resistant'), resistance(LESSER_RESISTANCE)],
  [Slug.parse('energy-resistant-greater'), resistance(GREATER_RESISTANCE)],
  [Slug.parse('energy-vulnerability'), vulnerability(LESSER_WEAKNESS)],
  [Slug.parse('energy-vulnerability-greater'), vulnerability(GREATER_WEAKNESS)],
  [
    Slug.parse('bane'),
    {
      choices: BANE_CREATURE_TYPES,
      elements: (choice) => [
        {
          key: RuleElementKey.DamageDice,
          selectors: [ETCHED_DAMAGE],
          diceNumber: 1,
          dieSize: DieSize.D6,
          predicate: [{ or: baneTraits(choice).map((trait) => `target:trait:${trait}`) }],
        },
      ],
      distinct: false,
    },
  ],
  [
    Slug.parse('conducting'),
    {
      choices: CONDUCTING_ENERGIES,
      elements: conductingElements,
      distinct: false,
    },
  ],
]);

/**
 * The rules the runes made for a choice give, etched onto the character's active items: one per rune, from what its
 * crafter chose (resistance to a damage type, extra damage against a creature type). A rune etched with no choice, or
 * one naming nothing it is made for, gives none. The choice is the etching's own, so these are made here rather than
 * written in the rune's `rules`, which are the same for every etching.
 */
export function chosenRuneRules(inventory: Inventory, content: ItemContent, lookup: ContentLookup): RuleInPlay[] {
  return activeItems(inventory, content).flatMap((active) =>
    workingEtchedRunes(active.item, active.entry, runeReader(lookup)).flatMap(({ rune, choice }, etching) => {
      const entry = lookup.entry(rune);
      const made = entry?.kind === ContentKind.Rune ? CHOSEN_RUNES.get(entry.slug) : undefined;
      if (entry === undefined || made === undefined || choice === undefined || !made.choices.includes(choice)) {
        return [];
      }
      return made.elements(choice).flatMap((raw, position) => {
        const element = RuleElement.safeParse(raw);
        return element.success
          ? [
              RuleInPlay.parse({
                element: element.data,
                origin: Origin.parse({ hops: [inventoryHop(active)], entry: entry.id, sources: entry.sources }),
                rule: RuleIndex.parse(etching * CHOSEN_ELEMENTS_MAX + position),
                itemLevel: content.get(active.item.item)?.level,
              }),
            ]
          : [];
      });
    }),
  );
}

/** Whether an item can have only one `rune` for each choice: energy-resistant runes must each resist another type. */
export function choiceIsDistinct(rune: RuneEntry): boolean {
  return CHOSEN_RUNES.get(slugName(rune.slug))?.distinct === true;
}

/** The choices `rune` asks its crafter for when it is etched: the four energies, or the creature types a bane rune takes. */
export function runeChoices(rune: RuneEntry): readonly RuneChoice[] {
  return (CHOSEN_RUNES.get(slugName(rune.slug))?.choices ?? []).map((choice) => RuneChoice.parse(choice));
}
