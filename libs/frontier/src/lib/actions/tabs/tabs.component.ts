import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  input,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';
import { cva } from 'class-variance-authority';

import { RovingFocus } from '../../focus/roving-focus.directive';
import { Tab } from '../tab/tab.component';

const navClasses = cva('block overflow-x-auto border-b border-line-subtle')();
// The padding leaves room for the focus ring, which the scrolling region would otherwise clip.
const rowClasses = cva('flex gap-2xs p-2xs')();

/**
 * Section tabs: a row of `fr-tab` router links, each section its own route, so the URL says which one is shown.
 * There are no hidden panels; the routed section renders in the `router-outlet` below. The row is a labelled
 * `<nav>` and one Tab stop: arrow keys, Home and End move between tabs, Enter follows one. On a narrow screen the
 * row scrolls sideways, an explicit overflow region, and keeps the current tab in view.
 *
 * ```html
 * <fr-tabs [label]="'sheet.sections' | transloco">
 *   <fr-tab to="overview" exact>{{ 'sheet.overview' | transloco }}</fr-tab>
 *   <fr-tab to="feats">{{ 'sheet.feats' | transloco }}</fr-tab>
 * </fr-tabs>
 * <router-outlet />
 * ```
 */
@Component({
  selector: 'fr-tabs',
  templateUrl: './tabs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  hostDirectives: [RovingFocus],
})
export class Tabs {
  /** Names the navigation landmark, already translated. */
  public readonly label = input.required<string>();

  protected readonly navClasses = navClasses;
  protected readonly rowClasses = rowClasses;

  private readonly tabs = contentChildren(Tab, { descendants: true });
  private readonly nav = viewChild.required<ElementRef<HTMLElement>>('nav');

  public constructor() {
    afterRenderEffect({
      read: () => {
        const current = this.tabs().find((tab) => tab.current());
        if (current !== undefined) {
          revealInline(this.nav().nativeElement, current.target());
        }
      },
    });
  }
}

/**
 * Scrolls `region` sideways until `element` is inside it. Not `scrollIntoView`, which would also scroll the page
 * back up to the tabs after a navigation further down.
 */
function revealInline(region: HTMLElement, element: HTMLElement): void {
  const bounds = region.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  if (rect.left < bounds.left) {
    region.scrollBy({ left: rect.left - bounds.left });
  } else if (rect.right > bounds.right) {
    region.scrollBy({ left: rect.right - bounds.right });
  }
}
