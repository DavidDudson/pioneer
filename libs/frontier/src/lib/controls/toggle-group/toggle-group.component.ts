import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { cva } from 'class-variance-authority';

import { Button, ButtonVariant } from '../../actions/button/button.component';
import { RovingFocusItem } from '../../focus/roving-focus-item.directive';
import { RovingFocus } from '../../focus/roving-focus.directive';
import { Size } from '../../tokens';
import { Control } from '../control';
import type { SelectOption } from '../select/select.component';
import { ToggleButton } from '../toggle-button/toggle-button.component';
import { ToggleGroupField } from './toggle-group-field.directive';

const groupClasses = cva('flex flex-wrap items-center gap-xs')();

/**
 * Several independent filters (kind, rarity, traits) as a wrapping row of toggle buttons: each button is
 * outlined when off and filled with the accent when on, so the active ones read at a glance. The row
 * wraps and never scrolls sideways, and is one Tab stop: arrow keys, Home and End move between its buttons. `value` is the set of selected keys; a press adds or removes one
 * key, and "Clear all" (shown while anything is selected) empties it. Each change replaces the set and
 * fires `committed`.
 *
 * ```html
 * <fr-toggle-group [options]="rarities" [(value)]="rarity" [ariaLabel]="'filters.rarity' | transloco" />
 * ```
 */
@Component({
  selector: 'fr-toggle-group',
  imports: [Button, RovingFocus, RovingFocusItem, ToggleButton, ToggleGroupField, TranslocoPipe],
  templateUrl: './toggle-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ToggleGroup<TKey extends string> extends Control {
  public readonly value = model<ReadonlySet<TKey>>(new Set());
  public readonly options = input.required<ReadonlyArray<SelectOption<TKey>>>();

  protected readonly chipSize = Size.Sm;
  protected readonly clearVariant = ButtonVariant.Ghost;
  protected readonly anySelected = computed(() => this.value().size > 0);
  protected readonly groupClasses = groupClasses;

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected isSelected(key: TKey): boolean {
    return this.value().has(key);
  }

  protected setSelected(key: TKey, on: boolean): void {
    const next = new Set(this.value());

    if (on) {
      next.add(key);
    } else {
      next.delete(key);
    }

    this.value.set(next);
    this.committed.emit();
  }

  protected clear(): void {
    this.value.set(new Set());
    this.committed.emit();
    // The clear button leaves with the selection; keep focus in the group instead of dropping it.
    this.#host.nativeElement.querySelector('button')?.focus();
  }
}
