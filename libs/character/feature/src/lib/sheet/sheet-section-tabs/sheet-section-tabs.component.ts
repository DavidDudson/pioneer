import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Tab, Tabs, TabsAppearance } from '@pioneer/frontier';

import { sectionPath } from '../sheet-sections';
import type { SheetSection } from '../sheet-sections';

/** One section tab: the route below the open section's, and the message key naming it. */
interface SectionLink {
  readonly to: readonly string[];
  readonly headingKey: string;
}

/**
 * The sections of the open sheet tab as tabs of their own, in the look of the Lore and Skill switch, centred. Each is a
 * route below the tab's, so the address says which is shown. Place it in the routed tab component, whose route is
 * the section's.
 */
@Component({
  selector: 'pio-sheet-section-tabs',
  imports: [Tab, Tabs, TranslocoPipe],
  templateUrl: './sheet-section-tabs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetSectionTabs {
  public readonly sections = input.required<readonly SheetSection[]>();

  protected readonly Appearance = TabsAppearance;
  protected readonly links = computed((): readonly SectionLink[] =>
    this.sections().map((section) => ({ to: ['..', sectionPath(section)], headingKey: section.headingKey })),
  );
}
