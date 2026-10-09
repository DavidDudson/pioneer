import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

import { Control } from '../control';
import { controlVariants } from '../control.variants';

const DEFAULT_ROWS = 6;

/**
 * Plain multi-line text control: the textarea alone. Enter starts a new line, so it never
 * commits; read `value` instead. `monospace` suits code-like text such as JSON.
 */
@Component({
  selector: 'fr-text-area',
  templateUrl: './text-area.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class TextArea extends Control {
  public readonly value = model('');
  public readonly placeholder = input('');
  /** Visible lines before it scrolls; the user can drag it taller. */
  public readonly rows = input(DEFAULT_ROWS);
  public readonly monospace = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() => controlVariants({ multiline: true, monospace: this.monospace() }));
}
