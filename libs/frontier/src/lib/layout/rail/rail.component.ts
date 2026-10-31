import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const BESIDE =
  'min-w-none @lg:sticky @lg:top-shell-header @lg:max-h-rail-height @lg:w-rail @lg:shrink-0 @lg:overflow-y-auto';

/**
 * A full-height column at the start of a region, for a list the reader wants in view while the rest of the region
 * scrolls: a complementary landmark. From the `lg` container size it sticks under the shell's header and fills the
 * height left below it, scrolling inside itself when its content is taller; narrower, it stacks above the region, or
 * is hidden with `hiddenNarrow`.
 * Sits in an `fr-stack` with `horizontalFrom="lg"` beside the content it accompanies.
 *
 * ```html
 * <fr-stack horizontalFrom="lg" align="start">
 *   <fr-rail [label]="'sheet.skills' | transloco">…</fr-rail>
 *   <fr-stack grow>…</fr-stack>
 * </fr-stack>
 * ```
 */
@Component({
  selector: 'fr-rail',
  templateUrl: './rail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class Rail {
  /** The landmark's name, already translated. */
  public readonly label = input.required<string>();
  /** Shows only from `lg`, beside the content, instead of stacking above it when narrower. */
  public readonly hiddenNarrow = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(
    (): string => `${this.hiddenNarrow() ? 'hidden @lg:block' : 'block'} ${BESIDE}`,
  );
}
