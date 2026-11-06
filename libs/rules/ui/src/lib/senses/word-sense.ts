import type { TranslocoService } from '@jsverse/transloco';
import type { LocaleFormat } from '@pioneer/frontier';
import type { SenseInPlay } from '@pioneer/rules/engine';
import type { ContentId } from '@pioneer/rules/sdk';

import { ACUITY_MESSAGES, SensesMessage } from './senses-messages';
import type { ShownSense } from './shown-senses';

/** What wording a sense needs: the translator, the number format, and the display names of the entries. */
export interface SenseWords {
  readonly i18n: TranslocoService;
  readonly format: LocaleFormat;
  readonly names: ReadonlyMap<ContentId, string>;
}

/** `translate` returns `any`; this pins it to the string it is. */
function say(i18n: TranslocoService, key: string, params?: Readonly<Record<string, string>>): string {
  return i18n.translate(key, params);
}

/** A sense as the panel words it: "Darkvision (precise)", marked "from <form>" when a battle form gives it. */
export function wordSense({ sense, acuity, range, origins, fromForm }: SenseInPlay, words: SenseWords): ShownSense {
  const { i18n, format, names } = words;
  const text = say(i18n, SensesMessage.Sense, {
    name: names.get(sense) ?? sense,
    acuity: say(i18n, ACUITY_MESSAGES[acuity]),
    hasRange: range === undefined ? 'no' : 'yes',
    range: range === undefined ? '' : format.number(range),
  });
  const form = origins[0] === undefined ? undefined : names.get(origins[0].entry);
  return {
    text,
    fromForm:
      fromForm === true
        ? say(i18n, SensesMessage.FromForm, { form: form ?? say(i18n, SensesMessage.UnnamedForm) })
        : undefined,
    origins,
  };
}
