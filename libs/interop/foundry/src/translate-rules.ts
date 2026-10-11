import { RuleElement } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

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

export interface RuleTranslation {
  readonly rules: readonly RuleElement[];
  readonly untranslated: readonly UntranslatedRule[];
}

export function translateRules(entry: ContentId, raws: readonly unknown[]): RuleTranslation {
  const rules: RuleElement[] = [];
  const untranslated: UntranslatedRule[] = [];
  for (const raw of raws) {
    const element = RuleElement.safeParse(withPioneerFormula(raw));
    if (element.success) {
      rules.push(element.data);
    } else {
      untranslated.push({ entry, key: keyOf(raw), raw });
    }
  }
  return { rules, untranslated };
}
