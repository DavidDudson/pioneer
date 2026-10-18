import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { IDLE_SCHEDULER, ShellSearch } from '@pioneer/shared/web';

import { SHEET_SIDE_PANEL } from '../../data/sheet-side-panel';
import { SheetSidePanelState } from './sheet-side-panel-state';

/**
 * Loads the sheet's side panel, fetched when the browser is idle so the sheet renders at once, and hands it to
 * `SheetSidePanelState`, which the header button and the drawer wait on. Once it is there the shell's own search is
 * hidden, since this one has the shortcut. Nothing is offered when the app provides none or the fetch fails, and then
 * the shell's search stays.
 */
@Component({
  selector: 'pio-sheet-side-panel',
  templateUrl: './sheet-side-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetSidePanelHost {
  readonly #loader = inject(SHEET_SIDE_PANEL);
  readonly #state = inject(SheetSidePanelState);
  readonly #shell = inject(ShellSearch);
  readonly #release = signal<(() => void) | undefined>(undefined);
  #destroyed = false;

  public constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.#destroyed = true;
      this.#release()?.();
    });
    if (this.#loader !== undefined) {
      inject(IDLE_SCHEDULER)(() => {
        // oxlint-disable-next-line typescript/no-floating-promises -- #load catches every error, so it never rejects
        this.#load();
      });
    }
  }

  async #load(): Promise<void> {
    try {
      const component = await this.#loader?.();
      if (component !== undefined && !this.#destroyed) {
        this.#state.panel.set(component);
        this.#release.set(this.#shell.hide());
      }
    } catch {
      // No side panel this visit: the shell's search stays.
    }
  }
}
