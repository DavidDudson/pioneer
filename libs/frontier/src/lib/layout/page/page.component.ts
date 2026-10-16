import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Box } from '../box/box.component';
import { Stack } from '../stack/stack.component';

/**
 * A routed page, composed from parts: an `fr-page-header`, then an `fr-page-body` with an optional `fr-page-aside`
 * beside it. The page renders at once; regions load their own data behind skeletons.
 * It sits in `fr-shell`'s `<main>`, so it renders no landmark of its own.
 * Built only from layout primitives; it has no responsive CSS of its own.
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
export class Page {}
