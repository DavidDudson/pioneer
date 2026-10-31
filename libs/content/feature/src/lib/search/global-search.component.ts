import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Combobox } from '@pioneer/frontier/data';
import type { ContentId } from '@pioneer/rules/sdk';
import { entryTarget } from '@pioneer/rules/ui';
import { ShellSearch } from '@pioneer/shared/web';

import { GlobalSearchSession } from './global-search-session';
import { isSearchShortcut } from './global-search-shortcut';

const SearchMessage = {
  Label: 'shell.search.label',
  Placeholder: 'shell.search.placeholder',
} as const;

/**
 * The shell's global content search (public, no account), opened with `/` or Ctrl/Cmd+K. Names match as you type, in
 * the kinds loaded so far: they load one at a time when the browser is idle, so typing never waits. The server's
 * full-text results for the same words are added below once they arrive, and entries already listed never move.
 * Arrow keys move through the list, Enter opens the entry and Escape closes.
 */
@Component({
  selector: 'pio-global-search',
  imports: [Combobox, TranslocoPipe],
  templateUrl: './global-search.component.html',
  providers: [GlobalSearchSession],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'shortcut($event)', '(focusin)': 'session.warm()' },
})
export class GlobalSearch {
  readonly #router = inject(Router);
  readonly #shell = inject(ShellSearch);
  protected readonly session = inject(GlobalSearchSession);
  protected readonly combobox = viewChild.required<Combobox<ContentId>>(Combobox);

  protected readonly Message = SearchMessage;

  protected async open(): Promise<void> {
    const entry = this.session.entry(this.combobox().value());
    if (entry === undefined) {
      return;
    }
    this.#clear();
    const target = entryTarget(entry);
    await this.#router.navigate(typeof target === 'string' ? [target] : [...target]);
  }

  protected cancel(): void {
    this.#clear();
  }

  protected shortcut(event: KeyboardEvent): void {
    if (isSearchShortcut(event)) {
      event.preventDefault();
      // While closed the box is hidden and cannot take focus: the shell focuses it once it has opened.
      this.#shell.open.set(true);
      this.combobox().focus();
    }
  }

  #clear(): void {
    // Set on the control itself: a binding would only reach it on the next change detection, after it restored the label.
    this.combobox().value.set(undefined);
    this.session.clear();
  }
}
