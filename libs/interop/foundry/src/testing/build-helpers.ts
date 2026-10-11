import { RuleElementKey, slugName } from '@pioneer/rules/sdk';
import type { ContentKind } from '@pioneer/rules/sdk';

import type { ImportedEntry, ImportTranslation } from '../translate-import';
import { entryOf } from './kind-fixtures';

/** Readers for what the import made of the build fixtures, untyped so tests compare them with plain objects. */

/** The entry of `kind` whose slug names `name`, as tests read it. */
export function entryOfKind(
  translation: ImportTranslation,
  kind: ContentKind,
  name: string,
): ImportedEntry | undefined {
  return translation.entries.find(
    ({ envelope, kindData }) => kindData?.kind === kind && slugName(envelope.slug) === name,
  );
}

/** The entry's kind data, untyped, for comparing with plain objects. */
export function kindDataOf(translation: ImportTranslation, name: string): unknown {
  return entryOf(translation, name)?.kindData;
}

export function dataIn(translation: ImportTranslation, name: string): unknown {
  return entryOf(translation, name)?.kindData?.data;
}

export function rulesIn(translation: ImportTranslation, name: string): unknown[] {
  return [...(entryOf(translation, name)?.envelope.rules ?? [])];
}

export function slugIn(translation: ImportTranslation, name: string): string {
  return String(entryOf(translation, name)?.envelope.slug);
}

/** Each `Proficiency` element as its selector and rank. */
export function ranksIn(translation: ImportTranslation, name: string): string[][] {
  return (entryOf(translation, name)?.envelope.rules ?? []).flatMap((rule) =>
    rule.key === RuleElementKey.Proficiency ? [[String(rule.selector), rule.rank]] : [],
  );
}

/** The rules besides `Proficiency` elements. */
export function grantsIn(translation: ImportTranslation, name: string): unknown[] {
  return rulesIn(translation, name).filter(
    (rule) => typeof rule === 'object' && rule !== null && 'key' in rule && rule.key !== RuleElementKey.Proficiency,
  );
}

/** Each gap as `<reason> <field>`. */
export function gapKeys({ kindDataGaps }: ImportTranslation): string[] {
  return kindDataGaps.map(({ reason, field }) => `${reason} ${field}`);
}
