import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { cva } from 'class-variance-authority';

import type { SelectOption } from '../../controls/select/select.component';
import { RovingFocusItem } from '../../focus/roving-focus-item.directive';
import { RovingFocus } from '../../focus/roving-focus.directive';

const rowVariants = cva('flex gap-2xs overflow-x-auto border-b border-line-subtle p-2xs');
// Touch-sized like a section tab, whose look it shares; the label never wraps, the row scrolls instead.
const tabVariants = cva(
  'inline-flex h-touch items-center px-sm text-label font-medium whitespace-nowrap underline-offset-link focus-visible:focus-ring pointer-fine:h-control-sm',
  {
    variants: {
      selected: {
        true: 'text-fg-default underline decoration-accent-fg decoration-link-current',
        false: 'text-fg-muted hover:text-fg-default hover:underline hover:decoration-line-strong',
      },
    },
  },
);

/**
 * Tabs that switch what one page shows, not its route: a `role="tablist"` of `role="tab"` buttons, the chosen one
 * `aria-selected`. The row is one Tab stop (the chosen tab); arrow keys, Home and End move focus, and Enter or Space
 * chooses. For sections that are routes use `fr-tabs`. The caller shows the panel for `value`.
 *
 * ```html
 * <fr-tab-list [options]="kinds" label="Kinds of action" [(value)]="kind" />
 * ```
 */
@Component({
  selector: 'fr-tab-list',
  imports: [RovingFocus, RovingFocusItem],
  templateUrl: './tab-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class TabList<TValue extends string> {
  /** Names the tab list, already translated. */
  public readonly label = input.required<string>();
  public readonly options = input.required<readonly SelectOption<TValue>[]>();
  /** The chosen tab. */
  public readonly value = model<TValue | undefined>(undefined);

  protected readonly rowClasses = rowVariants();
  protected readonly selectedClasses = tabVariants({ selected: true });
  protected readonly otherClasses = tabVariants({ selected: false });

  protected choose(value: TValue): void {
    this.value.set(value);
  }
}
