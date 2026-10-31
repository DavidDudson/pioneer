import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Section, Stack } from '@pioneer/frontier';

import { SheetOverridesSection } from '../sheet-overrides/sheet-overrides.component';
import { SheetRuleLimits } from '../sheet-rule-limits/sheet-rule-limits.component';
import { SHEET_SECTIONS } from '../sheet-sections';
import type { SheetSection } from '../sheet-sections';
import { SheetVariantRules } from '../sheet-variant-rules/sheet-variant-rules.component';

/**
 * The rules the table plays by: the variant rules the character uses, the inventory limits it is held to, and the
 * overrides made by hand to its statistics. The first two are chosen by the owner outside campaigns, and by the campaign inside one (ADR-0061, ADR-0064).
 */
@Component({
  selector: 'pio-sheet-table-rules',
  imports: [Section, SheetOverridesSection, SheetRuleLimits, SheetVariantRules, Stack, TranslocoPipe],
  templateUrl: './sheet-table-rules.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetTableRules {
  /** The section of the tab that is open; the others stay rendered and out of sight. */
  public readonly shown = input.required<SheetSection | undefined>();

  protected readonly sections = SHEET_SECTIONS;
}
