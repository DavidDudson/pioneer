import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import { AsyncStatus } from '../../async/async-action';
import { Control } from '../control';
import { Input } from '../input/input.component';

/**
 * Plain single-line text control: the input alone. Use it for inline
 * editing; in a form use `fr-text-field`, which adds label, hint and error.
 * `monospace` suits code-like text such as formulas, and turns off spellcheck,
 * autocapitalise and autocorrect, which would change what is typed.
 */
@Component({
  selector: 'fr-text-input',
  imports: [Input],
  templateUrl: './text-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block status-border', '[attr.data-status]': 'dataStatus()' },
})
export class TextInput extends Control {
  public readonly value = model('');
  public readonly placeholder = input('');
  public readonly monospace = input(false, { transform: booleanAttribute });
  /** The state of the load or save behind the value, shown on the control's border. */
  public readonly status = input<AsyncStatus>(AsyncStatus.Idle);

  protected readonly dataStatus = computed(() => (this.status() === AsyncStatus.Idle ? undefined : this.status()));
}
