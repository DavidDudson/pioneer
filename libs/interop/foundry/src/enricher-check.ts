import { Dc, InlineKind, RollOption, Selector } from '@pioneer/rules/sdk';
import type { CheckDc, CheckNode } from '@pioneer/rules/sdk';

import { inlineLabel, reportParams, textRun } from './enricher-context';
import type { EnricherContext } from './enricher-context';
import { enricherParams } from './foundry-enricher';
import { loreSelector, loreSlugTopic } from './foundry-lore';
import { slugify } from './foundry-slug';
import type { RunNode } from './rich-text-run';

/**
 * `@Check[type|dc:N|against:x|basic|options:a,b]{label}` as a `Check` node. Foundry's statistic slugs become
 * Pioneer selectors (`reflex` to `save:reflex`, `athletics` to `skill:athletics`, `warfare-lore` to
 * `skill:lore:warfare`); a flat check is selector `flat`. A check whose statistic has no selector keeps its label
 * as text.
 */

const ENRICHER = '@Check';
const TYPE = 'type';
const DC = 'dc';
const AGAINST = 'against';
const DEFENSE = 'defense';
const BASIC = 'basic';
const OPTIONS = 'options';
const ADJUSTMENT = 'adjustment';
const ROLLER_ROLE = 'rollerRole';
/** Foundry's default roller: the target rolls a save, the origin anything else. */
const TARGET = 'target';
const SAVE_PREFIX = 'save:';

/** Parameters that only change how Foundry shows or rolls the check, not what it is. */
const PRESENTATION = ['showDC', 'name', 'immutable', 'targetOwner'];
const HANDLED: ReadonlySet<string> = new Set([
  TYPE,
  DC,
  AGAINST,
  DEFENSE,
  BASIC,
  OPTIONS,
  ADJUSTMENT,
  ROLLER_ROLE,
  ...PRESENTATION,
]);

const SAVES: ReadonlySet<string> = new Set(['fortitude', 'reflex', 'will']);
const SKILLS: ReadonlySet<string> = new Set([
  'acrobatics',
  'arcana',
  'athletics',
  'crafting',
  'deception',
  'diplomacy',
  'intimidation',
  'medicine',
  'nature',
  'occultism',
  'performance',
  'religion',
  'society',
  'stealth',
  'survival',
  'thievery',
]);

/** Foundry's class slugs: `against:<class>` is that class's class DC. */
const CLASSES: ReadonlySet<string> = new Set([
  'alchemist',
  'animist',
  'barbarian',
  'bard',
  'champion',
  'cleric',
  'commander',
  'druid',
  'exemplar',
  'fighter',
  'guardian',
  'gunslinger',
  'inventor',
  'investigator',
  'kineticist',
  'magus',
  'monk',
  'oracle',
  'psychic',
  'ranger',
  'rogue',
  'runesmith',
  'sorcerer',
  'summoner',
  'swashbuckler',
  'thaumaturge',
  'witch',
  'wizard',
]);

/** Foundry's DC statistics with no counterpart among the check statistics. */
const DC_SELECTORS: ReadonlyMap<string, string> = new Map([
  ['class', 'class-dc'],
  ['spell', 'spell-dc'],
  // Foundry's synthetic "higher of class DC and spell DC".
  ['class-spell', 'class-or-spell-dc'],
  ['ac', 'ac'],
  ['armor', 'ac'],
]);

const FLAT = 'flat';
const PERCEPTION = 'perception';
const DC_VALUE = /^\d+$/u;
const INTEGER = /^-?\d+$/u;
const LIST_SEPARATOR = ',';

/** A Foundry statistic slug as a Pioneer check selector, or undefined when there is none. */
function statisticSelector(type: string): Selector | undefined {
  const slug = slugify(type);
  const lore = loreSlugTopic(slug);
  if (SAVES.has(slug)) {
    return Selector.parse(`save:${slug}`);
  }
  if (SKILLS.has(slug)) {
    return Selector.parse(`skill:${slug}`);
  }
  if (lore !== undefined) {
    return loreSelector(lore);
  }
  return slug === PERCEPTION || slug === FLAT ? Selector.parse(slug) : undefined;
}

/** The statistic whose DC `against:` names. */
function againstSelector(against: string): Selector | undefined {
  const slug = slugify(against);
  const named = CLASSES.has(slug) ? 'class-dc' : DC_SELECTORS.get(slug);
  if (named !== undefined) {
    return Selector.parse(named);
  }
  return slug === FLAT ? undefined : statisticSelector(slug);
}

/** A whole-number DC with Foundry's `adjustment` added, as Foundry shows and rolls it. */
function fixedDc(value: string, params: ReadonlyMap<string, string>, context: EnricherContext): Dc | undefined {
  const adjustment = params.get(ADJUSTMENT) ?? '0';
  if (!DC_VALUE.test(value) || !INTEGER.test(adjustment)) {
    context.report(`${ENRICHER}[${DC_VALUE.test(value) ? ADJUSTMENT : DC}]`);
    return undefined;
  }
  return Dc.safeParse(Number(value) + Number(adjustment)).data;
}

/**
 * The DC `against:` names, when it is the reader's own: Foundry's DC belongs to whoever does not roll, and a
 * `CheckDc` is "against your X DC", so it only fits a check the target rolls (a save, by default). A check the
 * reader rolls against a target's DC is reported and keeps no DC.
 */
function againstDc(against: string, { params, statistic }: CheckInput, context: EnricherContext): CheckDc | undefined {
  const roller = params.get(ROLLER_ROLE) ?? (statistic.startsWith(SAVE_PREFIX) ? TARGET : '');
  const selector = againstSelector(against);
  if (selector === undefined) {
    context.report(`${ENRICHER}[${AGAINST}:${against}]`);
  } else if (roller !== TARGET) {
    context.report(`${ENRICHER}[${AGAINST}]`);
  }
  return selector === undefined || roller !== TARGET ? undefined : { against: selector };
}

/** A check's parameters and the selector its statistic became. */
interface CheckInput {
  readonly params: ReadonlyMap<string, string>;
  readonly statistic: Selector;
}

function dcOf(input: CheckInput, context: EnricherContext): CheckDc | undefined {
  const value = input.params.get(DC);
  const against = input.params.get(AGAINST) ?? input.params.get(DEFENSE);
  if (value !== undefined) {
    return fixedDc(value, input.params, context);
  }
  return against === undefined ? undefined : againstDc(against, input, context);
}

/** Foundry's extra roll options; Pioneer's need a namespace (`area-effect` has none), so those are reported. */
function optionsOf(params: ReadonlyMap<string, string>, context: EnricherContext): RollOption[] {
  const values = (params.get(OPTIONS) ?? '').split(LIST_SEPARATOR).map((value) => value.trim());
  const options = values.flatMap((value) => RollOption.safeParse(value).data ?? []);
  if (options.length < values.filter((value) => value !== '').length) {
    context.report(`${ENRICHER}[${OPTIONS}]`);
  }
  return options;
}

function isBasic(params: ReadonlyMap<string, string>, statistic: Selector, context: EnricherContext): boolean {
  const basic = params.has(BASIC);
  const isSave = statistic.startsWith('save:');
  if (basic && !isSave) {
    context.report(`${ENRICHER}[${BASIC}]`);
  }
  return basic && isSave;
}

/** Foundry's label for a check it has no statistic name for: the slug's words, capitalised. */
function fallbackText(type: string, label: string | undefined): string {
  return (
    label ??
    type
      .split('-')
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join(' ')
  );
}

export function checkRun(params: string, label: string | undefined, context: EnricherContext): RunNode[] {
  const parsed = enricherParams(params, TYPE);
  const type = parsed.get(TYPE) ?? '';
  const statistic = type.includes(LIST_SEPARATOR) ? undefined : statisticSelector(type);
  if (statistic === undefined) {
    context.report(`${ENRICHER}[${TYPE}:${type}]`);
    return textRun(fallbackText(type, label), context);
  }
  reportParams(parsed, { enricher: ENRICHER, handled: HANDLED }, context);
  const dc = dcOf({ params: parsed, statistic }, context);
  const options = optionsOf(parsed, context);
  const checkLabel = inlineLabel(label, `${ENRICHER}[label]`, context);
  const node: CheckNode = {
    type: InlineKind.Check,
    statistic,
    ...(dc === undefined ? {} : { dc }),
    ...(isBasic(parsed, statistic, context) ? { basic: true } : {}),
    ...(options.length === 0 ? {} : { options }),
    ...(checkLabel === undefined ? {} : { label: checkLabel }),
  };
  return [node];
}
