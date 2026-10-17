import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Stack, Text } from '@pioneer/frontier';

import { RichRef } from '../rich-text/rich-ref/rich-ref.component';
import type { ItemLine } from './creature-stat-block';
import { CreatureStatBlockMessage } from './creature-stat-block-messages';

/** The items a creature carries, linked to their entries. */
@Component({
  selector: 'pio-stat-items',
  imports: [RichRef, Stack, Text, TranslocoPipe],
  templateUrl: './stat-items.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatItemsView {
  public readonly items = input.required<readonly ItemLine[]>();

  protected readonly Message = CreatureStatBlockMessage;
}
