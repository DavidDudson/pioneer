import { ChangeDetectionStrategy, Component, computed, input, model, output, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Search, X } from 'lucide';

import { Button } from '../../actions/button/button.component';
import { Icon } from '../../icon/icon.component';
import { Control } from '../control';
import { InputAddon } from '../input-group/input-addon.component';
import { InputGroup } from '../input-group/input-group.component';
import { Input } from '../input/input.component';
import { injectSearchQuery } from '../search-query';

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
  imports: [Button, Icon, Input, InputAddon, InputGroup, TranslocoPipe],
  templateUrl: './search-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class SearchInput extends Control {
  public readonly value = model('');
  public readonly placeholder = input('');
  /** The query, debounced. Not fired when `value` is set from outside. */
  public readonly searched = output<string>();

  protected readonly SearchIcon = Search;
  protected readonly ClearIcon = X;
  protected readonly control = viewChild.required(Input);
  protected readonly clearable = computed(() => this.value() !== '' && !this.disabled());

  readonly #query = injectSearchQuery({
    current: this.value,
    emit: (query) => {
      this.searched.emit(query);
    },
  });

  /** Enter: run the query now, without waiting for typing to go quiet. */
  protected commit(): void {
    this.#searchNow();
    this.committed.emit();
  }

  /** Escape: clear the query, then cancel. */
  protected cancel(): void {
    this.#clear();
    this.cancelled.emit();
  }

  protected type(query: string): void {
    this.value.set(query);
    this.#query.type(query);
  }

  /** The clear button: empty the query and put focus back in the input, which the button replaced. */
  protected clearAndFocus(): void {
    this.#clear();
    this.control().focus();
  }

  #clear(): void {
    this.value.set('');
    this.#searchNow();
  }

  #searchNow(): void {
    this.#query.now(this.value());
  }
}
