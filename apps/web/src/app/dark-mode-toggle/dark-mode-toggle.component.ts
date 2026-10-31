import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { translateSignal, TranslocoPipe } from '@jsverse/transloco';
import { LucideMonitor, LucideMoon, LucideSun } from '@lucide/angular';
import { ModeChoice, Segmented, ThemeStore } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';

/** Colour mode as three icon-only buttons: follow the system, dark, or light. */
@Component({
  selector: 'pio-dark-mode-toggle',
  imports: [Segmented, TranslocoPipe],
  templateUrl: './dark-mode-toggle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DarkModeToggle {
  protected readonly appearance = inject(ThemeStore);
  readonly #system = translateSignal('shell.appearance.modes.system');
  readonly #dark = translateSignal('shell.appearance.modes.dark');
  readonly #light = translateSignal('shell.appearance.modes.light');
  protected readonly options = computed<readonly SelectOption<ModeChoice>[]>(() => [
    { value: ModeChoice.System, label: this.#system(), icon: LucideMonitor },
    { value: ModeChoice.Dark, label: this.#dark(), icon: LucideMoon },
    { value: ModeChoice.Light, label: this.#light(), icon: LucideSun },
  ]);

  protected choose(choice: ModeChoice | undefined): void {
    if (choice !== undefined) {
      this.appearance.modeChoice.set(choice);
    }
  }
}
