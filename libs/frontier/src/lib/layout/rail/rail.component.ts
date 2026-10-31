import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A full-height column at the start of a region, for a list the reader wants in view while the rest of the region
 * scrolls: a complementary landmark. From the `lg` container size it sticks under the shell's header and fills the
 * height left below it, scrolling inside itself when its content is taller; narrower, it stacks above the region.
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
  host: {
    class:
      'block min-w-none @lg:sticky @lg:top-shell-header @lg:max-h-rail-height @lg:w-rail @lg:shrink-0 @lg:overflow-y-auto',
  },
})
export class Rail {
  /** The landmark's name, already translated. */
  public readonly label = input.required<string>();
}
