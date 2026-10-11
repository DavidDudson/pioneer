import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe, translateSignal } from '@jsverse/transloco';
import { ColorMode, Link, Segmented, Shell, Stack, Text, Theme, ThemeStore, ToggleButton } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';

import { AccountMenu } from './account-menu/account-menu.component';

@Component({
  selector: 'pio-root',
  imports: [AccountMenu, Link, RouterOutlet, Segmented, Shell, Stack, Text, ToggleButton, TranslocoPipe],
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
  protected readonly darkMode = computed(() => this.appearance.mode() === ColorMode.Dark);

  protected chooseTheme(theme: Theme | undefined): void {
    if (theme !== undefined) {
      this.appearance.theme.set(theme);
    }
  }

  protected chooseDarkMode(on: boolean): void {
    this.appearance.mode.set(on ? ColorMode.Dark : ColorMode.Light);
  }
}
