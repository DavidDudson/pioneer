import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

import { PADDING, Space } from '../../tokens';

export const BoxWidth = { Full: 'full', Prose: 'prose', Page: 'page' } as const;
export type BoxWidth = ValueOf<typeof BoxWidth>;

const WIDTH: Record<BoxWidth, string> = {
  full: 'w-full',
  prose: 'mx-auto w-full max-w-prose',
  page: 'mx-auto w-full max-w-page',
};

/**
 * A region: query container, max width and padding. Wrap a region in a box
 * when what is inside should respond to the region's width. `gutter` adds
 * inline padding that widens with the box (md, then xl from the `lg`
 * container size).
 */
@Component({
  selector: 'fr-box',
  templateUrl: './box.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClasses()' },
})
export class Box {
  public readonly width = input<BoxWidth>(BoxWidth.Full);
  public readonly padding = input<Space>(Space.None);
  public readonly gutter = input(false, { transform: booleanAttribute });

  protected readonly hostClasses = computed(() => `@container block min-w-0 ${WIDTH[this.width()]}`);
  protected readonly classes = computed(() =>
    [PADDING[this.padding()], this.gutter() ? 'px-md @lg:px-xl' : ''].join(' '),
  );
}
