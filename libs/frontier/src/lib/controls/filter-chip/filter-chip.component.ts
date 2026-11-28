import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';
import { X } from 'lucide';

import { Button, ButtonVariant } from '../../actions/button/button.component';
import { Icon } from '../../icon/icon.component';
import { Size } from '../../tokens';
import { FilterOperator, OPERATOR_LABELS } from '../filter-bar/filter-bar.types';

/** The part of a chip that was pressed, so the editor opens on it. */
export const FilterChipSegment = { Property: 'property', Operator: 'operator', Value: 'value' } as const;

export type FilterChipSegment = ValueOf<typeof FilterChipSegment>;

/** One message per operator: the chip read as a sentence. */
const PHRASE_KEYS = {
  is: 'frontier.filterChip.phrase.is',
  isNot: 'frontier.filterChip.phrase.isNot',
  isAnyOf: 'frontier.filterChip.phrase.isAnyOf',
  between: 'frontier.filterChip.phrase.between',
} as const satisfies Record<FilterOperator, string>;

/** One control-size tall (`h-control-sm`), the same as the buttons inside it. */
const chipClasses = cva('inline-flex h-control-sm items-stretch border border-line-default bg-surface-base')();

/**
 * A filter as a group of segments: `[property][operator][value][x]`. Each segment is a button that opens the chip's
 * editor (`expanded`, and `controls` names the editor's id); the cross removes the chip, and so does Backspace
 * while focus is inside it. A draft chip, one with no `value`, is dropped when focus leaves it and its editor is
 * closed. frontier knows no schemas: the labels arrive already translated and the value already formatted.
 *
 * ```html
 * <fr-filter-chip property="Rarity" [operator]="op" value="Rare" (edit)="open($event)" (removed)="remove()" />
 * ```
 */
@Component({
  selector: 'fr-filter-chip',
  imports: [Button, Icon, TranslocoPipe],
  templateUrl: './filter-chip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    '[class]': 'classes',
    '[attr.aria-label]': 'phrase()',
    '(keydown.backspace)': 'removed.emit()',
    '(focusout)': 'blurred($event)',
  },
})
export class FilterChip {
  /** The property's label, already translated. */
  public readonly property = input.required<string>();
  public readonly operator = input<FilterOperator>(FilterOperator.Is);
  /** The value as it reads, already formatted; empty for a draft. */
  public readonly value = input('');
  /** Whether the chip's editor is open. */
  public readonly expanded = input(false);
  /** The id of the chip's editor, for `aria-controls`. */
  public readonly controls = input<string | undefined>(undefined);
  public readonly edit = output<FilterChipSegment>();
  public readonly removed = output();
  /** A draft chip lost focus with no editor open: nothing was chosen, so it goes. */
  public readonly dropped = output();

  protected readonly classes = chipClasses;
  protected readonly Segment = FilterChipSegment;
  protected readonly Size = Size;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly closeIcon = X;
  protected readonly operatorLabels = OPERATOR_LABELS;

  readonly #transloco = inject(TranslocoService);

  protected readonly draft = computed(() => this.value() === '');
  /** The whole chip as one phrase: its group name, and the base of the remove button's. */
  protected readonly phrase = computed(() => {
    const property = this.property();

    if (this.draft()) {
      const operator = this.#transloco.translate(OPERATOR_LABELS[this.operator()]);

      return this.#transloco.translate('frontier.filterChip.draftPhrase', { property, operator });
    }

    return this.#transloco.translate(PHRASE_KEYS[this.operator()], { property, value: this.value() });
  });

  protected blurred(event: FocusEvent): void {
    const next = event.relatedTarget;
    const stays = next instanceof Node && event.currentTarget instanceof Node && event.currentTarget.contains(next);

    if (this.draft() && !this.expanded() && !stays) {
      this.dropped.emit();
    }
  }
}
