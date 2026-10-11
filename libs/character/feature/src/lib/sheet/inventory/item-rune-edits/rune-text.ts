import type { TranslocoService } from '@jsverse/transloco';
import type { RunedContent, RuneRef } from '@pioneer/character/domain';
import { FundamentalRune, RuneType } from '@pioneer/rules/sdk';
import { GRADED_RUNE_MESSAGES, RuneMessage } from '@pioneer/rules/ui';
import { ApiError } from '@pioneer/shared/web';

/** A grade as the rules name it: "+2" for potency, "Greater Striking" for the rest. */
export function gradeLabel(i18n: TranslocoService, rune: FundamentalRune, grade: number): string {
  return rune === FundamentalRune.Potency
    ? i18n.translate(RuneMessage.Potency, { grade })
    : i18n.translate(GRADED_RUNE_MESSAGES[rune], { grade });
}

/** A rune etched onto an item, by name: its grade for a fundamental one, its content's name for a property one. */
export function runeLabel(
  i18n: TranslocoService,
  { runes }: RunedContent,
  { rune, grade }: { readonly rune: RuneRef; readonly grade: number | undefined },
): string {
  if (rune.type === RuneType.Property) {
    return runes.get(rune.rune)?.name ?? i18n.translate('character.sheet.runes.unknownRune');
  }
  return grade === undefined ? rune.rune : gradeLabel(i18n, rune.rune, grade);
}

/** The server's reason a rune edit was refused, else the sheet's own wording. */
export function describeRuneError(i18n: TranslocoService, error: unknown): string {
  const [issue] = error instanceof ApiError ? error.issues : [];
  return issue === undefined
    ? i18n.translate('character.sheet.runes.failed')
    : i18n.translate(issue.message.key, issue.message.params);
}
