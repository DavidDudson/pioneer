import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { Container } from '../../tokens';

/** Hidden below the container size, shown from it. */
const SHOW_FROM: Readonly<Record<Container, string>> = {
  sm: 'hidden @sm:block',
  md: 'hidden @md:block',
  lg: 'hidden @lg:block',
};

/** Shown below the container size, hidden from it. */
const HIDE_FROM: Readonly<Record<Container, string>> = {
  sm: 'block @sm:hidden',
  md: 'block @md:hidden',
  lg: 'block @lg:hidden',
};

/**
 * Content that shows only from a container size up (`showFrom`), or only below it (`hideFrom`): the same choice in two
 * forms, such as tabs from `lg` and a dropdown under it. The size is that of the nearest responsive ancestor, an
 * `fr-stack` with `horizontalFrom`, as everywhere in frontier. The hidden side is `display: none`, so assistive
 * technology skips it too.
 *
 * ```html
 * <fr-responsive showFrom="lg"><fr-tabs …>…</fr-tabs></fr-responsive>
 * <fr-responsive hideFrom="lg"><fr-select …/></fr-responsive>
 * ```
 */
@Component({
  selector: 'fr-responsive',
  templateUrl: './responsive.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class Responsive {
  /** Hidden below this container size. */
  public readonly showFrom = input<Container | undefined>(undefined);
  /** Hidden from this container size up. */
  public readonly hideFrom = input<Container | undefined>(undefined);

  protected readonly classes = computed((): string => {
    const show = this.showFrom();
    const hide = this.hideFrom();
    if (show !== undefined) {
      return SHOW_FROM[show];
    }
    return hide === undefined ? 'block' : HIDE_FROM[hide];
  });
}
