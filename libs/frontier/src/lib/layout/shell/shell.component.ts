import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideEllipsisVertical, LucideSearch } from '@lucide/angular';
import { cva } from 'class-variance-authority';

import { Breadcrumbs } from '../../actions/breadcrumbs/breadcrumbs.component';
import { Button, ButtonVariant } from '../../actions/button/button.component';
import { Link } from '../../actions/link/link.component';
import { Icon } from '../../icon/icon.component';
import { Badge } from '../../text/badge/badge.component';
import { Text } from '../../text/text/text.component';
import { Box } from '../box/box.component';
import { Dropdown, DropdownAlign } from '../dropdown/dropdown.component';
import { HeaderCrumbs } from '../header-crumbs/header-crumbs';
import { Stack } from '../stack/stack.component';
import { readMinimised, writeMinimised } from './shell-panel-state';

const shellClasses = cva('@container flex min-h-dvh flex-col bg-surface-canvas pr-safe-right pl-safe-left')();
/**
 * Beside the page from `lg`, fixed to the end edge below the header and scrolling inside itself; narrower, a bar along
 * the bottom edge. Logical properties, so it moves to the start edge in right-to-left layouts.
 */
const panelVariants = cva(
  [
    'fixed z-sticky overflow-auto border-line-subtle bg-surface-base',
    'inset-x-none bottom-none h-shell-panel-bar pb-safe-bottom',
    '@lg:inset-x-auto @lg:end-safe-right @lg:top-shell-header @lg:h-auto @lg:w-shell-panel @lg:border-s @lg:pb-none',
  ].join(' '),
  { variants: { shown: { true: '', false: 'hidden' } } },
);
/** Room kept in the page for the panel, so nothing sits under it. */
const contentVariants = cva('flex-1 focus:outline-hidden', {
  variants: { panel: { true: 'pb-shell-panel-bar @lg:pe-shell-panel @lg:pb-none', false: '' } },
});
const headerClasses = cva('sticky top-none z-sticky border-b border-line-subtle bg-surface-base pt-safe-top')();
/** The search takes the row's width once open; until then it is out of the layout, behind its button. */
const searchVariants = cva('', { variants: { open: { true: 'min-w-none flex-1 *:block', false: 'hidden' } } });
const footerClasses = cva('border-t border-line-subtle bg-surface-base pb-safe-bottom')();

/** The id of the shell's `<main>`, which its skip link moves focus to. There is one shell per page. */
const MAIN_ID = 'fr-main';

/** The tokens the shell sets on itself from its header's measured height, which wraps on narrow screens: a sticky rail sits below it. */
const HEADER_HEIGHT_PROPERTY = '--fr-size-shell-header';
const RAIL_HEIGHT_PROPERTY = '--fr-size-rail-height';

/**
 * App chrome: one-row top bar with the brand (and an optional badge), the breadcrumbs of the open page (shown by its
 * `fr-page-header`), a search slot (`frShellSearch`) and an actions slot (`frShellActions`,
 * e.g. menus), routed content below in the page's only `<main>`.
 * The search shows as an icon button until `searchOpen`. Open, it takes the row's width in place of the
 * breadcrumbs, and Escape or leaving it closes it.
 * A skip link, hidden until focused, is the first thing Tab reaches and moves
 * focus past the header to `<main>`.
 * Pads for notches and home indicators (needs `viewport-fit=cover`).
 * A panel slot (`frShellPanel`) is fixed to the end edge below the header, outside `<main>`, once the page sets
 * `panelAvailable`; the page keeps matching end padding, and below `lg` the panel is a bar along the bottom edge.
 * While available, a three-dot menu in the header minimises and restores it; the choice is kept in this browser.
 * Built only from layout primitives; apart from the panel, it has no responsive CSS of its own.
 */
@Component({
  selector: 'fr-shell',
  imports: [Badge, Box, Breadcrumbs, Button, Dropdown, Icon, Link, Stack, Text, TranslocoPipe],
  templateUrl: './shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClasses', '(keydown.escape)': 'escaped($event)', '(focusout)': 'searchBlurred($event)' },
})
export class Shell {
  public readonly brand = input.required<string>();
  /** A short status beside the brand, already translated ("Pre-Alpha"). */
  public readonly badge = input<string | undefined>(undefined);

  /** Whether a search is projected into `frShellSearch`: without one there is no button to open it. */
  public readonly searchAvailable = input(false);
  /** Whether the search is open: it replaces the breadcrumbs and takes the row's width. */
  public readonly searchOpen = model(false);

  /** Whether the page has a panel to show: without one the slot is empty and the header has no menu for it. */
  public readonly panelAvailable = input(false);
  /** Names the panel in its landmark and in the menu entry, already translated ("Party"). */
  public readonly panelLabel = input('');

  protected readonly crumbs = inject(HeaderCrumbs);
  protected readonly searchIcon = LucideSearch;
  protected readonly menuIcon = LucideEllipsisVertical;
  protected readonly menuAlign = DropdownAlign.End;
  protected readonly menuVariant = ButtonVariant.Menu;

  protected readonly hostClasses = shellClasses;
  protected readonly mainId = MAIN_ID;
  protected readonly headerClasses = headerClasses;
  protected readonly skipLinkClasses = cva(
    'sr-only focus-within:not-sr-only focus-within:block focus-within:px-md focus-within:py-sm',
  )();
  protected readonly brandClasses = cva('shrink-0')();
  protected readonly crumbsClasses = cva('min-w-none flex-1')();
  protected readonly searchClasses = computed(() => searchVariants({ open: this.searchOpen() }));
  protected readonly actionsClasses = cva('shrink-0')();
  protected readonly footerClasses = footerClasses;

  readonly #document = inject(DOCUMENT);
  /** The user's choice to hide the panel, kept in this browser. */
  protected readonly panelMinimised = signal(readMinimised(this.#document));
  protected readonly panelShown = computed(() => this.panelAvailable() && !this.panelMinimised());
  protected readonly panelClasses = computed(() => panelVariants({ shown: this.panelShown() }));
  protected readonly panelToggleKey = computed(() =>
    this.panelMinimised() ? 'frontier.shell.showPanel' : 'frontier.shell.hidePanel',
  );
  // Focused only by the skip link, as the starting point for the next Tab: the page itself draws no outline.
  protected readonly contentClasses = computed(() => contentVariants({ panel: this.panelShown() }));

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);
  private readonly header = viewChild.required<ElementRef<HTMLElement>>('header');
  private readonly searchSlot = viewChild.required<ElementRef<HTMLElement>>('searchSlot');
  private readonly searchButton = viewChild<ElementRef<HTMLElement>>('searchButton');

  protected togglePanel(): void {
    const minimised = !this.panelMinimised();
    this.panelMinimised.set(minimised);
    writeMinimised(this.#document, minimised);
  }

  protected openSearch(): void {
    this.searchOpen.set(true);
  }

  /** Escape closes the search and hands focus back to its button; leaving it closes it and leaves focus where it went. */
  protected closeSearch(returnFocus: boolean): void {
    if (!this.searchOpen()) {
      return;
    }
    this.searchOpen.set(false);
    if (returnFocus) {
      afterNextRender(
        () => {
          this.searchButton()?.nativeElement.querySelector('button')?.focus();
        },
        { injector: this.#injector },
      );
    }
  }

  protected escaped(event: Event): void {
    if (event.target instanceof Node && this.searchSlot().nativeElement.contains(event.target)) {
      this.closeSearch(true);
    }
  }

  protected searchBlurred(event: FocusEvent): void {
    const slot = this.searchSlot().nativeElement;
    const fromSearch = event.target instanceof Node && slot.contains(event.target);
    const toSearch = event.relatedTarget instanceof Node && slot.contains(event.relatedTarget);
    if (fromSearch && !toSearch) {
      this.closeSearch(false);
    }
  }

  public constructor() {
    effect(() => {
      if (!this.searchOpen()) {
        return;
      }
      // The box is hidden until it opens, and a hidden box cannot take focus.
      afterNextRender(
        () => {
          const slot = this.searchSlot().nativeElement;
          if (!slot.contains(document.activeElement)) {
            slot.querySelector('input')?.focus();
          }
        },
        { injector: this.#injector },
      );
    });
    afterNextRender(() => {
      const header = this.header().nativeElement;
      const publish = (): void => {
        const { style } = this.#host.nativeElement;
        style.setProperty(HEADER_HEIGHT_PROPERTY, `${header.offsetHeight}px`);
        style.setProperty(RAIL_HEIGHT_PROPERTY, `calc(100dvh - ${header.offsetHeight}px)`);
      };
      publish();
      const observer = new ResizeObserver(publish);
      observer.observe(header);
      this.#destroyRef.onDestroy(() => {
        observer.disconnect();
      });
    });
  }
}
