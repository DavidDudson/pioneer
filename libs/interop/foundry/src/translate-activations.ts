import { ActivationName, FrequencyPeriod, Slug, Uses } from '@pioneer/rules/sdk';
import type { Frequency } from '@pioneer/rules/sdk';

import { asciiNameSlug } from './foundry-slug';
import { KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog } from './kind-data-gaps';
import { setFields } from './kind-fields';

/**
 * Item activations with a frequency. Foundry pf2e keeps no structured frequency on an item, only the printed one in
 * its description, so it is read from the text: `<strong>Activate—Name</strong> … <strong>Frequency</strong> once per
 * day`. A frequency that does not read as a count and a period is reported and the activation left out.
 */

const ACTIVATE = /<strong>\s*Activate/giu;
const NAME_AFTER_ACTIVATE = /^\s*(?:—|&mdash;|–)\s*(?<name>[^<]+?)\s*<\/strong>/iu;
const FREQUENCY = /<strong>\s*Frequency\s*<\/strong>\s*(?<text>[^<]*)/iu;
const NO_NAME = /^\s*<\/strong>/u;

const COUNT_WORDS: readonly string[] = ['one', 'two', 'three', 'four', 'five', 'six'];

/** Words that stand for a count without being numbered. */
const ONCE = 1;
const TWICE = 2;

/** What follows "once per" or "three times every": a unit with its number of them. */
const PERIODS: readonly (readonly [RegExp, FrequencyPeriod])[] = [
  [/^(?:turn)$/u, FrequencyPeriod.Turn],
  [/^(?:round)$/u, FrequencyPeriod.Round],
  [/^(?:1 )?minute$/u, FrequencyPeriod.Minute],
  [/^10 minutes$/u, FrequencyPeriod.TenMinutes],
  [/^(?:1 )?hour$/u, FrequencyPeriod.Hour],
  [/^24 hours$/u, FrequencyPeriod.TwentyFourHours],
  [/^day$/u, FrequencyPeriod.Day],
  [/^week$/u, FrequencyPeriod.Week],
  [/^month$/u, FrequencyPeriod.Month],
  [/^year$/u, FrequencyPeriod.Year],
];

const PRINTED = /^(?<count>[a-z]+|\d+)(?: times)?\s+(?:per|every)\s+(?<unit>.+?)\.?$/iu;

/** The number a count in the text is: a word, "once", "twice" or digits. */
function countOf(count: string | undefined): number | undefined {
  if (count === undefined) {
    return undefined;
  }
  const named = COUNT_WORDS.indexOf(count);
  const spelled = new Map([
    ['once', ONCE],
    ['twice', TWICE],
  ]).get(count);
  return spelled ?? (named === -1 ? Number(count) : named + ONCE);
}

/** "once per day" or "three times per hour" as a frequency; undefined when it reads as neither. */
export function printedFrequency(text: string): Frequency | undefined {
  const parsed = PRINTED.exec(text.trim().replaceAll('&nbsp;', ' ').toLowerCase());
  const { count, unit } = parsed?.groups ?? {};
  const per = PERIODS.find(([pattern]) => unit !== undefined && pattern.test(unit))?.[1];
  const max = Uses.safeParse(countOf(count));
  return per === undefined || !max.success ? undefined : { max: max.data, per };
}

/** The name of the activation a section after "Activate" starts with; the item's own when it is not named. */
function nameOf(section: string, itemName: string): string | undefined {
  return NO_NAME.test(section) ? itemName : NAME_AFTER_ACTIVATE.exec(section)?.groups?.['name'];
}

/** The activations of an item with a frequency, unparsed, from its description's HTML. */
export function activationsOf(html: string, itemName: string, log: GapLog): object {
  const found = html
    .split(ACTIVATE)
    .slice(1)
    .flatMap((section) => {
      const text = FREQUENCY.exec(section)?.groups?.['text'];
      const name = nameOf(section, itemName);
      if (text === undefined || name === undefined) {
        return [];
      }
      const frequency = printedFrequency(text);
      if (frequency === undefined) {
        report(log, { reason: KindDataGapReason.UnmappedValue, field: 'description.frequency', raw: text });
        return [];
      }
      const slug = Slug.safeParse(asciiNameSlug(name));
      const label = ActivationName.safeParse(name);
      return slug.success && label.success ? [{ slug: slug.data, name: label.data, frequency }] : [];
    });
  const distinct = found.filter(({ slug }, index) => found.findIndex((each) => each.slug === slug) === index);
  return setFields({ activations: distinct.length === 0 ? undefined : distinct });
}
