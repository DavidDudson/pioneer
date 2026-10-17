import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  DestroyRef,
  ElementRef,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideX } from '@lucide/angular';
import { cva } from 'class-variance-authority';

import { Button, ButtonVariant } from '../../actions/button/button.component';
import { Icon } from '../../icon/icon.component';
import { Heading } from '../../text/heading/heading.component';
import { showDialog, watchNarrow } from './drawer-overlay';
import type { DrawerWidth } from './drawer-width';
import {
  endResize,
  nearestWidth,
  openStorage,
  readWidth,
  startResize,
  WIDTH_LABELS,
  WIDTHS,
  writeWidth,
} from './drawer-width';

const OPEN_VALUE = 'open';
const REM_FALLBACK_PX = 16;

const hostVariants = cva('min-w-none', {
  variants: {
    open: { true: 'block @lg:shrink-0', false: 'hidden' },
    // A modal drawer sits in the top layer, so its host takes no room in the page.
    overlay: { true: '', false: '' },
    width: {
      narrow: '@lg:w-drawer-narrow',
      default: '@lg:w-drawer-default',
      wide: '@lg:w-drawer-wide',
    } satisfies Record<DrawerWidth, string>,
  },
  compoundVariants: [{ open: true, overlay: true, class: 'contents' }],
});
const panelVariants = cva('flex gap-sm border-none text-fg-default', {
  variants: {
    overlay: {
      true: 'fixed inset-none m-none size-full max-h-none max-w-none overflow-auto bg-surface-base p-md backdrop:bg-surface-overlay',
      false: 'static m-none w-full bg-transparent p-none',
    },
  },
});
const contentClasses = cva('flex min-w-none flex-1 flex-col gap-md')();
const headerClasses = cva('flex items-center justify-between gap-sm')();
const handleClasses = cva(
  'hidden w-sm shrink-0 cursor-col-resize border-s border-line-subtle hover:border-accent-solid focus-visible:focus-ring @lg:block',
)();
const headingClasses = cva('min-w-none focus:outline-hidden')();

/**
 * A right-hand panel docked beside the page's content. Open, it takes its width from the row and the content
 * narrows and reflows to make room; it never covers anything, and the page stays interactive: focus is not trapped.
 * Below the `lg` container size of the row it sits in (ADR-0065) it is instead a full-screen modal `<dialog>`: focus
 * is trapped, Escape closes it and the page behind is inert. It is the one modal Pioneer allows. Crossing `lg` while
 * open switches between the two without closing.
 *
 * `open` is mirrored in a query parameter (`param`, `drawer` unless renamed), so a reload or a shared link keeps the
 * drawer as it was. Opening moves focus to the title; closing, by the close button or by Escape while focus is
 * inside, returns it to what had focus when the drawer opened. The width is stepped by arrow keys, Home and End on the
 * resize handle, or dragged, and is remembered in this browser.
 *
 * Project the content (a `router-outlet` or anything else). Put it inside `fr-page`, after the body.
 *
 * ```html
 * <fr-page>
 *   <fr-page-header [title]="'spells.title' | transloco" />
 *   <fr-page-body>…</fr-page-body>
 *   <fr-drawer [(open)]="detailOpen" [title]="spell.name">
 *     <router-outlet name="detail" />
 *   </fr-drawer>
 * </fr-page>
 * ```
 */
@Component({
  selector: 'fr-drawer',
  imports: [Button, Heading, Icon, TranslocoPipe],
  templateUrl: './drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
    '(keydown.escape)': 'closeFromKeyboard($event)',
  },
})
export class Drawer {
  /** Shown in the header and naming the landmark, already translated. */
  public readonly title = input.required<string>();
  public readonly open = model(false);
  /** The query parameter that carries `open`; rename it when a page holds more than one drawer. */
  public readonly param = input('drawer');

  protected readonly closeIcon = LucideX;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly contentClasses = contentClasses;
  protected readonly headerClasses = headerClasses;
  protected readonly handleClasses = handleClasses;
  protected readonly headingClasses = headingClasses;
  protected readonly widths = WIDTHS;
  protected readonly startResize = startResize;
  protected readonly endResize = endResize;

  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly panel = viewChild<ElementRef<HTMLDialogElement>>('panel');
  private readonly storage = openStorage(this.document);

  public readonly width = signal<DrawerWidth>(readWidth(this.storage));
  /** Whether the row the drawer sits in is below `lg`, so the drawer is a full-screen modal. */
  protected readonly overlay = signal(false);
  protected readonly widthLabel = computed(() => WIDTH_LABELS[this.width()]);
  protected readonly widthIndex = computed(() => WIDTHS.indexOf(this.width()));
  protected readonly hostClasses = computed(() =>
    hostVariants({ open: this.open(), overlay: this.overlay(), width: this.width() }),
  );
  protected readonly panelClasses = computed(() => panelVariants({ overlay: this.overlay() }));

  private readonly queryParams = toSignal(this.route.queryParamMap);
  private readonly queryOpen = computed(() => this.queryParams()?.get(this.param()) === OPEN_VALUE);
  private opener: HTMLElement | undefined;
  private urlSeen = false;
  private titleFocused = true;
  private stopWatching: (() => void) | undefined;
  private shown: { readonly dialog: HTMLDialogElement; readonly modal: boolean } | undefined;

  public constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopWatching?.();
    });
    // The address bar is the source of truth for a reload or a shared link.
    // At first only an open address counts: a closed one cannot override a drawer the page opened.
    effect(() => {
      const fromUrl = this.queryOpen();
      untracked(() => {
        const applies = fromUrl || this.urlSeen;
        this.urlSeen = true;
        if (applies && this.open() !== fromUrl) {
          this.open.set(fromUrl);
        }
      });
    });
    effect(() => {
      const open = this.open();
      untracked(() => {
        // oxlint-disable-next-line promise/prefer-await-to-then -- an effect cannot await; writeAddress handles its own errors
        this.writeAddress(open).catch(() => undefined);
        this.moveFocus(open);
      });
    });
    effect(() => {
      writeWidth(this.storage, this.width());
    });
    // Runs once the dialog exists and again when the mode changes.
    effect(() => {
      const dialog = this.panel()?.nativeElement;
      const modal = this.overlay();
      untracked(() => {
        this.showPanel(dialog, modal);
      });
    });
  }

  public close(): void {
    this.open.set(false);
  }

  /** Escape in a modal drawer would only close the dialog; close the drawer, so the address and focus follow. */
  protected cancelFromDialog(event: Event): void {
    event.preventDefault();
    this.close();
  }

  /** Escape closes the drawer only while focus is inside it, so it never steals the key from the page. */
  protected closeFromKeyboard(event: Event): void {
    if (this.open() && !event.defaultPrevented) {
      event.preventDefault();
      this.close();
    }
  }

  /** Arrow keys step the width: toward the left grows the drawer, since its edge faces the content. */
  protected resizeFromKeyboard(event: KeyboardEvent): void {
    const index = this.widthIndex();
    const next = {
      ArrowLeft: index + 1,
      ArrowUp: index + 1,
      ArrowRight: index - 1,
      ArrowDown: index - 1,
      Home: 0,
      End: WIDTHS.length - 1,
    }[event.key];
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    const width = WIDTHS[Math.min(Math.max(next, 0), WIDTHS.length - 1)];
    if (width !== undefined) {
      this.width.set(width);
    }
  }

  protected dragResize(event: PointerEvent): void {
    if (!(event.currentTarget instanceof HTMLElement) || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    const drawerRem = (this.host.nativeElement.getBoundingClientRect().right - event.clientX) / this.remPx();
    this.width.set(nearestWidth(drawerRem));
  }

  /** Keeps the query parameter as `open` says, leaving every other parameter alone. */
  private async writeAddress(open: boolean): Promise<void> {
    if (open === this.queryOpen()) {
      return;
    }
    try {
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { [this.param()]: open ? OPEN_VALUE : undefined },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    } catch {
      // A navigation that is cancelled leaves the address as it was.
    }
  }

  /** Shows the dialog docked or modal, only when it is new or its mode changed; a new one takes focus to the title. */
  private showPanel(dialog: HTMLDialogElement | undefined, modal: boolean): void {
    if (dialog === undefined) {
      this.shown = undefined;
      return;
    }
    if (this.shown?.dialog === dialog && this.shown.modal === modal) {
      return;
    }
    showDialog(dialog, modal);
    this.shown = { dialog, modal };
    this.watchContainer();
    if (!this.titleFocused) {
      this.titleFocused = true;
      this.heading()?.nativeElement.focus();
    }
  }

  /** Starts watching the row's width once the host is in the page; the first reading arrives before the next paint. */
  private watchContainer(): void {
    const container = this.host.nativeElement.parentElement;
    if (this.stopWatching === undefined && container !== null) {
      this.stopWatching = watchNarrow(container, this.remPx(), (narrow) => {
        this.overlay.set(narrow);
      });
    }
  }

  /** On open focus goes to the title; on close it goes back to what had it when the drawer opened. */
  private moveFocus(open: boolean): void {
    const active = this.document.activeElement;
    if (open) {
      if (active instanceof HTMLElement && !this.host.nativeElement.contains(active)) {
        this.opener = active;
      }
      // The title takes focus once the dialog is shown, in showPanel.
      this.titleFocused = false;
      return;
    }
    const { opener } = this;
    this.opener = undefined;
    const focusLost = active === this.document.body || this.host.nativeElement.contains(active);
    if (opener !== undefined && focusLost) {
      opener.focus();
    }
  }

  private remPx(): number {
    const size = this.document.defaultView?.getComputedStyle(this.document.documentElement).fontSize;
    return Number(size?.replace('px', '')) || REM_FALLBACK_PX;
  }
}
