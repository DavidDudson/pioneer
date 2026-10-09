import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { Button, ButtonVariant } from '../../actions/button/button.component';
import { Size } from '../../tokens';
import { Control } from '../control';

/**
 * An on/off value as one button: outlined when off, filled with the accent when on, announced with
 * `aria-pressed`. The preferred boolean control over a checkbox. The content names the
 * setting and stays the same in both states. A press flips `value` and fires `committed`.
 *
 * ```html
 * <fr-toggle-button [(value)]="fortune">{{ 'play.dice.fortune' | transloco }}</fr-toggle-button>
 * ```
 */
@Component({
  selector: 'fr-toggle-button',
  imports: [Button],
  templateUrl: './toggle-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ToggleButton extends Control {
  public readonly value = model(false);
  public readonly size = input<Size>(Size.Md);

  protected readonly variant = ButtonVariant.Toggle;

  protected toggle(): void {
    this.value.update((on) => !on);
    this.committed.emit();
  }
}
