import { Level, RuleElementKey, RuleIndex } from '@pioneer/rules/sdk';
import type { ContentId, ContentLevel, Origin, RuleElements, Selector, SpellRank } from '@pioneer/rules/sdk';

import { deriveDefences } from './defences';
import type { Defences } from './defences';
import { deriveStatistics } from './derive-statistics';
import type { StatisticContent } from './derive-statistics';
import { EffectChange, EffectMode } from './effect-line';
import type { EffectLine } from './effect-line';
import {
  adjustmentEffect,
  immunityEffect,
  modifierEffect,
  notSummarised,
  senseEffect,
  setEffect,
  SUMMARISED,
} from './effect-lines';
import type { SenseReading } from './effect-lines';
import { ruleIdOf, RuleInPlay } from './rule-in-play';
import type { ModifierInputs, RuleId } from './rule-in-play';
import { sensesInPlay } from './senses-in-play';
import type { AncestryVision } from './senses-in-play';
import type { StatisticInputs } from './statistic-inputs';
import type { StatisticResult } from './statistic-result';

/** What an entry's effects are read against: the character, as the sheet derives its statistics. */
export interface EffectScope {
  readonly content: StatisticContent;
  readonly inputs: StatisticInputs;
  /** The rules in play, as `deriveStatistics` takes them, with the entry's own among them while it applies. */
  readonly modifiers: ModifierInputs;
  /** The vision the character's ancestry gives. */
  readonly vision?: AncestryVision;
}

/** The part of a content entry its effects come from. */
export interface SummarisedEntry {
  readonly id: ContentId;
  readonly rules: RuleElements;
  readonly sources: Origin['sources'];
  readonly level?: ContentLevel | undefined;
  /** The rank a spell is cast at, which `@item.level` reads in place of `level`. */
  readonly rank?: SpellRank | undefined;
}

/** The entry's rules as they would be in play when it is taken, equipped, cast or gained. */
function candidates(entry: SummarisedEntry): readonly RuleInPlay[] {
  const itemLevel = Level.safeParse(entry.rank ?? entry.level).data;
  return entry.rules.map((element, rule) =>
    RuleInPlay.parse({
      element,
      origin: { hops: [], entry: entry.id, sources: entry.sources },
      rule: RuleIndex.parse(rule),
      itemLevel,
    }),
  );
}

/** The rules in play with the entry's, and which of them are the entry's. */
interface EntryRules {
  readonly all: readonly RuleInPlay[];
  readonly own: readonly RuleInPlay[];
}

/** The rules in play, and which of them are the entry's. In `would-apply` mode its rules not yet in play join them. */
function rulesFor(entry: SummarisedEntry, mode: EffectMode, { rules }: ModifierInputs): EntryRules {
  const held = rules.filter(({ origin }) => origin.entry === entry.id);
  if (mode === EffectMode.Applying) {
    return { all: rules, own: held };
  }
  const heldIds: ReadonlySet<RuleId> = new Set(held.map((rule) => ruleIdOf(rule)));
  const joining = candidates(entry).filter((rule) => !heldIds.has(ruleIdOf(rule)));
  return { all: [...rules, ...joining], own: [...held, ...joining] };
}

/** Whether something comes from the entry. */
type FromEntry = (source: { readonly origin: Origin }) => boolean;

/** The lines of the entry's bonuses, penalties and `Change`s on every statistic that has a value. */
function statisticLines(statistics: ReadonlyMap<Selector, StatisticResult>, fromEntry: FromEntry): EffectLine[] {
  const lines: EffectLine[] = [];
  for (const result of statistics.values()) {
    if (result.ok) {
      lines.push(
        ...result.lines
          .filter(({ modifier }) => fromEntry(modifier))
          .map((line) => modifierEffect(result.selector, line)),
        ...result.overrides.filter(fromEntry).map((line) => setEffect(result.selector, line)),
      );
    }
  }
  return lines;
}

/** The lines of the entry's weaknesses, resistances and immunities. */
function defenceLines(defences: Defences, fromEntry: FromEntry): EffectLine[] {
  return [
    ...defences.weaknesses.filter(fromEntry).map((line) => adjustmentEffect(EffectChange.Weakness, line)),
    ...defences.resistances.filter(fromEntry).map((line) => adjustmentEffect(EffectChange.Resistance, line)),
    ...defences.immunities.filter(fromEntry).map((line) => immunityEffect(line)),
  ];
}

/** The lines of the entry's senses, and the not-summarised ones for the elements nothing else covers. */
function ruleLines(own: readonly RuleInPlay[], reading: SenseReading): EffectLine[] {
  const lines: EffectLine[] = [];
  for (const rule of own) {
    const { element } = rule;
    if (element.key === RuleElementKey.Sense) {
      const line = senseEffect(rule, element, reading);
      if (line !== undefined) {
        lines.push(line);
      }
    } else if (!SUMMARISED.has(element.key)) {
      lines.push(notSummarised(rule));
    }
  }
  return lines;
}

/**
 * The concrete effects of `entry` on a character, as structured lines (statistic, change, bonus type, value and when
 * it applies); the UI words them. `applying` reads the rules in play, so a line is the breakdown's own: its status and
 * value are what the character's statistics, defences and senses show. `would-apply` adds the entry's rules that are not
 * in play yet and derives again, so a line is what the breakdown would show then; for an entry already in play it is
 * the same as `applying`. A bonus, penalty or `Change` has one line per statistic it reaches. A rule element the summary
 * does not cover yields a `not-summarised` line. A statistic that has no value has no lines. Never throws.
 */
export function summariseEffects(scope: EffectScope, entry: SummarisedEntry, mode: EffectMode): readonly EffectLine[] {
  const { all, own } = rulesFor(entry, mode, scope.modifiers);
  const modifiers: ModifierInputs = { ...scope.modifiers, rules: all };
  const fromEntry: FromEntry = ({ origin }) => origin.entry === entry.id;
  const lines = [
    ...statisticLines(deriveStatistics(scope.content, scope.inputs, modifiers), fromEntry),
    ...defenceLines(deriveDefences(scope.content, scope.inputs, modifiers), fromEntry),
    ...ruleLines(own, { senses: sensesInPlay(modifiers, scope.vision), modifiers }),
  ];
  // Rule order, then what the line changes, so the result never depends on the order of the rules.
  return lines.toSorted(
    (left, right) =>
      Number(left.rule > right.rule) - Number(left.rule < right.rule) ||
      Number(left.change > right.change) - Number(left.change < right.change),
  );
}
