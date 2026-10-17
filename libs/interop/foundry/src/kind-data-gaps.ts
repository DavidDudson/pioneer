import { RuleElement } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import type { FoundryLinks } from './enricher-context';
import type { EntryReferences } from './entry-references';
import type { FoundryDocument } from './foundry-document';
import type { FoundryLang, FoundryPack } from './foundry-release';
import type { ImportedEnvelope } from './imported-envelope';
import type { ArchetypeLink } from './translate-archetype';
import type { FoundrySenses } from './translate-senses';

/** What a kind translator could not carry over from a document, reported against its entry. */

export const KindDataGapReason = {
  /** A `system` field the kind's schema has no place for. */
  UnmappedField: 'unmapped-field',
  /** A value the importer has no mapping for (an action type, a frequency period). */
  UnmappedValue: 'unmapped-value',
  /** Text with markup or enrichers, left for the rich text stories. */
  NeedsRichText: 'needs-rich-text',
  /** A UUID or slug naming none of the selected documents (references to other packs do not resolve yet). */
  UnresolvedReference: 'unresolved-reference',
  /** The data as translated fails the kind's schema; the entry has no data. */
  InvalidData: 'invalid-data',
} as const;
export type KindDataGapReason = ValueOf<typeof KindDataGapReason>;

export interface GapFields {
  readonly reason: KindDataGapReason;
  /** The `system` field, dotted (`frequency.per`), or the data field the schema rejected. */
  readonly field: string;
  readonly raw: unknown;
}

export interface KindDataGap extends GapFields {
  readonly entry: ContentId;
}

/** One entry's gaps, collected while its data is built. */
export interface GapLog {
  readonly entry: ContentId;
  readonly gaps: KindDataGap[];
}

/**
 * What a kind translator reads: the document, its envelope as translated, the import's references, and the log;
 * and where it puts the rule elements its fields add.
 */
export interface KindInput {
  readonly document: FoundryDocument;
  /** The pack it comes from, which is all that says what an effect is about. */
  readonly pack: FoundryPack;
  readonly envelope: ImportedEnvelope;
  readonly references: EntryReferences;
  readonly log: GapLog;
  readonly rules: RuleElement[];
  /** The archetypes whose journal pages link each feat (`importArchetypes`). */
  readonly archetypes: ReadonlyMap<ContentId, readonly ArchetypeLink[]>;
  /** What each Foundry sense fixes; without it a feat's senses keep the acuity and range they give. */
  readonly senses?: FoundrySenses;
  /** Foundry's English lang table, for the `@Localize` text of an embedded item; without it keys stay unresolved. */
  readonly lang?: FoundryLang;
  /** What links in rich text fields resolve against (`foundryLinks`); without them every link stays text. */
  readonly links?: FoundryLinks;
}

export function report(log: GapLog, gap: GapFields): void {
  log.gaps.push({ entry: log.entry, ...gap });
}

/**
 * `system` fields every kind reads elsewhere: the envelope's, Foundry's migration stamp, and the description, which
 * the rich text stories translate.
 */
export const ENVELOPE_FIELDS: readonly string[] = [
  'description',
  'publication',
  'rules',
  'slug',
  'traits',
  'level',
  '_migration',
];

/** A value Foundry leaves at its default says nothing, so only set fields are reported as unmapped. */
export function isSet(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some((each) => isSet(each));
  }
  return value !== null && value !== undefined && value !== false && value !== '';
}

/** Reports each set `system` field outside `handled`. */
function reportUnmapped(system: Readonly<Record<string, unknown>>, handled: ReadonlySet<string>, log: GapLog): void {
  for (const [field, value] of Object.entries(system)) {
    if (!handled.has(field) && isSet(value)) {
      report(log, { reason: KindDataGapReason.UnmappedField, field, raw: value });
    }
  }
}

/**
 * Adds a rule element a kind's field stands for (a class's starting proficiency), once it parses; one that does
 * not is reported against `field`, so a mapping bug never drops it silently.
 */
export function addRule({ rules, log }: KindInput, field: string, raw: object): void {
  const element = RuleElement.safeParse(raw);
  if (element.success) {
    rules.push(element.data);
  } else {
    report(log, { reason: KindDataGapReason.InvalidData, field, raw });
  }
}

/** The path of the first issue a schema raised, dotted. */
export function issuePath(error: z.ZodError): string {
  return error.issues[0]?.path.join('.') ?? '';
}

/** How one kind's data is built: the schema it must meet, the `system` fields it reads, and the builder. */
export interface KindBuilder<Data> {
  readonly schema: z.ZodType<Data>;
  readonly fields: ReadonlySet<string>;
  readonly build: (input: KindInput) => object | undefined;
}

/** The data `build` makes, parsed against `schema`; reported and undefined when the schema rejects it. */
export function parsedWith<Data>({ schema, fields, build }: KindBuilder<Data>, input: KindInput): Data | undefined {
  reportUnmapped(input.document.system, fields, input.log);
  const data = build(input);
  const parsed = data === undefined ? undefined : schema.safeParse(data);
  if (parsed?.success === false) {
    report(input.log, { reason: KindDataGapReason.InvalidData, field: issuePath(parsed.error), raw: data });
  }
  return parsed?.success === true ? parsed.data : undefined;
}
