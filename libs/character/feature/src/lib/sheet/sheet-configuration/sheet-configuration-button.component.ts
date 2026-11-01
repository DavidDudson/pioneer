import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideSlidersHorizontal } from '@lucide/angular';
import { Button, ButtonVariant, Icon } from '@pioneer/frontier';

import { SheetConfigurationState } from './sheet-configuration-state';

/** The actions menu's entry that opens the character configuration drawer. */
@Component({
  selector: 'pio-sheet-configuration-button',
  imports: [Button, Icon, TranslocoPipe],
  templateUrl: './sheet-configuration-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetConfigurationButton {
  readonly #state = inject(SheetConfigurationState);

  /** Fires once the drawer is asked to open, so the menu that holds this entry can close. */
  public readonly opened = output();

  protected readonly icon = LucideSlidersHorizontal;
  protected readonly variant = ButtonVariant.Menu;

  protected open(): void {
    this.#state.open.set(true);
    this.opened.emit();
  }
}
