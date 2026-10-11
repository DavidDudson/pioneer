import { ContentKind, RuleElementKey } from '@pioneer/rules/sdk';

import { resolveSlug } from './entry-references';
import type { EntryReferences } from './entry-references';
import type { FoundrySense } from './foundry-config';

/**
 * Foundry's senses as `Sense` elements: its `Sense` rule element, and a feat's `subfeatures.senses`. Each names its
 * sense by Foundry's slug, which resolves to the `sense` entry of the vocabulary. Foundry ignores the acuity of a sense
 * that fixes one (darkvision is precise) and the range of a sense with no limit, so those are left off.
 */

/** Foundry's config for each sense, by slug: what it fixes. Without it, acuity and range stay as Foundry wrote them. */
export type FoundrySenses = ReadonlyMap<string, FoundrySense>;

/** How a sense's slug resolves, and what each Foundry sense fixes. */
export interface SenseContext {
  readonly references: EntryReferences;
  readonly senses?: FoundrySenses | undefined;
}

/** What Foundry says of one sense besides its slug. */
export interface FoundrySenseFields {
  readonly acuity?: unknown;
  readonly range?: unknown;
}

/** The fields a `Sense` rule replaces (`selector`) or drops at Foundry's default (`force`). */
const SENSE_FIELDS_REPLACED: ReadonlySet<string> = new Set(['selector', 'acuity', 'range', 'force']);

/**
 * A `Sense` element for the sense with Foundry's `slug`, with the acuity and range the sense does not fix; undefined
 * when no `sense` entry has that slug.
 */
export function senseElement(
  slug: string,
  { acuity, range }: FoundrySenseFields,
  { references, senses }: SenseContext,
): object | undefined {
  const sense = resolveSlug(references, ContentKind.Sense, slug);
  if (sense === undefined) {
    return undefined;
  }
  const fixed = senses?.get(slug);
  return {
    key: RuleElementKey.Sense,
    sense,
    ...(acuity === undefined || fixed?.acuity !== undefined ? {} : { acuity }),
    ...(range === undefined || fixed?.unlimitedRange === true ? {} : { range }),
  };
}

/**
 * A Foundry `Sense` rule element as Pioneer's, keeping its base fields (predicate, priority, label). One whose sense
 * does not resolve, or that forces its sense over a better one (`force`), is left as it is, so it fails and is kept
 * for the backlog.
 */
export function withSense(raw: unknown, context: SenseContext): unknown {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !('key' in raw) ||
    raw.key !== RuleElementKey.Sense ||
    !('selector' in raw) ||
    typeof raw.selector !== 'string' ||
    ('force' in raw && raw.force !== false)
  ) {
    return raw;
  }
  const fields = {
    ...('acuity' in raw ? { acuity: raw.acuity } : {}),
    ...('range' in raw ? { range: raw.range } : {}),
  };
  const element = senseElement(raw.selector, fields, context);
  if (element === undefined) {
    return raw;
  }
  const rest = Object.entries(raw).filter(([field]) => !SENSE_FIELDS_REPLACED.has(field));
  return { ...Object.fromEntries(rest), ...element };
}
