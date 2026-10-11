import { AttributeSchema, ContentKind, RuleElementKey, Size } from '@pioneer/rules/sdk';
import type { Attribute } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { resolveUuid } from './entry-references';
import { addRule, KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog, KindInput } from './kind-data-gaps';

/** Foundry `system` shapes and translations the build kinds share: boosts, granted items, level predicates. */

const FIELD_MAX = 64;
const NAME_MAX = 500;
const ENTRIES_MAX = 64;
const LEVEL_MAX = 20;

/** Foundry's sizes, by its abbreviation: an ancestry's, and a physical item's. */
export const FOUNDRY_SIZES: ReadonlyMap<string, Size> = new Map([
  ['tiny', Size.Tiny],
  ['sm', Size.Small],
  ['med', Size.Medium],
  ['lg', Size.Large],
  ['huge', Size.Huge],
  ['grg', Size.Gargantuan],
]);

/** Most entries any Foundry record the build kinds read holds: a kit's items, a class's features, a deity's spells. */
const RECORD_ENTRIES_MAX = 128;

/** A Foundry record keyed by a short id or number, its size bounded like every other collection the importer reads. */
export function boundedRecord<Value extends z.ZodType>(value: Value): z.ZodType<Record<string, z.infer<Value>>> {
  return z
    .record(z.string().max(FIELD_MAX), value)
    .refine((record) => Object.keys(record).length <= RECORD_ENTRIES_MAX, { message: 'too many entries' });
}

/** Foundry's attribute slots, keyed `"0"`, `"1"` and so on: `{ "0": { "value": ["dex"] } }`. */
const FoundryAttributeSlot = z.looseObject({ value: z.array(z.string().max(FIELD_MAX)).max(ENTRIES_MAX) });
export const FoundryAttributeSlots = boundedRecord(FoundryAttributeSlot);
export type FoundryAttributeSlots = z.infer<typeof FoundryAttributeSlots>;

/** An item Foundry grants by compendium UUID (an ancestry feature, a class feature, a background's skill feat). */
const FoundryGrantedItem = z.looseObject({
  uuid: z.string().max(NAME_MAX),
  name: z.string().max(NAME_MAX).optional(),
  // A few documents write the level as text ("1").
  level: z.coerce.number().int().min(0).max(LEVEL_MAX).optional(),
});

/** Foundry's `items`: what an ancestry, background or class grants, keyed by a random id. */
export const FoundryGrantedItems = boundedRecord(FoundryGrantedItem);
export type FoundryGrantedItems = z.infer<typeof FoundryGrantedItems>;

/** The `system` parsed as a kind reads it; reported and undefined when it is not shaped as that kind's. */
export function systemOf<System>(schema: z.ZodType<System>, { document, log }: KindInput): System | undefined {
  const system = schema.safeParse(document.system);
  if (!system.success) {
    report(log, { reason: KindDataGapReason.InvalidData, field: '', raw: z.prettifyError(system.error) });
  }
  return system.data;
}

/** The slots in Foundry's order (by key as a number), each the attributes it may go to; unknown ones reported. */
export function attributeSlots(slots: FoundryAttributeSlots, field: string, log: GapLog): Attribute[][] {
  return Object.entries(slots)
    .toSorted(([left], [right]) => Number(left) - Number(right))
    .map(([key, { value }]) =>
      value.flatMap((each) => {
        const attribute = AttributeSchema.safeParse(each);
        if (!attribute.success) {
          report(log, { reason: KindDataGapReason.UnmappedValue, field: `${field}.${key}`, raw: each });
        }
        return attribute.success ? [attribute.data] : [];
      }),
    )
    .filter((attributes) => attributes.length > 0);
}

/** First level every character has; a grant from it needs no level predicate. */
const FIRST_LEVEL = 1;

/** `{ "gte": ["self:level", level] }` for a level above 1st, as the element's predicate; nothing at 1st or below. */
function fromLevel(level: number | undefined): object {
  return level === undefined || level <= FIRST_LEVEL ? {} : { predicate: [{ gte: ['self:level', level] }] };
}

/**
 * A `GrantItem` per item Foundry grants, from the level it arrives at, in level then name order. An item whose UUID
 * names no entry is reported against `field`.
 */
export function grantItems(items: FoundryGrantedItems, field: string, input: KindInput): void {
  const ordered = Object.values(items).toSorted(
    (left, right) => (left.level ?? 0) - (right.level ?? 0) || (left.name ?? '').localeCompare(right.name ?? ''),
  );
  for (const { uuid, level } of ordered) {
    const item = resolveUuid(input.references, uuid);
    if (item === undefined) {
      report(input.log, { reason: KindDataGapReason.UnresolvedReference, field, raw: uuid });
    } else {
      addRule(input, field, { key: RuleElementKey.GrantItem, item, ...fromLevel(level) });
    }
  }
}

/** A kind of feat slot: its flag prefix, the trait its feats have, its prompt, and the field its levels come from. */
export interface FeatSlot {
  readonly slot: string;
  readonly trait: string;
  readonly prompt: string;
  readonly field: string;
}

/**
 * A feat slot at each level: a `ChoiceSet` of feats with the trait, of the character's level or lower, and the
 * `GrantItem` of the pick, both from that level. Each flag names its level (`class-feat-2`), so picks keep their
 * slot however the levels change.
 */
export function featSlots({ slot, trait, prompt, field }: FeatSlot, levels: readonly number[], input: KindInput): void {
  for (const level of levels) {
    const flag = `${slot}-${level}`;
    const filter = [`item:trait:${trait}`, { lte: ['item:level', 'self:level'] }];
    const choices = { kind: ContentKind.Feat, filter };
    addRule(input, field, { key: RuleElementKey.ChoiceSet, flag, prompt, choices, ...fromLevel(level) });
    addRule(input, field, { key: RuleElementKey.GrantItem, item: { choice: flag }, ...fromLevel(level) });
  }
}

/** Only the set fields of `fields`, so an absent optional field stays absent. */
export function setFields(fields: Readonly<Record<string, unknown>>): object {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}
