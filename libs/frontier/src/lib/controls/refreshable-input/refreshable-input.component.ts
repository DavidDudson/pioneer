import { ChangeDetectionStrategy, Component, effect, input, model, signal, untracked } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideRefreshCw } from '@lucide/angular';
import { cva } from 'class-variance-authority';

import { Button } from '../../actions/button/button.component';
import { Spinner } from '../../feedback/spinner/spinner.component';
import { Icon } from '../../icon/icon.component';
import { Control } from '../control';
import { TextInput } from '../text-input/text-input.component';

const actionsClasses = cva('absolute inset-y-none end-none flex items-center')();

/**
 * A text control whose value is fetched: it loads when it appears (and whenever `load` changes), and its refresh
 * button, at the end of the input, loads again. While a load is in flight the button's icon is a spinner and the
 * button is busy. The value stays editable by hand; a load that finishes after a newer one started is dropped. A
 * failed load leaves the value as it was and marks the control invalid.
 *
 * Project buttons with `frAction` to put them before the refresh button (`pio-roll-table-input`'s table button).
 */
@Component({
  selector: 'fr-refreshable-input',
  imports: [Button, Icon, Spinner, TextInput, TranslocoPipe],
  templateUrl: './refreshable-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block' },
})
export class RefreshableInput extends Control {
  public readonly value = model('');
  public readonly placeholder = input('');
  /** Fetches a new value. Called on first render, on every refresh, and when the function itself changes. */
  public readonly load = input.required<() => Promise<string>>();

  protected readonly RefreshIcon = LucideRefreshCw;
  protected readonly actionsClasses = actionsClasses;
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);

  /** Which load is the latest; an older one's answer is dropped. */
  #latest = 0;

  public constructor() {
    super();
    effect(() => {
      this.load();
      untracked(() => {
        // oxlint-disable-next-line promise/prefer-await-to-then -- an effect cannot await; refresh handles its own errors
        this.refresh().catch(() => undefined);
      });
    });
  }

  /** Loads a new value into the input. */
  public async refresh(): Promise<void> {
    this.#latest += 1;
    const mine = this.#latest;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const loaded = await this.load()();
      if (mine === this.#latest) {
        this.value.set(loaded);
      }
    } catch {
      if (mine === this.#latest) {
        this.failed.set(true);
      }
    } finally {
      if (mine === this.#latest) {
        this.loading.set(false);
      }
    }
  }
}
