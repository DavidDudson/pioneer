import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Stack, Text } from '@pioneer/frontier';
import type { AttributeBoost } from '@pioneer/rules/sdk';

import { ATTRIBUTE_MESSAGES } from '../../attributes/attributes-messages';
import { PickerCellMessage } from '../picker-cell-messages';

const ATTRIBUTE_TOTAL = Object.keys(ATTRIBUTE_MESSAGES).length;

/**
 * The attribute boosts an ancestry, background or class gives: one badge per boost, naming the attribute or the
 * choice ("Strength or Dexterity"). A boost open to every attribute reads "Free boost".
 *
 * ```html
 * <pio-attribute-boosts [boosts]="ancestry.boosts" />
 * ```
 */
@Component({
  selector: 'pio-attribute-boosts',
  imports: [Badge, Stack, Text, TranslocoPipe],
  templateUrl: './attribute-boosts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributeBoosts {
  public readonly boosts = input.required<readonly AttributeBoost[]>();

  protected readonly Message = PickerCellMessage;
  protected readonly names = ATTRIBUTE_MESSAGES;
  protected readonly shown = computed(() =>
    this.boosts().map((boost) => ({ attributes: boost, free: boost.length === ATTRIBUTE_TOTAL })),
  );
}
