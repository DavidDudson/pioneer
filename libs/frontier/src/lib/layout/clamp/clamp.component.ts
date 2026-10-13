import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

/** How many lines of content show before it is cut off with an ellipsis. */
export const ClampLines = { One: 1, Two: 2, Three: 3, Four: 4 } as const;
export type ClampLines = ValueOf<typeof ClampLines>;

const clampVariants = cva('overflow-hidden', {
  variants: {
    lines: {
      1: 'line-clamp-1',
      2: 'line-clamp-2',
      3: 'line-clamp-3',
      4: 'line-clamp-4',
    } satisfies Record<ClampLines, string>,
  },
});

/**
 * Cuts its content off after a few lines, with an ellipsis: a summary in a table cell that must not grow its row.
 * The whole content stays in the page for assistive technology.
 *
 * ```html
 * <fr-clamp [lines]="2"><fr-text>A long description…</fr-text></fr-clamp>
 * ```
 */
@Component({
  selector: 'fr-clamp',
  templateUrl: './clamp.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Clamp {
  public readonly lines = input<ClampLines>(ClampLines.Three);

  protected readonly classes = computed(() => clampVariants({ lines: this.lines() }));
}
