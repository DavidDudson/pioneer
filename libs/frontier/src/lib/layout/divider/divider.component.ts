import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

export const DividerOrientation = {
  /** A thematic break between blocks. Read out as a separator. */
  Horizontal: 'horizontal',
  /** A rule between items in a row. Decorative: hidden from assistive technology. */
  Vertical: 'vertical',
} as const;
export type DividerOrientation = ValueOf<typeof DividerOrientation>;

/** The `line-*` token the rule is drawn in. */
export const DividerTone = {
  Subtle: 'subtle',
  Default: 'default',
  Strong: 'strong',
} as const;
export type DividerTone = ValueOf<typeof DividerTone>;

/**
 * Horizontal keeps preflight's `<hr>`: zero height, a top border. Vertical is a `<span>` with an inline-start
 * border that stretches to the row it sits in.
 */
const dividerVariants = cva('shrink-0', {
  variants: {
    orientation: {
      horizontal: 'w-full border-t',
      vertical: 'self-stretch border-s',
    } satisfies Record<DividerOrientation, string>,
    tone: {
      subtle: 'border-line-subtle',
      default: 'border-line-default',
      strong: 'border-line-strong',
    } satisfies Record<DividerTone, string>,
  },
});

/**
 * A 1px rule that separates regions, in place of an ad hoc border. Horizontal is an `<hr>` separator between
 * blocks. Vertical sits between items in a horizontal `fr-stack` and is decorative, an `aria-hidden` `<span>`.
 *
 * ```html
 * <fr-stack direction="horizontal" gap="sm">
 *   <fr-text>AC 18</fr-text>
 *   <fr-divider orientation="vertical" />
 *   <fr-text>HP 32</fr-text>
 * </fr-stack>
 * ```
 */
@Component({
  selector: 'fr-divider',
  templateUrl: './divider.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Divider {
  public readonly orientation = input<DividerOrientation>(DividerOrientation.Horizontal);
  public readonly tone = input<DividerTone>(DividerTone.Subtle);

  protected readonly vertical = computed(() => this.orientation() === DividerOrientation.Vertical);
  protected readonly classes = computed(() => dividerVariants({ orientation: this.orientation(), tone: this.tone() }));
}
