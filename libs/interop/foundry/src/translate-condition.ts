import { ConditionGroup, ContentKind, RuleElementKey } from '@pioneer/rules/sdk';
import type { ContentId, RuleElement } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { resolveFoundrySlug } from './entry-references';
import type { EntryReferences } from './entry-references';
import { FoundryItemType } from './foundry-document';
import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog, KindInput } from './kind-data-gaps';

/**
 * A condition's `data` from Foundry's `condition` item. `implies` is read from the entry's translated rules, where
 * Foundry's implied conditions are `GrantItem`s, so it lists exactly what the rules grant.
 */

/** A condition's instance state on an actor, and Foundry's derived back links: nothing a condition entry holds. */
const CONDITION_STATE_FIELDS = ['active', 'duration', 'references', 'removable'];

export const CONDITION_FIELDS: ReadonlySet<string> = new Set([
  ...ENVELOPE_FIELDS,
  ...CONDITION_STATE_FIELDS,
  'value',
  'group',
  'overrides',
]);

const FIELD_MAX = 64;
const OVERRIDES_MAX = 64;

const FoundryConditionSystem = z.looseObject({
  value: z.looseObject({ isValued: z.boolean() }),
  group: z.string().max(FIELD_MAX).nullish(),
  overrides: z.array(z.string().max(FIELD_MAX)).max(OVERRIDES_MAX).default([]),
});

const ConditionGroupSchema = z.enum(ConditionGroup);

function groupOf(group: string | null | undefined, log: GapLog): ConditionGroup | undefined {
  if (group === null || group === undefined) {
    return undefined;
  }
  const known = ConditionGroupSchema.safeParse(group);
  if (!known.success) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'group', raw: group });
  }
  return known.data;
}

function overridesOf(slugs: readonly string[], references: EntryReferences, log: GapLog): ContentId[] {
  return slugs.flatMap((slug) => {
    const id = resolveFoundrySlug(references, FoundryItemType.Condition, slug);
    if (id === undefined) {
      report(log, { reason: KindDataGapReason.UnresolvedReference, field: 'overrides', raw: slug });
      return [];
    }
    return [id];
  });
}

/** Conditions the entry grants whatever the situation: Foundry's implied conditions, now granted by content id. */
function impliedConditions(rules: readonly RuleElement[], references: EntryReferences): ContentId[] {
  return rules.flatMap((rule) =>
    rule.key === RuleElementKey.GrantItem &&
    rule.predicate === undefined &&
    typeof rule.item === 'string' &&
    references.kinds.get(rule.item) === ContentKind.Condition
      ? [rule.item]
      : [],
  );
}

/** The condition's data, unparsed; undefined when its `system` is not shaped as a condition's. */
export function conditionData({ document, envelope, references, log }: KindInput): object | undefined {
  const system = FoundryConditionSystem.safeParse(document.system);
  if (!system.success) {
    report(log, { reason: KindDataGapReason.InvalidData, field: '', raw: z.prettifyError(system.error) });
    return undefined;
  }
  const { value, group, overrides } = system.data;
  const known = groupOf(group, log);
  return {
    valued: value.isValued,
    ...(known === undefined ? {} : { group: known }),
    overrides: overridesOf(overrides, references, log),
    implies: impliedConditions(envelope.rules, references),
  };
}
