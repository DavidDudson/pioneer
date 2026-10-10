import {
  afterEveryRender,
  booleanAttribute,
  contentChildren,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { RovingFocusItem } from './roving-focus-item.directive';
import { RovingOrientation, rovingTarget } from './roving-keys';

const TAB_STOP = '0';
const SKIPPED = '-1';

/**
 * Roving focus for a dense group (segmented buttons, a chip row, sheet rows): the group is one Tab stop, and arrow
 * keys, Home and End move focus between its `frRovingFocusItem`s. Focus moves only; Enter and Space still press.
 * The tab stop is the item last focused, else the `rovingSelected` one, else the first enabled one.
 *
 * Horizontal follows the layout's direction (Right moves back in right-to-left). Grid moves along a row with
 * Left and Right and between rows with Up and Down; Home and End go to the row's ends, Ctrl+Home and Ctrl+End
 * to the first and last item. A grid counts its columns from the layout unless `rovingColumns` is set.
 *
 * ```html
 * <div role="group" frRovingFocus="horizontal" rovingWrap>
 *   <fr-button frRovingFocusItem [rovingSelected]="chosen">…</fr-button>
 * </div>
 * ```
 */
@Directive({
  selector: '[frRovingFocus]',
  host: { '(keydown)': 'keydown($event)', '(focusin)': 'focusin($event)' },
})
export class RovingFocus {
  public readonly orientation = input<RovingOrientation, RovingOrientation | ''>(RovingOrientation.Horizontal, {
    alias: 'frRovingFocus',
    transform: (value) => (value === '' ? RovingOrientation.Horizontal : value),
  });
  /** Past the last item, go round to the first (and the reverse). Horizontal and vertical only. */
  public readonly rovingWrap = input(false, { transform: booleanAttribute });
  /** Grid columns; by default the items on the first row are counted. */
  public readonly rovingColumns = input<number | undefined>(undefined);

  protected readonly items = contentChildren(RovingFocusItem, { descendants: true });
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #active = signal<RovingFocusItem | undefined>(undefined);

  public constructor() {
    // Every render, since an item's disabled state lives in the DOM where no signal sees it.
    afterEveryRender({
      write: () => {
        this.#assignTabStop();
      },
    });
  }

  protected focusin(event: FocusEvent): void {
    const item = this.items().find((candidate) => candidate.target() === event.target);
    if (item !== undefined) {
      this.#active.set(item);
      this.#assignTabStop();
    }
  }

  protected keydown(event: KeyboardEvent): void {
    if (event.altKey || event.metaKey || event.shiftKey) {
      return;
    }
    const items = this.items();
    const from = items.findIndex((item) => item.target() === event.target);
    if (from === -1) {
      return;
    }
    const to = rovingTarget({
      key: event.key,
      ctrl: event.ctrlKey,
      orientation: this.orientation(),
      rtl: getComputedStyle(this.#host).direction === 'rtl',
      from,
      enabled: items.map((item) => item.enabled()),
      columns: this.#columns(items),
      wrap: this.rovingWrap(),
    });
    if (to !== undefined) {
      event.preventDefault();
      items[to]?.target().focus();
    }
  }

  #assignTabStop(): void {
    const items = this.items();
    const stop = this.#tabStop(items);
    for (const item of items) {
      item.target().setAttribute('tabindex', item === stop ? TAB_STOP : SKIPPED);
    }
  }

  #tabStop(items: readonly RovingFocusItem[]): RovingFocusItem | undefined {
    const enabled = items.filter((item) => item.enabled());
    const active = this.#active();
    if (active !== undefined && enabled.includes(active)) {
      return active;
    }
    return enabled.find((item) => item.rovingSelected()) ?? enabled[0];
  }

  /** `rovingColumns`, else how many items share the first item's row. Only a grid asks. */
  #columns(items: readonly RovingFocusItem[]): number {
    const columns = this.rovingColumns();
    if (columns !== undefined || this.orientation() !== RovingOrientation.Grid) {
      return columns ?? 1;
    }
    const firstTop = items[0]?.target().getBoundingClientRect().top;
    const nextRow = items.findIndex((item) => item.target().getBoundingClientRect().top !== firstTop);
    return nextRow === -1 ? items.length : nextRow;
  }
}
