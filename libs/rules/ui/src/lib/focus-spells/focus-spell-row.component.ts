import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Stack, Text } from '@pioneer/frontier';

import { UseButtons } from '../actions/use-buttons.component';
import { ContentPreview } from '../entry-preview/content-preview.component';
import { SpellDetails } from '../spell-list/spell-details.component';
import type { FocusSpellLine } from './focus-spells-line';

/**
 * One focus spell: its details at the focus rank when the caller worded them (#484), otherwise its name with a badge per
 * tag, as message keys ("Cantrip").
 */
@Component({
  selector: 'pio-focus-spell-row',
  imports: [Badge, ContentPreview, SpellDetails, Stack, Text, TranslocoPipe, UseButtons],
  templateUrl: './focus-spell-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusSpellRow {
  public readonly spell = input.required<FocusSpellLine>();
  public readonly tags = input<readonly string[]>([]);
}
