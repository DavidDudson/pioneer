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
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideSearch } from '@lucide/angular';
import { cva } from 'class-variance-authority';

import { Breadcrumbs } from '../../actions/breadcrumbs/breadcrumbs.component';
import { Button } from '../../actions/button/button.component';
import { Link } from '../../actions/link/link.component';
import { Icon } from '../../icon/icon.component';
import { Badge } from '../../text/badge/badge.component';
import { Text } from '../../text/text/text.component';
import { Box } from '../box/box.component';
import { HeaderCrumbs } from '../header-crumbs/header-crumbs';
import { Stack } from '../stack/stack.component';

const shellClasses = cva('flex min-h-dvh flex-col bg-surface-canvas pr-safe-right pl-safe-left')();
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
 * Built only from layout primitives; it has no responsive CSS of its own.
 */
@Component({
  selector: 'fr-shell',
  imports: [Badge, Box, Breadcrumbs, Button, Icon, Link, Stack, Text, TranslocoPipe],
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

  protected readonly crumbs = inject(HeaderCrumbs);
  protected readonly searchIcon = LucideSearch;

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
  // Focused only by the skip link, as the starting point for the next Tab: the page itself draws no outline.
  protected readonly contentClasses = cva('flex-1 focus:outline-hidden')();
  protected readonly footerClasses = footerClasses;

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);
  private readonly header = viewChild.required<ElementRef<HTMLElement>>('header');
  private readonly searchSlot = viewChild.required<ElementRef<HTMLElement>>('searchSlot');
  private readonly searchButton = viewChild<ElementRef<HTMLElement>>('searchButton');

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
