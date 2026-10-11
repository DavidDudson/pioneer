import { ActionData, ConditionData, ContentKind } from '@pioneer/rules/sdk';
import type { DamageTypeData, LanguageData, SenseData, TraitData } from '@pioneer/rules/sdk';

import type { EntryReferences } from './entry-references';
import { FoundryItemType } from './foundry-document';
import { issuePath, KindDataGapReason, report, reportUnmapped } from './kind-data-gaps';
import type { GapLog, KindDataGap, KindInput } from './kind-data-gaps';
import type { SelectedEntry } from './select-entries';
import { ACTION_FIELDS, actionData } from './translate-action';
import { CONDITION_FIELDS, conditionData } from './translate-condition';
import type { ImportedEnvelope } from './translate-envelope';

/**
 * Kind `data` for the rules core kinds the packs hold, actions and conditions, from their Foundry `system` fields
 * (content-model.md, "Rules core data"). A field with no place in the schema, a value with no mapping, and a reference
 * that resolves to nothing are reported against the entry, never guessed; the entry keeps what did translate. Data
 * the schema rejects as a whole is reported and the entry has none.
 */

export type ImportedKindData =
  | { readonly kind: typeof ContentKind.Action; readonly data: ActionData }
  | { readonly kind: typeof ContentKind.Condition; readonly data: ConditionData }
  | { readonly kind: typeof ContentKind.DamageType; readonly data: DamageTypeData }
  | { readonly kind: typeof ContentKind.Language; readonly data: LanguageData }
  | { readonly kind: typeof ContentKind.Sense; readonly data: SenseData }
  | { readonly kind: typeof ContentKind.Trait; readonly data: TraitData };

export interface KindDataTranslation {
  readonly kindData?: ImportedKindData;
  readonly gaps: readonly KindDataGap[];
}

function action(input: KindInput): ImportedKindData | undefined {
  reportUnmapped(input.document.system, ACTION_FIELDS, input.log);
  const data = actionData(input);
  const parsed = data === undefined ? undefined : ActionData.safeParse(data);
  if (parsed?.success === false) {
    report(input.log, { reason: KindDataGapReason.InvalidData, field: issuePath(parsed.error), raw: data });
  }
  return parsed?.success === true ? { kind: ContentKind.Action, data: parsed.data } : undefined;
}

function condition(input: KindInput): ImportedKindData | undefined {
  reportUnmapped(input.document.system, CONDITION_FIELDS, input.log);
  const data = conditionData(input);
  const parsed = data === undefined ? undefined : ConditionData.safeParse(data);
  if (parsed?.success === false) {
    report(input.log, { reason: KindDataGapReason.InvalidData, field: issuePath(parsed.error), raw: data });
  }
  return parsed?.success === true ? { kind: ContentKind.Condition, data: parsed.data } : undefined;
}

const TRANSLATORS: Readonly<Partial<Record<FoundryItemType, (input: KindInput) => ImportedKindData | undefined>>> = {
  [FoundryItemType.Action]: action,
  [FoundryItemType.Condition]: condition,
};

/**
 * The kind data of a translated document, when its Foundry type has a translator (`TRANSLATORS`), with
 * what it could not carry over. Other types get none yet; their kind stories add them.
 */
export function translateKindData(
  { document, type }: SelectedEntry,
  envelope: ImportedEnvelope,
  references: EntryReferences,
): KindDataTranslation {
  const translator = TRANSLATORS[type];
  if (translator === undefined) {
    return { gaps: [] };
  }
  const log: GapLog = { entry: envelope.id, gaps: [] };
  const kindData = translator({ document, envelope, references, log });
  return { ...(kindData === undefined ? {} : { kindData }), gaps: log.gaps };
}
