import { DAMAGE_TYPE_KEYS } from '@pioneer/play/ui';
import type { SizeInPlay, VitalsInPlay } from '@pioneer/rules/engine';
import { FastHealingType } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { SIZE_MESSAGES } from '@pioneer/rules/ui';

/** A line of what rule elements give besides Hit Points, as message keys the view translates. */
export interface GrantedLine {
  /** The message of the line, which reads `amount`, `reach` and `size` as its parameters. */
  readonly key: string;
  readonly amount?: number;
  readonly reach?: number;
  /** The message key of the size's name. */
  readonly size?: string;
  /** When a battle form sets the size: the form's entry, and the message key of the character's own size. */
  readonly form?: { readonly entry: ContentId; readonly own: string };
  /** The message keys of the damage types that switch it off. */
  readonly stoppedBy: readonly string[];
}

const FAST_HEALING_KEY = 'character.sheet.hp.fastHealing';
const REGENERATION_KEY = 'character.sheet.hp.regeneration';
const TEMP_KEY = 'character.sheet.hp.grantedTemp';
const SIZE_KEY = 'character.sheet.hp.size';
const FORM_SIZE_KEY = 'character.sheet.hp.sizeFromForm';

/** The lines for the fast healing, temporary Hit Points and size the character's rule elements give. */
export function grantedLines({ recovery, temporaryHitPoints, size }: VitalsInPlay): readonly GrantedLine[] {
  return [
    ...recovery.map(({ type, amount, deactivatedBy }): GrantedLine => ({
      key: type === FastHealingType.Regeneration ? REGENERATION_KEY : FAST_HEALING_KEY,
      amount,
      stoppedBy: deactivatedBy.map((damage) => DAMAGE_TYPE_KEYS[damage]),
    })),
    ...(temporaryHitPoints === undefined
      ? []
      : [{ key: TEMP_KEY, amount: temporaryHitPoints.amount, stoppedBy: [] } satisfies GrantedLine]),
    ...(size === undefined ? [] : [sizeLine(size)]),
  ];
}

/** The size line: with the form that sets it and the character's own size, when a battle form does. */
function sizeLine({ size, base, reach, form }: SizeInPlay): GrantedLine {
  const line = { size: SIZE_MESSAGES[size], reach, stoppedBy: [] };
  return form === undefined
    ? { ...line, key: SIZE_KEY }
    : { ...line, key: FORM_SIZE_KEY, form: { entry: form.entry, own: SIZE_MESSAGES[base] } };
}
