import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import { Space } from '../../tokens';
import { rowVariants } from '../item/row';

const rowClasses = cva('flex items-center gap-sm')();

/**
 * One item of an `fr-list`. The host is the item: `role="listitem"` and `display: list-item`, so it sits directly
 * in the `<ul>` / `<ol>` and keeps its marker. An `<li>` inside a custom-element host would leave the list with
 * children it may not have.
 *
 * Built from parts, it is a row: `fr-item-media`, `fr-item-content` and `fr-item-actions`, with anything else
 * between content and actions. `padding` and `divided` are the row's, shared with `fr-description-item`.
 *
 * ```html
 * <fr-list-item padding="md" divided>
 *   <fr-item-media><fr-avatar [name]="name" /></fr-item-media>
 *   <fr-item-content [heading]="name" [byline]="role"><fr-badge>GM</fr-badge></fr-item-content>
 *   <fr-item-actions><fr-button variant="ghost">…</fr-button></fr-item-actions>
 * </fr-list-item>
 * ```
 */
@Component({
  selector: 'fr-list-item',
  templateUrl: './list-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'listitem', '[class]': 'classes()' },
})
export class ListItem {
  public readonly padding = input<Space>(Space.None);
  /** Draws a rule under the item, except the last of its list. */
  public readonly divided = input(false, { transform: booleanAttribute });

  protected readonly rowClasses = rowClasses;
  protected readonly classes = computed(() =>
    `list-item ${rowVariants({ padding: this.padding(), divided: this.divided() })}`.trim(),
  );
}
