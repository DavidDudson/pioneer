import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, ButtonVariant, LocaleFormat, Size, Skeleton, Stack, Text } from '@pioneer/frontier';
import { Attribute } from '@pioneer/rules/sdk';
import type { AttributeModifier, AttributeModifiers } from '@pioneer/rules/sdk';

import { ATTRIBUTE_MESSAGES, ATTRIBUTE_SHORT_MESSAGES } from '../attributes/attributes-messages';
import { StatisticsMessage } from '../statistics/statistics-messages';

/** A flat check asked for: the attribute's message key, and the modifier added to the d20. */
export interface AttributeRoll {
  readonly name: string;
  readonly modifier: AttributeModifier;
}

/** One row: the attribute's name key and its modifier, unset while the modifiers load. */
interface AttributeRow {
  readonly attribute: Attribute;
  readonly name: string;
  readonly shortName: string;
  readonly modifier: AttributeModifier | undefined;
  readonly label: string;
}

/** A modifier always shows its sign, `+0` included. */
const SIGNED: Intl.NumberFormatOptions = { signDisplay: 'always' };

/**
 * The attributes (six unless `attributes` narrows them) as rows, each its name on the left and its modifier on the right as a button that asks for a
 * flat check: a d20 plus that modifier. Presentational (ADR-0028): the page rolls the dice, this only says which
 * attribute was pressed.
 *
 * ```html
 * <pio-attribute-rolls [modifiers]="modifiers()" (rolled)="roll($event)" />
 * ```
 */
@Component({
  selector: 'pio-attribute-rolls',
  imports: [Button, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './attribute-rolls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributeRolls {
  /** The modifiers the boosts give, or undefined while they load. */
  public readonly modifiers = input<AttributeModifiers | undefined>();
  /** Which attributes to list, in this order; all six by default. */
  public readonly attributes = input<readonly Attribute[]>(Object.values(Attribute));
  /** An attribute's flat check was asked for. */
  public readonly rolled = output<AttributeRoll>();

  readonly #format = inject(LocaleFormat);
  protected readonly Message = StatisticsMessage;
  protected readonly outline = ButtonVariant.OutlineSubtle;
  protected readonly small = Size.Sm;
  protected readonly rows = computed((): readonly AttributeRow[] => {
    const modifiers = this.modifiers();
    return this.attributes().map((attribute) => {
      const modifier = modifiers?.get(attribute);
      return {
        attribute,
        name: ATTRIBUTE_MESSAGES[attribute],
        shortName: ATTRIBUTE_SHORT_MESSAGES[attribute],
        modifier,
        label: modifier === undefined ? '' : this.#format.number(modifier, SIGNED),
      };
    });
  });
}
