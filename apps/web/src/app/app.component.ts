import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { Type } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe, translateSignal } from '@jsverse/transloco';
import { ColorMode, Link, Segmented, Shell, Stack, Text, Theme, ThemeStore, ToggleButton } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { IDLE_SCHEDULER, ShellSearch } from '@pioneer/shared/web';

import { AccountMenu } from './account-menu/account-menu.component';

@Component({
  selector: 'pio-root',
  imports: [
    AccountMenu,
    Link,
    NgComponentOutlet,
    RouterOutlet,
    Segmented,
    Shell,
    Stack,
    Text,
    ToggleButton,
    TranslocoPipe,
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly appearance = inject(ThemeStore);
  protected readonly shellSearch = inject(ShellSearch);
  readonly #frontierLabel = translateSignal('shell.appearance.themes.frontier');
  readonly #tavernLabel = translateSignal('shell.appearance.themes.tavern');
  protected readonly themes = computed<readonly SelectOption<Theme>[]>(() => [
    { value: Theme.Frontier, label: this.#frontierLabel() },
    { value: Theme.Tavern, label: this.#tavernLabel() },
  ]);
  /**
   * The global search, loaded with the content feature when the browser is idle: the content browser is a lazy route, so
   * the shell never imports it statically. Empty until then.
   */
  protected readonly globalSearch = signal<Type<unknown> | undefined>(undefined);
  protected readonly darkMode = computed(() => this.appearance.mode() === ColorMode.Dark);

  public constructor() {
    inject(IDLE_SCHEDULER)(() => {
      // oxlint-disable-next-line typescript/no-floating-promises -- loadSearch catches every error, so it never rejects
      this.#loadSearch();
    });
  }

  protected chooseTheme(theme: Theme | undefined): void {
    if (theme !== undefined) {
      this.appearance.theme.set(theme);
    }
  }

  protected chooseDarkMode(on: boolean): void {
    this.appearance.mode.set(on ? ColorMode.Dark : ColorMode.Light);
  }

  async #loadSearch(): Promise<void> {
    try {
      const { GlobalSearch } = await import('@pioneer/content/feature');
      this.globalSearch.set(GlobalSearch);
    } catch {
      // No search box this visit: the content browser has its own.
    }
  }
}
