import { RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { slugify } from './foundry-slug';

/** Foundry's damage for a `Strike` of its own: `{ base: { damageType, die, dice } }`, `dice` defaulting to 1. */
const FoundryStrikeDamage = z.strictObject({
  base: z.strictObject({
    damageType: z.string(),
    die: z.string().optional(),
    dice: z.number().int().nonnegative().optional(),
  }),
});

/**
 * A `Strike` that defines an attack of its own (claws, jaws), with its damage as Pioneer reads it: Foundry's
 * `damage.base` read out into `damage`, `dice` set to 1 when Foundry leaves it out. Its other fields (`slug`,
 * `category`, `group`, `range`, `traits`, the base `label`) are the same in both. The fist form, and a `Strike`
 * whose damage is shaped any other way (a `replaceAll`, a second damage part), is left as it is, so the element
 * fails and is kept for the backlog.
 */
export function withStrikeDamage(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== RuleElementKey.Strike) {
    return raw;
  }
  const damage = 'damage' in raw ? FoundryStrikeDamage.safeParse(raw.damage) : undefined;
  if (damage === undefined || !damage.success) {
    return raw;
  }
  const { base } = damage.data;
  const { damageType, die, dice = 1 } = base;
  return { ...raw, damage: { dice, ...(die === undefined ? {} : { die }), damageType } };
}

/** The fields of Foundry's `Strike` that mean nothing to Pioneer's: what a weapon is based on, its tags and its token image. */
const STRIKE_FIELDS_DROPPED: ReadonlySet<string> = new Set(['baseType', 'img', 'otherTags']);

/** Foundry's range for an attack of its own: `null` for a melee one, or `{ increment }` for a ranged one. */
const FoundryStrikeRange = z.strictObject({ increment: z.number() });

/**
 * The name Foundry gives an attack of its own: its `slug`, else its base type (`claw`), else its display label (already in
 * English), as Foundry's own default does. None for an attack with neither.
 */
function strikeSlug(raw: object): string | undefined {
  if ('slug' in raw && typeof raw.slug === 'string') {
    return raw.slug;
  }
  if ('baseType' in raw && typeof raw.baseType === 'string') {
    return raw.baseType;
  }
  const label =
    'display' in raw && typeof raw.display === 'object' && raw.display !== null && 'label' in raw.display
      ? raw.display.label
      : undefined;
  return typeof label === 'string' ? slugify(label) : undefined;
}

/** A `Strike`'s range in Pioneer's spelling: a `null` range is no range, and `{ increment }` is the increment. */
function strikeRange(raw: object): Record<string, unknown> {
  if (!('range' in raw) || raw.range === null) {
    return {};
  }
  const range = FoundryStrikeRange.safeParse(raw.range);
  return { range: range.success ? range.data.increment : raw.range };
}

/**
 * A `Strike` in Pioneer's spelling. It drops the fields Pioneer does not read: `baseType` (the base weapon a Strike
 * counts as, which no favoured-weapon rule reads for an attack a feature gives), `otherTags` and `img` (the image the
 * attack shows on a token). A `null` range is no range, and `{ increment }` the range increment. An attack of its own
 * with no `slug` is named by its base type or label, as Foundry does. The fist form is left as it is.
 */
export function withoutStrikeExtras(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== RuleElementKey.Strike) {
    return raw;
  }
  const kept = Object.fromEntries(
    Object.entries(raw).filter(([field]) => !STRIKE_FIELDS_DROPPED.has(field) && field !== 'range' && field !== 'slug'),
  );
  const slug = 'damage' in raw ? strikeSlug(raw) : undefined;
  return { ...kept, ...strikeRange(raw), ...(slug === undefined ? {} : { slug }) };
}

const READ_FROM_ITEM = '{item|';

/** Whether a Foundry value reads a pick or the item that holds the element, anywhere inside it. */
function readsItem(value: unknown): boolean {
  return JSON.stringify(value).includes(READ_FROM_ITEM);
}

/**
 * Foundry's `AdjustStrike` in Pioneer's spelling (ADR-0008): its `definition`, the roll options of the weapons it
 * reaches (`item:ranged`), becomes the `strikes` predicate. What this cannot carry over is left as it is, so the
 * element fails and is kept for the backlog: one aimed at a roll domain (`selectors`), and any field read from a pick
 * or the item (`{item|...}`), which a Strike cannot be matched to. Any other element is as it was.
 */
export function withStrikeScope(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== RuleElementKey.AdjustStrike) {
    return raw;
  }
  if ('selectors' in raw || readsItem(raw)) {
    return raw;
  }
  const rest = Object.entries(raw).filter(([field]) => field !== 'definition');
  return 'definition' in raw ? { ...Object.fromEntries(rest), strikes: raw.definition } : raw;
}
