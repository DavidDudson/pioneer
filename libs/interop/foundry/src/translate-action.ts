import {
  ActionCategory,
  ActionCost,
  BlockKind,
  FrequencyPeriod,
  InlineKind,
  RichTextString,
  Uses,
} from '@pioneer/rules/sdk';
import type { ContentId, Frequency, RichText } from '@pioneer/rules/sdk';
import * as z from 'zod';

import type { FoundryLinks } from './enricher-context';
import { resolveUuid } from './entry-references';
import type { EntryReferences } from './entry-references';
import { htmlToRichText } from './html-rich-text';
import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog, KindInput } from './kind-data-gaps';

/** An action's `data` from Foundry's `action` item: its cost, category, usage text, frequency and self effect. */

export const ACTION_FIELDS: ReadonlySet<string> = new Set([
  ...ENVELOPE_FIELDS,
  'actionType',
  'actions',
  'category',
  'frequency',
  'selfEffect',
]);

/** Foundry's action types, by their own glyph; `action` counts its glyph from `actions.value`. */
const FoundryActionType = { Action: 'action', Reaction: 'reaction', Free: 'free', Passive: 'passive' } as const;

/** The types whose cost does not count actions; a passive ability costs none. */
const FIXED_COSTS: ReadonlyMap<string, ActionCost | undefined> = new Map([
  [FoundryActionType.Reaction, ActionCost.Reaction],
  [FoundryActionType.Free, ActionCost.Free],
  [FoundryActionType.Passive, undefined],
]);

const ONE = 1;
const TWO = 2;
const THREE = 3;

const COSTS_BY_COUNT: ReadonlyMap<number, ActionCost> = new Map([
  [ONE, ActionCost.One],
  [TWO, ActionCost.Two],
  [THREE, ActionCost.Three],
]);

/** Foundry's frequency periods: words, or ISO 8601 durations. */
const FOUNDRY_FREQUENCY_PERIODS: ReadonlyMap<string, FrequencyPeriod> = new Map([
  ['turn', FrequencyPeriod.Turn],
  ['round', FrequencyPeriod.Round],
  ['PT1M', FrequencyPeriod.Minute],
  ['PT10M', FrequencyPeriod.TenMinutes],
  ['PT1H', FrequencyPeriod.Hour],
  ['PT24H', FrequencyPeriod.TwentyFourHours],
  ['day', FrequencyPeriod.Day],
  ['P1W', FrequencyPeriod.Week],
  ['P1M', FrequencyPeriod.Month],
  ['P1Y', FrequencyPeriod.Year],
]);

const FIELD_MAX = 64;
const UUID_MAX = 500;
const HTML_MAX = 1_000_000;

const FoundryActionSystem = z.looseObject({
  actionType: z.looseObject({ value: z.string().max(FIELD_MAX) }),
  actions: z.looseObject({ value: z.number().nullable() }).optional(),
  category: z.string().max(FIELD_MAX).nullish(),
  frequency: z.looseObject({ max: z.number(), per: z.string().max(FIELD_MAX) }).nullish(),
  selfEffect: z.looseObject({ uuid: z.string().max(UUID_MAX) }).nullish(),
  description: z.looseObject({ value: z.string().max(HTML_MAX) }).optional(),
});
type FoundryActionSystem = z.infer<typeof FoundryActionSystem>;

interface Mapping<Value> {
  readonly value: Value | undefined;
  readonly field: string;
  readonly raw: unknown;
}

/** The mapped value, reporting `raw` as unmapped when there is none. */
function mapped<Value>(log: GapLog, { value, field, raw }: Mapping<Value>): Value | undefined {
  if (value === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field, raw });
  }
  return value;
}

/** What an action costs: a glyph, or none for a passive ability. */
interface Costed {
  readonly cost?: ActionCost;
}

/**
 * The glyph an action costs, or undefined when Foundry's type or count has no mapping. Without a cost the action would
 * read as passive, so an unmapped one leaves the entry without data rather than guessing.
 */
function actionCost({ actionType, actions }: FoundryActionSystem, log: GapLog): Costed | undefined {
  const type = actionType.value;
  if (FIXED_COSTS.has(type)) {
    const fixed = FIXED_COSTS.get(type);
    return fixed === undefined ? {} : { cost: fixed };
  }
  if (type !== FoundryActionType.Action) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'actionType.value', raw: type });
    return undefined;
  }
  const count = actions?.value;
  const counted = typeof count === 'number' ? COSTS_BY_COUNT.get(count) : undefined;
  const cost = mapped(log, { value: counted, field: 'actions.value', raw: count });
  return cost === undefined ? undefined : { cost };
}

const ActionCategorySchema = z.enum(ActionCategory);

function categoryOf({ category }: FoundryActionSystem, log: GapLog): ActionCategory | undefined {
  if (category === null || category === undefined) {
    return undefined;
  }
  const known = ActionCategorySchema.safeParse(category);
  return mapped(log, { value: known.data, field: 'category', raw: category });
}

function frequencyOf({ frequency }: FoundryActionSystem, log: GapLog): Frequency | undefined {
  if (frequency === null || frequency === undefined) {
    return undefined;
  }
  const per = FOUNDRY_FREQUENCY_PERIODS.get(frequency.per);
  const max = mapped(log, { value: Uses.safeParse(frequency.max).data, field: 'frequency.max', raw: frequency.max });
  if (per === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'frequency.per', raw: frequency.per });
    return undefined;
  }
  return max === undefined ? undefined : { max, per };
}

function selfEffectOf(
  { selfEffect }: FoundryActionSystem,
  references: EntryReferences,
  log: GapLog,
): ContentId | undefined {
  if (selfEffect === null || selfEffect === undefined) {
    return undefined;
  }
  const effect = resolveUuid(references, selfEffect.uuid);
  if (effect === undefined) {
    report(log, { reason: KindDataGapReason.UnresolvedReference, field: 'selfEffect', raw: selfEffect.uuid });
  }
  return effect;
}

/** The paragraphs Foundry heads an action's usage with, by the data field each fills. */
const USAGE_PARAGRAPHS = {
  trigger: /<p>\s*<strong>Trigger<\/strong>(?<text>.*?)<\/p>/su,
  requirements: /<p>\s*<strong>Requirements<\/strong>(?<text>.*?)<\/p>/su,
} as const;
type UsageField = keyof typeof USAGE_PARAGRAPHS;

/** Anything beyond words: tags, entities, `@UUID[…]` and other enrichers, inline rolls. */
const MARKUP = /[<>&@[\]{}]/u;

/**
 * Text as one paragraph of rich text, when it is plain words; blank text is none. Text with links or markup is
 * reported against `field` for the rich text stories.
 */
export function plainWords(field: string, text: string, log: GapLog): RichText | undefined {
  const words = RichTextString.safeParse(text);
  if (!words.success) {
    return undefined;
  }
  if (MARKUP.test(text)) {
    report(log, { reason: KindDataGapReason.NeedsRichText, field, raw: text });
    return undefined;
  }
  return [{ type: BlockKind.Paragraph, content: [{ type: InlineKind.Text, text: words.data }] }];
}

/**
 * A usage paragraph as rich text (`<p><strong>Trigger</strong> Your turn begins.</p>`), translated as descriptions
 * are, so its links and inline checks stay; blank text is none. Markup and enrichers it cannot map are reported with
 * the description, which holds the same paragraph.
 */
function usageOf(
  field: UsageField,
  { description }: FoundryActionSystem,
  links: FoundryLinks | undefined,
): RichText | undefined {
  const text = USAGE_PARAGRAPHS[field].exec(description?.value ?? '')?.groups?.['text']?.trim() ?? '';
  const { richText } = htmlToRichText(text, links);
  return richText.length === 0 ? undefined : richText;
}

/** Every field but the cost, the ones that are set. */
function usage(fields: FoundryActionSystem, { references, links, log }: KindInput): object {
  const set = {
    category: categoryOf(fields, log),
    requirementsText: usageOf('requirements', fields, links),
    trigger: usageOf('trigger', fields, links),
    frequency: frequencyOf(fields, log),
    selfEffect: selfEffectOf(fields, references, log),
  };
  return Object.fromEntries(Object.entries(set).filter(([, value]) => value !== undefined));
}

/**
 * The action's data, unparsed; undefined when its `system` is not shaped as an action's or its cost cannot be
 * mapped.
 */
export function actionData(input: KindInput): object | undefined {
  const { document, log } = input;
  const system = FoundryActionSystem.safeParse(document.system);
  if (!system.success) {
    report(log, { reason: KindDataGapReason.InvalidData, field: '', raw: z.prettifyError(system.error) });
    return undefined;
  }
  const costed = actionCost(system.data, log);
  return costed && { ...costed, ...usage(system.data, input) };
}
