import {
  deriveStatistics,
  LineStatusKind,
  NO_SITUATION,
  rollSituation,
  statisticContent,
  variantRulesInPlay,
  vitalsInPlay,
} from '@pioneer/rules/engine';
import type {
  BreakdownLine,
  RuleId,
  StatisticContent,
  StatisticInputs,
  StatisticResult,
  StatisticValue,
  StrikeRulesInput,
  VitalsInPlay,
} from '@pioneer/rules/engine';
import type { ToggleSlot } from '@pioneer/rules/grants';
import { predicateOptions } from '@pioneer/rules/predicate';
import { AncestryId, HitPoints, Selector } from '@pioneer/rules/sdk';
import type { ContentRegistry, Predicate, RollOption, VariantRuleEntry } from '@pioneer/rules/sdk';

import { attributeModifiers } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { overrideRules } from './character-override';
import { ANCESTRY_SLOT } from './character-slots';
import { buildRanks, characterGrants, classContent, classInputs } from './class-build';
import { customEffectRules } from './custom-effect';
import { buildRules, equippedInputs, equippedRules } from './equipped';
import type { EquippedRules } from './equipped';
import { favoredWeapons } from './favored-weapons';
import { grantedStrikes } from './granted-strikes';
import { contentRolledAs } from './initiative-roll';
import type { RollAs } from './initiative-roll';
import { itemContent } from './inventory-content';
import type { SlotContent } from './slot-offer';
import { characterSpellcasting } from './spellcasting-build';

/** The statistic the engine derives a character's maximum Hit Points as. */
export const MAX_HP_SELECTOR = Selector.parse('hp:max');

/** What the ancestry gives: `@ancestry.hp` and `@ancestry.speed`. Nothing while it is unpicked or not loaded. */
function ancestryInputs(registry: ContentRegistry, document: CharacterDocument): Pick<StatisticInputs, 'ancestry'> {
  const picked = AncestryId.safeParse(document.build.choices[ANCESTRY_SLOT]);
  const ancestry = picked.success ? registry.ancestry(picked.data) : undefined;
  if (ancestry === undefined) {
    return {};
  }
  const { hitPoints, speed } = ancestry.definition;
  return { ancestry: { hitPoints, speed } };
}

/** What the class gives: `@class.hp` and the key attribute. Nothing until the class and its key attribute are known. */
function classInputsOf(
  registry: ContentRegistry,
  document: CharacterDocument,
  slots: SlotContent,
): Pick<StatisticInputs, 'class'> {
  const inputs = classInputs(document, slots, classContent(registry));
  return inputs === undefined ? {} : { class: inputs };
}

/**
 * What the engine reads of a character so far: level, the modifiers its boosts give, the ranks its class, background,
 * features and skill picks raise, what its ancestry and class give, the spellcasting entries its spell attacks and DCs
 * are derived for, its worn armour and held weapons when the registry holds the item kinds, and the Strikes its features
 * give (a fist).
 */
export function characterStatisticInputs(
  registry: ContentRegistry,
  document: CharacterDocument,
  slots: SlotContent,
): StatisticInputs {
  const grants = characterGrants(document, slots);
  const favored = favoredWeapons(grants);
  const items = itemContent(registry);
  const equipped = equippedInputs(document.inventory, items, {
    favored,
    rules: () => equippedRules(document, items, slots),
  });
  const held = new Set(equipped.weapons.map(({ slug }) => slug));
  const granted = grantedStrikes(grants, favored).filter(({ slug }) => !held.has(slug));
  return {
    level: document.level,
    attributes: attributeModifiers(document, slots.boosts),
    ranks: buildRanks(document, slots),
    spellcasting: characterSpellcasting(grants),
    ...ancestryInputs(registry, document),
    ...classInputsOf(registry, document, slots),
    ...equipped,
    weapons: [...equipped.weapons, ...granted],
  };
}

/**
 * What a character's statistics are derived from: the registry, the slot content read from it, its inputs, and the
 * variant rules enabled for it, whose rule elements are in play beside those of its items.
 */
export interface StatisticSources {
  readonly registry: ContentRegistry;
  readonly slots: SlotContent;
  readonly inputs: StatisticInputs;
  readonly variants: readonly VariantRuleEntry[];
  /** What the statistics are derived as, when not as plain checks: initiative (#506). */
  readonly as?: RollAs | undefined;
}

/** The rules its items, conditions and build put in play: variant rules first, overrides last so a set one pins. */
export function rulesInPlay(
  document: CharacterDocument,
  { registry, slots: read, variants, as }: Pick<StatisticSources, 'registry' | 'slots' | 'variants' | 'as'>,
): EquippedRules {
  const slots = { ...read, situation: as?.options };
  const items = itemContent(registry);
  const equipped = equippedRules(document, items, slots);
  const added = [...customEffectRules(document), ...overrideRules(document)];
  return {
    ...equipped,
    rules: [...variantRulesInPlay(variants), ...buildRules(document, items, slots), ...equipped.rules, ...added],
  };
}

/**
 * Every statistic the engine derives for a character, with the rule elements of the items it wears, holds or has
 * invested in play when the registry holds the item kinds, and the character's `RollOption` toggles as it left them.
 * A rule in `situation` that depends on the situation counts as holding. Empty without a proficiency bonus table, as
 * nothing can be derived.
 */
export function characterStatistics(
  document: CharacterDocument,
  sources: StatisticSources,
  situation: ReadonlySet<RuleId> = NO_SITUATION,
): ReadonlyMap<Selector, StatisticResult> {
  const content = statisticContent(sources.registry);
  if (content === undefined) {
    return new Map();
  }
  const rolled = contentRolledAs(content, sources.as);
  return deriveStatistics(rolled, sources.inputs, { ...rulesInPlay(document, sources), situation });
}

/**
 * The character's maximum Hit Points as the engine derives `hp:max`; undefined while it can't be (no ancestry or class
 * yet, or no statistic for it loaded). A negative total, as a low Constitution at level 1 could give in theory, is 0.
 */
export function maxHitPoints(statistics: ReadonlyMap<Selector, StatisticResult>): HitPoints | undefined {
  const result = statistics.get(MAX_HP_SELECTOR);
  if (result === undefined || !result.ok) {
    return undefined;
  }
  return HitPoints.parse(Math.max(0, result.total));
}

/** What a roll of one statistic offers, and what it makes of the choices so far (rules-engine.md, "Conditional lines"). */
export interface RollSetup {
  /** The statistic with the situation chosen counted, and the `RollOption` toggles as the character has them. */
  readonly statistic: StatisticValue;
  /** The conditional lines the roll may claim the situation of, as the sheet shows them, whatever is chosen. */
  readonly conditional: readonly BreakdownLine[];
  /** The character's `RollOption` toggles that move a line of the statistic, with their state. */
  readonly toggles: readonly ToggleSlot[];
}

/** The statistic a roll is for, and the rules whose situation it has claimed. */
export interface RollRequest {
  readonly selector: Selector;
  readonly chosen: ReadonlySet<RuleId>;
  /** What the roll is made as, when not a plain check: initiative (#506). */
  readonly as?: RollAs | undefined;
}

/**
 * What rolling `selector` offers: the conditional lines whose situation the roll may claim, and the character's
 * `RollOption` toggles that its lines read, both listed from the sheet's own derivation so they stay while chosen. The
 * `statistic` is derived with `chosen` counted as holding; a rule id that is not offered is ignored. A conditional
 * line a toggle of the character already stands for is not offered twice. Undefined when the statistic has no value.
 */
export function rollSetup(
  document: CharacterDocument,
  sources: StatisticSources,
  { selector, chosen, as }: RollRequest,
): RollSetup | undefined {
  const rolled = { ...sources, as };
  const derived = characterStatistics(document, rolled);
  return rollSetups(document, rolled, { derived, claims: new Map([[selector, chosen]]) }).get(selector);
}

/** The sheet's own derivation, and the situations claimed for each statistic's roll. */
export interface RollSetupsRequest {
  /** The character's statistics as `characterStatistics` returns them. */
  readonly derived: ReadonlyMap<Selector, StatisticResult>;
  readonly claims: ReadonlyMap<Selector, ReadonlySet<RuleId>>;
}

/** What a statistic is derived again from when a roll claims a situation. */
interface Rederivation {
  readonly content: StatisticContent;
  readonly inputs: StatisticInputs;
  readonly rules: EquippedRules;
}

/**
 * `rollSetup` for several statistics at once, each with the situations its own roll has claimed, offered from the
 * sheet's own derivation so a statistic with nothing claimed costs no derivation. One that has no value is left out.
 */
export function rollSetups(
  document: CharacterDocument,
  sources: StatisticSources,
  { derived, claims }: RollSetupsRequest,
): ReadonlyMap<Selector, RollSetup> {
  const content = statisticContent(sources.registry);
  if (content === undefined) {
    return new Map();
  }
  const rules = rulesInPlay(document, sources);
  const rederivation = { content: contentRolledAs(content, sources.as), inputs: sources.inputs, rules };
  const setups = [...claims].flatMap(([selector, chosen]): [Selector, RollSetup][] => {
    const setup = setupFor(derived.get(selector), chosen, rederivation);
    return setup === undefined ? [] : [[selector, setup]];
  });
  return new Map(setups);
}

/** What rolling the statistic `sheet` offers with `chosen` claimed; undefined when it has no value. */
function setupFor(
  sheet: StatisticResult | undefined,
  chosen: ReadonlySet<RuleId>,
  { content, inputs, rules }: Rederivation,
): RollSetup | undefined {
  if (sheet?.ok !== true) {
    return undefined;
  }
  const { conditional, toggles } = offerFor(sheet, rules);
  const claimed = new Set(conditional.map(({ modifier }) => modifier.id).filter((id) => chosen.has(id)));
  const statistic =
    claimed.size === 0
      ? sheet
      : deriveStatistics(content, inputs, { ...rules, situation: claimed }).get(sheet.selector);
  return statistic?.ok === true ? { statistic, conditional, toggles } : undefined;
}

/** What a roll of a statistic offers on the sheet's own derivation of it: the lines to claim and the toggles to flip. */
function offerFor(sheet: StatisticValue, rules: EquippedRules): Pick<RollSetup, 'conditional' | 'toggles'> {
  const { conditional, options } = rollSituation(sheet);
  const toggles = rules.toggles.filter(({ option }) => options.has(option));
  const stood = new Set(toggles.map(({ option }) => option));
  return {
    toggles,
    conditional: conditional.filter(
      ({ status }) => status.kind === LineStatusKind.Conditional && !standsFor(status.when, stood),
    ),
  };
}

/** Whether every option `when` reads has a toggle of its own, so a toggle on the line would only repeat it. */
function standsFor(when: Predicate, stood: ReadonlySet<RollOption>): boolean {
  const read = predicateOptions(when);
  return read.size > 0 && [...read].every((option) => stood.has(option));
}

/**
 * The fast healing, regeneration, temporary Hit Points and size the character's rule elements give (`vitalsInPlay`),
 * read against its ancestry's size. Without an ancestry or a proficiency bonus table there is nothing to read them
 * against, so none is given.
 */
export function characterVitals(
  { registry, slots, inputs }: StatisticSources,
  document: CharacterDocument,
): VitalsInPlay | undefined {
  const content = statisticContent(registry);
  const picked = AncestryId.safeParse(document.build.choices[ANCESTRY_SLOT]);
  const ancestry = picked.success ? registry.ancestry(picked.data) : undefined;
  if (content === undefined || ancestry === undefined) {
    return undefined;
  }
  return vitalsInPlay(equippedRules(document, itemContent(registry), slots), {
    statistics: content,
    character: inputs,
    size: ancestry.definition.size,
  });
}

/**
 * The rule elements in play and what they are read against, for the dice and notes a Strike takes from them
 * (`deriveStrikes`); undefined without a proficiency bonus table, as nothing can be read.
 */
export function characterStrikeRules(
  { registry, slots, inputs }: StatisticSources,
  document: CharacterDocument,
): StrikeRulesInput | undefined {
  const content = statisticContent(registry);
  return content === undefined
    ? undefined
    : {
        inputs: equippedRules(document, itemContent(registry), slots),
        scope: { statistics: content, character: inputs },
      };
}
