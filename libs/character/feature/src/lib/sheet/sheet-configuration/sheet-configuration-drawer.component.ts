import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Drawer, Section, Stack } from '@pioneer/frontier';

import { SheetCustomEffectsSection } from '../sheet-custom-effects/sheet-custom-effects.component';
import { SheetOverridesSection } from '../sheet-overrides/sheet-overrides.component';
import { SheetPacks } from '../sheet-packs/sheet-packs.component';
import { SheetRuleLimits } from '../sheet-rule-limits/sheet-rule-limits.component';
import { SHEET_SECTIONS } from '../sheet-sections';
import { SheetVariantRules } from '../sheet-variant-rules/sheet-variant-rules.component';
import { SheetConfigurationState } from './sheet-configuration-state';

/** The query parameter that holds the drawer open in the address. */
const CONFIGURATION_PARAM = 'configuration';

/**
 * What the table decides about the character, in a drawer beside the sheet: the content packs and variant rules it
 * uses, the inventory limits it is held to, and the overrides and custom effects made by hand. The packs and variant
 * rules are chosen by the owner outside campaigns, and by the campaign inside one (ADR-0061, ADR-0064). It opens from
 * the sheet's actions menu; its host takes no room, so the drawer lays out as a child of the page.
 */
@Component({
  selector: 'pio-sheet-configuration-drawer',
  imports: [
    Drawer,
    Section,
    SheetCustomEffectsSection,
    SheetOverridesSection,
    SheetPacks,
    SheetRuleLimits,
    SheetVariantRules,
    Stack,
    TranslocoPipe,
  ],
  templateUrl: './sheet-configuration-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SheetConfigurationDrawer {
  protected readonly state = inject(SheetConfigurationState);
  protected readonly param = CONFIGURATION_PARAM;
  protected readonly sections = SHEET_SECTIONS;
}
