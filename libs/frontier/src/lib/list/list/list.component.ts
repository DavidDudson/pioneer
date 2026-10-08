import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import { gapVariants, Space } from '../../tokens';

const listVariants = cva('flex flex-col', {
  variants: {
    gap: gapVariants,
    markers: { true: 'ps-md', false: 'list-none' },
    ordered: { true: '', false: '' },
  },
  compoundVariants: [
    { markers: true, ordered: false, class: 'list-disc' },
    { markers: true, ordered: true, class: 'list-decimal' },
  ],
});

/**
 * A list of `fr-list-item`s. Renders `<ul>`, or `<ol>` when the order means something (`ordered`). Items are
 * unmarked unless `markers` is set: bullets for `<ul>`, numbers for `<ol>`.
 *
 * ```html
 * <fr-list gap="xs">
 *   @for (credit of credits; track credit) {
 *     <fr-list-item><fr-text variant="caption">{{ credit }}</fr-text></fr-list-item>
 *   }
 * </fr-list>
 * ```
 */
@Component({
  selector: 'fr-list',
  imports: [NgTemplateOutlet],
  templateUrl: './list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class List {
  public readonly ordered = input(false, { transform: booleanAttribute });
  public readonly markers = input(false, { transform: booleanAttribute });
  public readonly gap = input<Space>(Space.Xs);

  protected readonly classes = computed(() =>
    listVariants({ gap: this.gap(), markers: this.markers(), ordered: this.ordered() }),
  );
}
