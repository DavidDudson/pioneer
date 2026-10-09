import { ChangeDetectionStrategy, Component, computed, input, model, output, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideSearch, LucideX } from '@lucide/angular';
import { Milliseconds } from '@pioneer/shared/kernel';
import { injectDebouncer } from '@tanstack/angular-pacer';

import { Button } from '../../actions/button/button.component';
import { Icon } from '../../icon/icon.component';
import { injectCommitKeys } from '../commit-keys';
import { Control } from '../control';
import { adornmentVariants, controlVariants } from '../control.variants';

/** Quiet time after the last keystroke before `searched` fires. */
export const SEARCH_DEBOUNCE: Milliseconds = Milliseconds.parse(300);

/**
 * Plain search control: a `type="search"` input with a search icon and a
 * clear button. `value` follows every keystroke; `searched` fires with the
 * query once typing goes quiet (`SEARCH_DEBOUNCE`, TanStack Pacer), and at
 * once on Enter, Escape or clear, so a feature runs its query from
 * `searched` alone. It never repeats the query it last fired. Escape clears
 * the query, then fires `cancelled`.
 */
@Component({
  selector: 'fr-search-input',
  imports: [Button, Icon, TranslocoPipe],
  templateUrl: './search-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block' },
})
export class SearchInput extends Control {
  public readonly value = model('');
  public readonly placeholder = input('');
  /** The query, debounced. Not fired when `value` is set from outside. */
  public readonly searched = output<string>();

  protected readonly SearchIcon = LucideSearch;
  protected readonly ClearIcon = LucideX;
  protected readonly iconSlotClasses = computed(() => adornmentVariants({ edge: 'start', disabled: this.disabled() }));
  protected readonly clearSlotClasses = adornmentVariants({ edge: 'end' });
  protected readonly classes = controlVariants({ adorned: true });
  protected readonly control = viewChild<ElementRef<HTMLInputElement>>('control');
  protected readonly clearable = computed(() => this.value() !== '' && !this.disabled());

  /** The query `searched` last fired; undefined until it first fires. */
  #lastSearched: string | undefined;
  /** Cancelled on destroy, so a pending query never fires after the control is gone. */
  readonly #debouncer = injectDebouncer(
    (query: string) => {
      // `value` was set from outside since this keystroke: the typed query is stale.
      if (query === this.value()) {
        this.#search(query);
      }
    },
    { wait: SEARCH_DEBOUNCE },
  );

  public constructor() {
    super();
    injectCommitKeys(this.control, {
      commit: () => {
        this.#searchNow();
        this.committed.emit();
      },
      cancel: () => {
        this.#clear();
        this.cancelled.emit();
      },
    });
  }

  protected type(query: string): void {
    this.value.set(query);
    this.#debouncer.maybeExecute(query);
  }

  /** The clear button: empty the query and put focus back in the input, which the button replaced. */
  protected clearAndFocus(): void {
    this.#clear();
    this.control()?.nativeElement.focus();
  }

  #clear(): void {
    this.value.set('');
    this.#searchNow();
  }

  #searchNow(): void {
    this.#debouncer.cancel();
    this.#search(this.value());
  }

  #search(query: string): void {
    if (query === this.#lastSearched) {
      return;
    }
    this.#lastSearched = query;
    this.searched.emit(query);
  }
}
