import { ChangeDetectionStrategy, Component, input, model, viewChild } from '@angular/core';
import type { ElementRef } from '@angular/core';

import { injectCommitKeys } from '../commit-keys';
import { Control } from '../control';
import { controlVariants } from '../control.variants';

/**
 * Plain single-line text control: the input alone. Use it for inline
 * editing; in a form use `fr-text-field`, which adds label, hint and error.
 */
@Component({
  selector: 'fr-text-input',
  templateUrl: './text-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class TextInput extends Control {
  public readonly value = model('');
  public readonly placeholder = input('');

  protected readonly classes = controlVariants();
  protected readonly control = viewChild<ElementRef<HTMLInputElement>>('control');

  public constructor() {
    super();
    injectCommitKeys(this.control, {
      commit: () => {
        this.committed.emit();
      },
      cancel: () => {
        this.cancelled.emit();
      },
    });
  }
}
