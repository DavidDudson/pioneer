import { booleanAttribute, ChangeDetectionStrategy, Component, input, model } from '@angular/core';

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
  host: { class: 'block' },
})
export class TextInput extends Control {
  public readonly value = model('');
  public readonly placeholder = input('');
  public readonly monospace = input(false, { transform: booleanAttribute });
  /** Room at the end for two icon buttons, which the parent places over the control (a refreshable input). */
  public readonly trailing = input(false, { transform: booleanAttribute });
}
