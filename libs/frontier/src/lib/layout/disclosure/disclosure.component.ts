import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { LucideChevronDown, LucideChevronUp } from '@lucide/angular';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

import { Icon } from '../../icon/icon.component';

export const DisclosureVariant = {
  /** Just the trigger row and the content below it; for lists of rows that already have separators. */
  Plain: 'plain',
  /** A bordered panel; the content sits under a rule inside it. */
  Bordered: 'bordered',
} as const;
export type DisclosureVariant = ValueOf<typeof DisclosureVariant>;

const rootVariants = cva('block', {
  variants: {
    variant: {
      plain: '',
      bordered: 'border border-line-default bg-surface-base',
    } satisfies Record<DisclosureVariant, string>,
  },
});

/** Touch first: the trigger is at least `min-h-touch` (44px) unless the pointer is fine. */
const summaryVariants = cva(
  [
    'flex min-h-touch cursor-pointer select-none items-center justify-between gap-sm pointer-fine:min-h-control-md',
    'text-body font-medium text-fg-default',
    'transition-colors duration-fast ease-standard hover:bg-surface-sunken focus-visible:focus-ring',
  ],
  {
    variants: {
      variant: {
        plain: '-mx-2xs px-2xs',
        bordered: 'px-md',
      } satisfies Record<DisclosureVariant, string>,
    },
  },
);

const contentVariants = cva('block', {
  variants: {
    variant: {
      plain: 'pt-xs pb-sm',
      bordered: 'border-t border-line-subtle p-md',
    } satisfies Record<DisclosureVariant, string>,
  },
});

/**
 * More detail, expanded in place under its trigger: a statistic's breakdown, a feat's description.
 * The way to show secondary content without a modal or a route change. The only owner of
 * `<details>` and `<summary>`, so the browser handles keyboard, expanded state and find-in-page
 * (searching for hidden text opens the disclosure). Put the trigger's content in `frDisclosureSummary`;
 * everything else is the expanded content. The summary is one button to assistive tech, so its slot takes
 * phrasing content only (`fr-text` as a `span`, `fr-icon`): no `<p>`, and nothing interactive.
 * `[(open)]` follows the user's toggles.
 *
 * ```html
 * <fr-disclosure [(open)]="showBreakdown">
 *   <fr-text frDisclosureSummary>{{ 'sheet.ac' | transloco }}</fr-text>
 *   <pio-breakdown [statistic]="ac" />
 * </fr-disclosure>
 * ```
 */
@Component({
  selector: 'fr-disclosure',
  imports: [Icon],
  templateUrl: './disclosure.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Disclosure {
  public readonly open = model(false);
  public readonly variant = input<DisclosureVariant>(DisclosureVariant.Plain);

  protected readonly chevron = computed(() => (this.open() ? LucideChevronUp : LucideChevronDown));
  protected readonly rootClasses = computed(() => rootVariants({ variant: this.variant() }));
  protected readonly summaryClasses = computed(() => summaryVariants({ variant: this.variant() }));
  protected readonly contentClasses = computed(() => contentVariants({ variant: this.variant() }));

  /** The browser toggled `<details>` (a press, a key, or find-in-page); mirror it. */
  protected sync(open: boolean): void {
    this.open.set(open);
  }
}
