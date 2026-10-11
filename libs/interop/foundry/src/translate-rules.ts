import { ContentKind, RuleElement, RuleElementKey } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { NO_REFERENCES, resolveUuid } from './entry-references';
import type { EntryReferences } from './entry-references';
import { fromFoundryFormula } from './foundry-formula';

/**
 * An entry's Foundry rule elements, each run through `RuleElement`. One that fails is kept aside with its raw JSON
 * for the backlog, and the entry is imported without it.
 */

/** A Foundry rule element `RuleElement` rejects: the backlog item Epic 2.6 (#21) works through. */
export interface UntranslatedRule {
  readonly entry: ContentId;
  /** The element's `key`, or empty when it has none. */
  readonly key: string;
  /** The element as Foundry wrote it. */
  readonly raw: unknown;
}

function keyOf(raw: unknown): string {
  if (typeof raw !== 'object' || raw === null || !('key' in raw)) {
    return '';
  }
  return typeof raw.key === 'string' ? raw.key : '';
}

/** `raw` with a string `value` in Pioneer's reference spelling, the only formula field the envelope's elements share. */
function withPioneerFormula(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('value' in raw) || typeof raw.value !== 'string') {
    return raw;
  }
  return { ...raw, value: fromFoundryFormula(raw.value) };
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
function isDerivedGrant(deletes: unknown, item: ContentId, references: EntryReferences): boolean {
  const actions = FoundryDeleteActions.safeParse(deletes);
  if (!actions.success) {
    return false;
  }
  const kind = references.kinds.get(item);
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
function withGrantedId(raw: unknown, references: EntryReferences): unknown {
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

export interface RuleTranslation {
  readonly rules: readonly RuleElement[];
  readonly untranslated: readonly UntranslatedRule[];
}

export function translateRules(
  entry: ContentId,
  raws: readonly unknown[],
  references: EntryReferences = NO_REFERENCES,
): RuleTranslation {
  const rules: RuleElement[] = [];
  const untranslated: UntranslatedRule[] = [];
  for (const raw of raws) {
    const element = RuleElement.safeParse(withGrantedId(withPioneerFormula(raw), references));
    if (element.success) {
      rules.push(element.data);
    } else {
      untranslated.push({ entry, key: keyOf(raw), raw });
    }
  }
  return { rules, untranslated };
}
