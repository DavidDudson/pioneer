import { booleanAttribute, ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Responsive, Stack, Tab, Tabs, TabsAppearance } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { OptionPicker } from '@pioneer/rules/ui';
import { map } from 'rxjs';

import { SheetPanelContent } from '../sheet-panel/sheet-panel.component';
import { panelOfPath, sectionPath, SHEET_PANELS } from '../sheet-sections';
import type { SheetPanel, SheetSection } from '../sheet-sections';

/** One section tab: the route below the open section's, and the message key naming it. */
interface SectionLink {
  readonly to: readonly string[];
  readonly headingKey: string;
}

/**
 * The sections of the open sheet tab as tabs of their own, in the look of the Lore and Skill switch, centred. Each is a
 * route below the tab's, so the address says which is shown. Below the `lg` width, where the side panels have no rail,
 * the tabs are a dropdown that lists the sections and then the panels (Skills, Conditions, Environments), and a
 * panel opens right under it. Place it in the routed tab component, whose route is the section's.
 */
@Component({
  selector: 'pio-sheet-section-tabs',
  imports: [OptionPicker, Responsive, SheetPanelContent, Stack, Tab, Tabs, TranslocoPipe],
  templateUrl: './sheet-section-tabs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetSectionTabs {
  public readonly sections = input.required<readonly SheetSection[]>();
  /** Whether the tabs also show from `lg` up; a tab with a side list of its own sets it false and keeps the dropdown. */
  public readonly wide = input(true, { transform: booleanAttribute });

  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #i18n = inject(TranslocoService);
  readonly #language = toSignal(this.#i18n.langChanges$);
  readonly #path = toSignal(this.#route.paramMap.pipe(map((params) => params.get('section') ?? undefined)));

  protected readonly Appearance = TabsAppearance;
  protected readonly links = computed((): readonly SectionLink[] =>
    this.sections().map((section) => ({ to: ['..', sectionPath(section)], headingKey: section.headingKey })),
  );
  protected readonly options = computed((): readonly SelectOption<string>[] => {
    this.#language();
    return [...this.sections(), ...SHEET_PANELS].map((section) => ({
      value: sectionPath(section),
      label: this.#i18n.translate(section.headingKey, section.headingParams),
    }));
  });
  /** The panel the route names, if it names one. */
  protected readonly panel = computed((): SheetPanel | undefined => panelOfPath(this.#path()));
  /** The entry the dropdown shows: the route's, else the first section, which the tab then shows. */
  protected readonly current = computed((): string | undefined => {
    const path = this.#path();
    const [first] = this.sections();
    return this.options().some(({ value }) => value === path) || first === undefined ? path : sectionPath(first);
  });

  protected open(path: string | undefined): void {
    if (path !== undefined) {
      // oxlint-disable-next-line typescript/no-floating-promises -- the router reports a failed navigation itself
      this.#router.navigate(['..', path], { relativeTo: this.#route });
    }
  }
}
