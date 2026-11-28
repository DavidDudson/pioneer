import { ChangeDetectionStrategy, Component, computed, effect, input, model, signal, untracked } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RefreshCw } from 'lucide';

import { Button } from '../../actions/button/button.component';
import { AsyncStatus } from '../../async/async-action';
import { Icon } from '../../icon/icon.component';
import { Control } from '../control';
import { InputAddon } from '../input-group/input-addon.component';
import { InputGroup } from '../input-group/input-group.component';
import { Input } from '../input/input.component';

/**
 * A text control whose value is fetched: it loads when it appears (and whenever `load` changes), and its refresh
 * button, an `fr-input-addon` at the end of its `fr-input-group`, loads again. While a load is in flight the input's border turns and the
 * button is busy; a failed load flashes the border red. The value stays editable by hand; a load that finishes after a newer one started is dropped. A
 * failed load leaves the value as it was and marks the control invalid.
 *
 * Project buttons with `frAction` to put them before the refresh button, in the same addon (`pio-roll-table-input`'s table button).
 */
@Component({
  selector: 'fr-refreshable-input',
  imports: [Button, Icon, Input, InputAddon, InputGroup, TranslocoPipe],
  templateUrl: './refreshable-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class RefreshableInput extends Control {
  public readonly value = model('');
  public readonly placeholder = input('');
  /** Fetches a new value. Called on first render, on every refresh, and when the function itself changes. */
  public readonly load = input.required<() => Promise<string>>();

  protected readonly RefreshIcon = RefreshCw;
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly status = computed<AsyncStatus>(() => {
    if (this.loading()) {
      return AsyncStatus.Pending;
    }

    return this.failed() ? AsyncStatus.Error : AsyncStatus.Idle;
  });

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
