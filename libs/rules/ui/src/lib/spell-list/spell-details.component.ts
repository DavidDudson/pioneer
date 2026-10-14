import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Stack, Text } from '@pioneer/frontier';

import { EntryHover } from '../entry-preview/entry-hover.component';
import type { SpellDetailLine } from './spell-detail-line';
import { SpellFields } from './spell-fields.component';
import { SpellListMessage } from './spell-list-messages';

/**
 * A spell at the rank it is cast (#484): its name, hover preview and tags, what casting costs in action glyphs, then its
 * range, area, targets, defence, damage or healing and duration, every one read from the spell's structured fields and
 * heightened to the cast rank. A spell with variants lists each under its name.
 *
 * Read-only and presentational (ADR-0028): the caller words the fields.
 *
 * ```html
 * <pio-spell-details [spell]="line" />
 * ```
 */
@Component({
  selector: 'pio-spell-details',
  imports: [Badge, EntryHover, SpellFields, Stack, Text, TranslocoPipe],
  templateUrl: './spell-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpellDetails {
  public readonly spell = input.required<SpellDetailLine>();

  protected readonly Message = SpellListMessage;
}
