import { RuleElement, RuleElementKey } from '@pioneer/rules/sdk';
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
 * Foundry's delete actions a derived grant already has: the grant goes with its granter (`cascade`, the default for an
 * item that is not physical) and cannot be removed alone (`restrict`). Any other (`detach`: the grantee stays when
 * its granter goes, as Prone after Unconscious) has no Pioneer meaning, so the element is kept for the backlog.
 */
const DERIVED_DELETE_ACTIONS = z
  .strictObject({ granter: z.literal('cascade').optional(), grantee: z.literal('restrict').optional() })
  .optional();

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
  if (item === undefined || !DERIVED_DELETE_ACTIONS.safeParse(deletes).success) {
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
