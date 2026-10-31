import { ContentKind, RuleElementKey } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { resolveUuid } from './entry-references';
import type { EntryReferences } from './entry-references';
import { kebab } from './foundry-flags';
import { fromFoundryFormula } from './foundry-formula';

/**
 * Foundry's `GrantItem` and `Aura` as Pioneer's: which entry a grant names (by compendium UUID, or by a pick a
 * `ChoiceSet` stored), what it passes on, and the aura an effect makes around its bearer.
 */

function keyOf(raw: unknown): string {
  if (typeof raw !== 'object' || raw === null || !('key' in raw)) {
    return '';
  }
  return typeof raw.key === 'string' ? raw.key : '';
}

const GRANT_FIELDS_REPLACED: ReadonlySet<string> = new Set(['uuid', 'inMemoryOnly', 'onDeleteActions']);

/**
 * Foundry's delete actions, as a derived grant reads them. The granter side decides: `cascade` (the grant goes with
 * its granter) is a derived grant, `detach` (the grantee stays, as Prone after Unconscious) is not, and Foundry
 * defaults to `detach` for a physical item and `cascade` for anything else. The grantee side (`restrict`, `detach`:
 * whether the grantee can be removed alone) has no Pioneer meaning, as a granted entry is never removed alone;
 * `cascade` there (removing the grantee removes its granter) is kept for the backlog.
 */
const FoundryDeleteActions = z
  .strictObject({
    granter: z.enum(['cascade', 'detach', 'restrict']).optional(),
    grantee: z.enum(['cascade', 'detach', 'restrict']).optional(),
  })
  .optional();

/** The kinds Foundry files as physical items, whose grants detach from their granter unless they say otherwise. */
const PHYSICAL_KINDS: ReadonlySet<ContentKind> = new Set([
  ContentKind.Armor,
  ContentKind.Consumable,
  ContentKind.Equipment,
  ContentKind.Shield,
  ContentKind.Treasure,
  ContentKind.Weapon,
]);

/** Whether a grant of `item` with Foundry's `onDeleteActions` goes with its granter and only with it. */
function isDerivedGrant(deletes: unknown, item: ContentId | undefined, references: EntryReferences): boolean {
  const actions = FoundryDeleteActions.safeParse(deletes);
  if (!actions.success) {
    return false;
  }
  const kind = item === undefined ? undefined : references.kinds.get(item);
  const physical = kind !== undefined && PHYSICAL_KINDS.has(kind);
  const granter = actions.data?.granter ?? (physical ? 'detach' : 'cascade');
  return granter === 'cascade' && actions.data?.grantee !== 'cascade';
}

/**
 * A `GrantItem` naming its item by compendium UUID, granting the entry that UUID resolves to instead. Foundry's
 * `inMemoryOnly` (granted without being saved to the actor, as conditions grant theirs) has no Pioneer meaning: a
 * grant is always derived. An unresolved UUID, or delete actions a derived grant lacks, leave it as it is, so the
 * element fails and is kept for the backlog.
 */
export function withGrantedId(raw: unknown, references: EntryReferences): unknown {
  if (keyOf(raw) !== RuleElementKey.GrantItem || typeof raw !== 'object' || raw === null || !('uuid' in raw)) {
    return raw;
  }
  const deletes = 'onDeleteActions' in raw ? raw.onDeleteActions : undefined;
  const item = typeof raw.uuid === 'string' ? resolveUuid(references, raw.uuid) : undefined;
  if (item === undefined || !isDerivedGrant(deletes, item, references)) {
    return raw;
  }
  const rest = Object.entries(raw).filter(([field]) => !GRANT_FIELDS_REPLACED.has(field));
  return { ...Object.fromEntries(rest), item };
}

/**
 * Foundry's alteration of a granted condition's value, `{ mode: override, property: badge-value, value: 2 }`, alone
 * on its grant. A value read from a pick or the item (`{item|...}`, `@item...`) is a string, which this does not take.
 */
const FoundryBadgeValue = z.tuple([
  z.strictObject({ mode: z.literal('override'), property: z.literal('badge-value'), value: z.number() }),
]);

/**
 * A `GrantItem` whose only alteration sets the granted condition's value, as the grant's `value`. Any other
 * alterations leave it as it is, so the element fails and is kept for the backlog.
 */
export function withGrantValue(raw: unknown): unknown {
  if (keyOf(raw) !== RuleElementKey.GrantItem || typeof raw !== 'object' || raw === null || !('alterations' in raw)) {
    return raw;
  }
  const alterations = FoundryBadgeValue.safeParse(raw.alterations);
  if (!alterations.success) {
    return raw;
  }
  const { alterations: _replaced, ...rest } = raw;
  return { ...rest, value: alterations.data[0].value };
}

/** Foundry's grant of a `ChoiceSet`'s pick on the same item: `{item|flags.system.rulesSelections.doctrine}`. */
const SELECTION_UUID = /^\{item\|flags\.system\.rulesSelections\.(?<flag>[A-Za-z0-9]+)\}$/u;

/**
 * A `GrantItem` of a `ChoiceSet`'s pick, as Foundry names it by the pick's flag, granting `{ choice }` under the flag
 * `withTagQuery` gives it, when a `ChoiceSet` of the entry that translated declares that flag; without one the grant
 * would read a pick nothing asks for, so it is left for the backlog with its `ChoiceSet`. Delete actions are read as for
 * a granted id; a pick is no physical item.
 */
export function withChoiceGrant(raw: unknown, references: EntryReferences, declared: ReadonlySet<string>): unknown {
  if (keyOf(raw) !== RuleElementKey.GrantItem || typeof raw !== 'object' || raw === null || !('uuid' in raw)) {
    return raw;
  }
  const flag = typeof raw.uuid === 'string' ? SELECTION_UUID.exec(raw.uuid)?.groups?.['flag'] : undefined;
  const deletes = 'onDeleteActions' in raw ? raw.onDeleteActions : undefined;
  const choice = flag === undefined ? undefined : kebab(flag);
  if (choice === undefined || !declared.has(choice) || !isDerivedGrant(deletes, undefined, references)) {
    return raw;
  }
  const rest = Object.entries(raw).filter(([field]) => !GRANT_FIELDS_REPLACED.has(field));
  return { ...Object.fromEntries(rest), item: { choice } };
}

/** Foundry's `GrantItem` fields that only steer its sheet, or that Pioneer's derived grants do by themselves. */
const GRANT_SHEET_FIELDS: ReadonlySet<string> = new Set(['nestUnderGranter', 'reevaluateOnUpdate']);

/** A `preselectChoices`: the flag of the granted entry's `ChoiceSet`, and the value it starts with, per choice. */
const FoundryPreselected = z.record(z.string(), z.unknown());

/**
 * A `GrantItem` with its `flag` and the flags of its `preselectChoices` as `choices` in Pioneer's spelling (a slug), and without `nestUnderGranter`
 * (where the sheet files the granted item) and `reevaluateOnUpdate` (a Pioneer grant always follows its predicate);
 * any other element as it is.
 */
export function withGrantFields(raw: unknown): unknown {
  if (keyOf(raw) !== RuleElementKey.GrantItem || typeof raw !== 'object' || raw === null) {
    return raw;
  }
  const fields = Object.entries(raw)
    .filter(([field]) => !GRANT_SHEET_FIELDS.has(field))
    .map(([field, value]): [string, unknown] => [
      field,
      field === 'flag' && typeof value === 'string' ? kebab(value) : value,
    ]);
  const preselected = FoundryPreselected.safeParse('preselectChoices' in raw ? raw.preselectChoices : undefined);
  if (!preselected.success) {
    return Object.fromEntries(fields);
  }
  const rest = fields.filter(([field]) => field !== 'preselectChoices');
  const choices = Object.entries(preselected.data).map(([flag, value]): [string, unknown] => [kebab(flag), value]);
  return { ...Object.fromEntries(rest), choices: Object.fromEntries(choices) };
}

/** An aura effect as Foundry writes it: the effect by compendium UUID, with who it reaches and when. */
const FoundryAuraEffect = z.looseObject({ uuid: z.string() });

/**
 * An `Aura` with its `radius` formula in Pioneer's reference spelling and each effect's `uuid` as the entry it
 * resolves to, `effect`. An effect that does not resolve leaves the aura as it is, so the element fails and is kept
 * for the backlog; any other element as it is.
 */
export function withAura(raw: unknown, references: EntryReferences): unknown {
  if (keyOf(raw) !== RuleElementKey.Aura || typeof raw !== 'object' || raw === null) {
    return raw;
  }
  const radius = 'radius' in raw && typeof raw.radius === 'string' ? fromFoundryFormula(raw.radius) : undefined;
  const effects = 'effects' in raw ? resolvedEffects(raw.effects, references) : undefined;
  return {
    ...raw,
    ...(radius === undefined ? {} : { radius }),
    ...(effects === undefined ? {} : { effects }),
  };
}

/** An aura's effects with each `uuid` as the entry it resolves to; undefined when any does not, or it is no list. */
function resolvedEffects(listed: unknown, references: EntryReferences): readonly object[] | undefined {
  if (!Array.isArray(listed)) {
    return undefined;
  }
  const effects: object[] = [];
  for (const each of listed as readonly unknown[]) {
    const parsed = FoundryAuraEffect.safeParse(each);
    const effect = parsed.success ? resolveUuid(references, parsed.data.uuid) : undefined;
    if (!parsed.success || effect === undefined) {
      return undefined;
    }
    const { uuid: _replaced, ...rest } = parsed.data;
    effects.push({ effect, ...rest });
  }
  return effects;
}
