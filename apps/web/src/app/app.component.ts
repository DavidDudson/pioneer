import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe, translateSignal } from '@jsverse/transloco';
import { Button, ColorMode, Link, Select, Shell, Stack, Text, Theme, ThemeStore } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';

@Component({
  selector: 'pio-root',
  imports: [Button, Link, RouterOutlet, Select, Shell, Stack, Text, TranslocoPipe],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly appearance = inject(ThemeStore);
  readonly #frontierLabel = translateSignal('shell.appearance.themes.frontier');
  readonly #tavernLabel = translateSignal('shell.appearance.themes.tavern');
  protected readonly themes = computed<readonly SelectOption<Theme>[]>(() => [
    { value: Theme.Frontier, label: this.#frontierLabel() },
    { value: Theme.Tavern, label: this.#tavernLabel() },
  ]);
  /** The toggle names the mode it switches to. */
  protected readonly modeToggleKey = computed(() =>
    this.appearance.mode() === ColorMode.Dark ? 'shell.appearance.lightMode' : 'shell.appearance.darkMode',
  );

  protected chooseTheme(theme: Theme | undefined): void {
    if (theme !== undefined) {
      this.appearance.theme.set(theme);
    }
  }
}
