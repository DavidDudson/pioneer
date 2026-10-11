import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DescriptionItem, DescriptionList, Heading, Stack, Text } from '@pioneer/frontier';
import type { SpellSlots } from '@pioneer/rules/engine';

import { SpellcastingMessage } from '../spellcasting-messages';

/**
 * One list of spell slots under a title (ADR-0041): its cantrips, then how many slots of each rank ("3rd rank 2").
 * Renders nothing when there are neither, as for an innate entry.
 *
 * ```html
 * <pio-spell-slots [title]="'rules.spellcasting.slots' | transloco" [slots]="entry.slots" />
 * ```
 */
@Component({
  selector: 'pio-spell-slots',
  imports: [DescriptionItem, DescriptionList, Heading, Stack, Text, TranslocoPipe],
  templateUrl: './spell-slots.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellSlotsView {
  public readonly title = input.required<string>();
  public readonly slots = input.required<SpellSlots>();

  protected readonly Message = SpellcastingMessage;
  protected readonly empty = computed(() => this.slots().cantrips === undefined && this.slots().ranks.length === 0);
}
