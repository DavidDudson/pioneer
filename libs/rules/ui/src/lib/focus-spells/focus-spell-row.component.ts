import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Stack, Text } from '@pioneer/frontier';

import { UseButtons } from '../actions/use-buttons.component';
import { ContentPreview } from '../entry-preview/content-preview.component';
import { SpellRow } from '../spell-row/spell-row.component';
import type { FocusSpellLine } from './focus-spells-line';

/**
 * One focus spell as a compact spell row (`pio-spell-row`) when the caller worded it (#484), otherwise its name with a badge per
 * tag, as message keys ("Cantrip").
 */
@Component({
  selector: 'pio-focus-spell-row',
  imports: [Badge, ContentPreview, SpellRow, Stack, Text, TranslocoPipe, UseButtons],
  templateUrl: './focus-spell-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusSpellRow {
  public readonly spell = input.required<FocusSpellLine>();
  public readonly tags = input<readonly string[]>([]);
}
