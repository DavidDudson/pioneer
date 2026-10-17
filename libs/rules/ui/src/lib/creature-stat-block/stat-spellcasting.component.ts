import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { List, ListItem, Stack, Text } from '@pioneer/frontier';

import { RichRef } from '../rich-text/rich-ref/rich-ref.component';
import type { SpellcastingLine } from './creature-stat-block';

/** The spellcasting entries of a stat block: tradition and way of casting, the DC, and the spells by rank. */
@Component({
  selector: 'pio-stat-spellcasting',
  imports: [List, ListItem, RichRef, Stack, Text],
  templateUrl: './stat-spellcasting.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatSpellcastingView {
  public readonly entries = input.required<readonly SpellcastingLine[]>();
}
