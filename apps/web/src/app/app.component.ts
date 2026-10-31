import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { Type } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Link, Shell, Stack, Text } from '@pioneer/frontier';
import { IDLE_SCHEDULER, ShellSearch } from '@pioneer/shared/web';

import { AccountMenu } from './account-menu/account-menu.component';
import { SectionsMenu } from './sections-menu/sections-menu.component';

@Component({
  selector: 'pio-root',
  imports: [AccountMenu, Link, NgComponentOutlet, RouterOutlet, SectionsMenu, Shell, Stack, Text, TranslocoPipe],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly shellSearch = inject(ShellSearch);
  /**
   * The global search, loaded with the content feature when the browser is idle: the content browser is a lazy route, so
   * the shell never imports it statically. Empty until then.
   */
  protected readonly globalSearch = signal<Type<unknown> | undefined>(undefined);

  public constructor() {
    inject(IDLE_SCHEDULER)(() => {
      // oxlint-disable-next-line typescript/no-floating-promises -- loadSearch catches every error, so it never rejects
      this.#loadSearch();
    });
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
