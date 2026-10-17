import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Section, Stack } from '@pioneer/frontier';

import { SheetRuleLimits } from '../sheet-rule-limits/sheet-rule-limits.component';
import { SHEET_SECTIONS } from '../sheet-sections';
import { SheetVariantRules } from '../sheet-variant-rules/sheet-variant-rules.component';

/**
 * The rules the table plays by: the variant rules the character uses and the inventory limits it is held to. Each is
 * chosen by the owner outside campaigns, and by the campaign inside one (ADR-0061, ADR-0064).
 */
@Component({
  selector: 'pio-sheet-table-rules',
  imports: [Section, SheetRuleLimits, SheetVariantRules, Stack, TranslocoPipe],
  templateUrl: './sheet-table-rules.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetTableRules {
  protected readonly sections = SHEET_SECTIONS;
}
