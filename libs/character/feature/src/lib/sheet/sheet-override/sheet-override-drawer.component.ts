import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Drawer } from '@pioneer/frontier';

import { SheetOverrides } from './sheet-override';
import type { OverrideTarget } from './sheet-override';
import { SheetOverrideForm } from './sheet-override-form.component';

/** The drawer's title before a statistic has loaded. */
const TITLE = 'character.sheet.override.title';

/**
 * The override form, in a drawer beside the sheet. It opens from a statistic's Adjust or Set, which name the statistic
 * and the mode in the URL; nothing shows until the sheet derives the statistic. Its host takes no room, so the drawer
 * lays out as a child of the page.
 */
@Component({
  selector: 'pio-sheet-override-drawer',
  imports: [Drawer, SheetOverrideForm],
  templateUrl: './sheet-override-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SheetOverrideDrawer {
  readonly #i18n = inject(TranslocoService);

  protected readonly overrides = inject(SheetOverrides);
  protected readonly open = signal(false);
  protected readonly targets = computed((): readonly OverrideTarget[] => {
    const target = this.overrides.target();
    return target === undefined ? [] : [target];
  });
  protected readonly title = computed(() => {
    const target = this.overrides.target();
    return target === undefined ? this.#i18n.translate(TITLE) : target.statistic.name;
  });
}
