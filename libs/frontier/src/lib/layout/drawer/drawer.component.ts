import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
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

/** How wide a docked drawer is. Resizing steps between them, so the width is always a token. */
export const DrawerWidth = { Narrow: 'narrow', Default: 'default', Wide: 'wide' } as const;
export type DrawerWidth = (typeof DrawerWidth)[keyof typeof DrawerWidth];

/** Narrowest to widest, the order the resize handle steps through. */
const WIDTHS: readonly DrawerWidth[] = [DrawerWidth.Narrow, DrawerWidth.Default, DrawerWidth.Wide];
/** Each width in rem, as `--container-drawer-*` sets them, for placing a drag between steps. */
const WIDTH_REM: Readonly<Record<DrawerWidth, number>> = { narrow: 20, default: 28, wide: 40 };
/** Each width's message key, spelled out in full. */
const WIDTH_LABELS: Readonly<Record<DrawerWidth, string>> = {
  narrow: 'frontier.drawer.width.narrow',
  default: 'frontier.drawer.width.default',
  wide: 'frontier.drawer.width.wide',
};
const STORAGE_KEY = 'fr-drawer-width';
const OPEN_VALUE = 'open';
const REM_FALLBACK_PX = 16;

const hostVariants = cva('min-w-none', {
  variants: {
    open: { true: 'block @lg:shrink-0', false: 'hidden' },
    width: {
      narrow: '@lg:w-drawer-narrow',
      default: '@lg:w-drawer-default',
      wide: '@lg:w-drawer-wide',
    } satisfies Record<DrawerWidth, string>,
  },
});
const panelClasses = cva('flex gap-sm')();
const contentClasses = cva('flex min-w-none flex-1 flex-col gap-md')();
const headerClasses = cva('flex items-center justify-between gap-sm')();
const handleClasses = cva(
  'hidden w-sm shrink-0 cursor-col-resize border-s border-line-subtle hover:border-accent-solid focus-visible:focus-ring @lg:block',
)();
const headingClasses = cva('min-w-none focus:outline-hidden')();

function isWidth(value: string | null | undefined): value is DrawerWidth {
  return WIDTHS.some((width) => width === value);
}

/**
 * A right-hand panel docked beside the page's content. Open, it takes its width from the row and the content
 * narrows and reflows to make room; it never covers anything, and the page stays interactive: focus is not trapped.
 * Below the `lg` container size it stacks under the content, full width, instead of sitting beside it.
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
  protected readonly panelClasses = panelClasses;
  protected readonly contentClasses = contentClasses;
  protected readonly headerClasses = headerClasses;
  protected readonly handleClasses = handleClasses;
  protected readonly headingClasses = headingClasses;
  protected readonly widths = WIDTHS;
  protected readonly startResize = startResize;
  protected readonly endResize = endResize;

  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly storage = openStorage(this.document);

  public readonly width = signal<DrawerWidth>(readWidth(this.storage));
  protected readonly widthLabel = computed(() => WIDTH_LABELS[this.width()]);
  protected readonly widthIndex = computed(() => WIDTHS.indexOf(this.width()));
  protected readonly hostClasses = computed(() => hostVariants({ open: this.open(), width: this.width() }));

  private readonly queryParams = toSignal(this.route.queryParamMap);
  private readonly queryOpen = computed(() => this.queryParams()?.get(this.param()) === OPEN_VALUE);
  private opener: HTMLElement | undefined;
  private urlSeen = false;

  public constructor() {
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
  }

  public close(): void {
    this.open.set(false);
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

  /** On open focus goes to the title; on close it goes back to what had it when the drawer opened. */
  private moveFocus(open: boolean): void {
    const active = this.document.activeElement;
    if (open) {
      if (active instanceof HTMLElement && !this.host.nativeElement.contains(active)) {
        this.opener = active;
      }
      // The title exists once the open drawer has rendered.
      afterNextRender(
        () => {
          this.heading()?.nativeElement.focus();
        },
        { injector: this.injector },
      );
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

function startResize(event: PointerEvent): void {
  if (event.currentTarget instanceof HTMLElement) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
  }
}

function endResize(event: PointerEvent): void {
  if (event.currentTarget instanceof HTMLElement && event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
}

/** The width closest to a drag that ended `rem` wide. */
function nearestWidth(rem: number): DrawerWidth {
  let nearest: DrawerWidth = DrawerWidth.Default;
  for (const width of WIDTHS) {
    if (Math.abs(WIDTH_REM[width] - rem) < Math.abs(WIDTH_REM[nearest] - rem)) {
      nearest = width;
    }
  }
  return nearest;
}

function openStorage(document: Document): Storage | undefined {
  try {
    return document.defaultView?.localStorage;
  } catch {
    return undefined;
  }
}

function readWidth(storage: Storage | undefined): DrawerWidth {
  try {
    const stored = storage?.getItem(STORAGE_KEY);
    return isWidth(stored) ? stored : DrawerWidth.Default;
  } catch {
    return DrawerWidth.Default;
  }
}

function writeWidth(storage: Storage | undefined, width: DrawerWidth): void {
  try {
    storage?.setItem(STORAGE_KEY, width);
  } catch {
    // Storage full or blocked: the width still applies for this session.
  }
}
