import type { TranslocoService } from '@jsverse/transloco';
import type { ExtraDice } from '@pioneer/rules/engine';

import { DAMAGE_TYPE_MESSAGES } from '../rich-text/rich-text-messages';
import { DAMAGE_CATEGORY_MESSAGES, StrikesMessage, yesNo } from './strikes-messages';

/** "Plus 1d6 fire precision": the dice a damage element adds to a Strike's damage, worded in the viewer's locale. */
export function extraDiceText(
  i18n: TranslocoService,
  { count, die, damageType, category, critical, ignoresResistance }: ExtraDice,
): string {
  const say = (key: string, params?: Readonly<Record<string, string | number>>): string => i18n.translate(key, params);
  return say(StrikesMessage.ExtraDice, {
    dice: `${count}${die}`,
    type: say(DAMAGE_TYPE_MESSAGES[damageType]),
    hasCategory: category === undefined ? 'no' : 'yes',
    category: category === undefined ? '' : say(DAMAGE_CATEGORY_MESSAGES[category]),
    ...yesNo({ critical, ignoresResistance }),
  });
}
