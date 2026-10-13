import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Size } from '../../tokens';
import { Button, ButtonVariant } from '../button/button.component';

/**
 * A button that opens the device's file picker and gives back the text of the file chosen. Reading happens in the
 * browser; nothing is sent anywhere. Choosing the same file again emits again.
 *
 * ```html
 * <fr-file-button accept=".json" (chosen)="load($event)">Choose a file</fr-file-button>
 * ```
 */
@Component({
  selector: 'fr-file-button',
  imports: [Button],
  templateUrl: './file-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class FileButton {
  public readonly variant = input<ButtonVariant>(ButtonVariant.Secondary);
  public readonly size = input<Size>(Size.Md);
  public readonly disabled = input(false, { transform: booleanAttribute });
  /** File types the picker offers, as the native `accept` attribute (`.json`, `application/json`). */
  public readonly accept = input('');
  /** The text of the file the user chose. */
  public readonly chosen = output<string>();

  protected async read(picker: HTMLInputElement): Promise<void> {
    const [file] = picker.files ?? [];
    if (file !== undefined) {
      this.chosen.emit(await file.text());
    }
    picker.value = '';
  }
}
