import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

/** The `line-*` token the rule is drawn in. */
export const DividerTone = {
  Subtle: 'subtle',
  Default: 'default',
  Strong: 'strong',
} as const;

export type DividerTone = ValueOf<typeof DividerTone>;

/** Preflight's `<hr>` is zero height with a top border, so the rule is that border in a line token. */
const dividerVariants = cva('w-full shrink-0 border-t', {
  variants: {
    tone: {
      subtle: 'border-line-subtle',
      default: 'border-line-default',
      strong: 'border-line-strong',
    } satisfies Record<DividerTone, string>,
  },
});

/**
 * A 1px `<hr>` separator between blocks, in place of an ad hoc border.
 *
 * ```html
 * <fr-text>Strength +4, Dexterity +2</fr-text>
 * <fr-divider />
 * <fr-text>Perception +12; darkvision</fr-text>
 * ```
 */
@Component({
  selector: 'fr-divider',
  templateUrl: './divider.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Divider {
  public readonly tone = input<DividerTone>(DividerTone.Subtle);

  protected readonly classes = computed(() => dividerVariants({ tone: this.tone() }));
}
