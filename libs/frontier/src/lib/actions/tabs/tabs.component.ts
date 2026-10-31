import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  inject,
  input,
  viewChild,
} from '@angular/core';
import type { ElementRef, Signal } from '@angular/core';
import { cva } from 'class-variance-authority';

import { RovingFocus } from '../../focus/roving-focus.directive';
import { Tab } from '../tab/tab.component';
import { TABS_APPEARANCE, TabsAppearance } from './tabs-appearance';

const navVariants = cva('block overflow-x-auto', {
  variants: { appearance: { underline: 'border-b border-line-subtle', segment: '' } },
});
// The padding leaves room for the focus ring, which the scrolling region would otherwise clip.
// A centred row takes auto margins, not `justify-center`, which would push its first tabs out of reach of the scroll.
const rowVariants = cva('flex', {
  variants: {
    appearance: {
      underline: 'gap-2xs p-2xs',
      segment: 'w-fit gap-3xs border border-line-default bg-surface-base p-3xs',
    },
    centered: { true: 'mx-auto w-fit', false: '' },
  },
});

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
  providers: [{ provide: TABS_APPEARANCE, useFactory: (): Signal<TabsAppearance> => inject(Tabs).appearance }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  hostDirectives: [RovingFocus],
})
export class Tabs {
  /** Names the navigation landmark, already translated. */
  public readonly label = input.required<string>();

  /** `underline` (the default) or `segment`, the look of `fr-segmented`: for tabs that switch between a few sections of one page. */
  public readonly appearance = input<TabsAppearance>(TabsAppearance.Underline);
  /** Puts the row in the middle of the page rather than at its start. */
  public readonly centered = input(false, { transform: booleanAttribute });

  protected readonly navClasses = computed(() => navVariants({ appearance: this.appearance() }));
  protected readonly rowClasses = computed(() =>
    rowVariants({ appearance: this.appearance(), centered: this.centered() }),
  );

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
