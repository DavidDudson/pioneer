import { ChangeDetectionStrategy, Component, DestroyRef, inject, input } from '@angular/core';

import { Box, BoxWidth } from '../box/box.component';
import { ShellWidth } from '../shell-width/shell-width';
import { Stack } from '../stack/stack.component';

/**
 * A routed page, composed from parts: an `fr-page-header`, then an `fr-page-body` with an optional `fr-page-aside`
 * beside it and an optional `fr-drawer` docked after both. The page renders at once; regions load their own data behind skeletons.
 * It sits in `fr-shell`'s `<main>`, so it renders no landmark of its own.
 * Built only from layout primitives; it has no responsive CSS of its own.
 * Its width is the shell's too (`ShellWidth`), so the header and footer line up with the content.
 *
 * ```html
 * <fr-page>
 *   <fr-page-header [title]="'characters.title' | transloco" />
 *   <fr-page-body>…</fr-page-body>
 *   <fr-page-aside [label]="'characters.asideLabel' | transloco">…</fr-page-aside>
 * </fr-page>
 * ```
 */
@Component({
  selector: 'fr-page',
  imports: [Box, Stack],
  templateUrl: './page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Page {
  /** `page` caps the content at the page width and centres it; `full` uses all the room the shell gives it. */
  public readonly width = input<BoxWidth>(BoxWidth.Page);

  public constructor() {
    const release = inject(ShellWidth).show(this.width);
    inject(DestroyRef).onDestroy(release);
  }
}
