import {
  afterRenderEffect,
  booleanAttribute,
  computed,
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

/** Inputs whose own keys are only Space and Enter, so the arrow keys are free to move focus. */
const PRESSABLE_INPUT = new Set(['button', 'checkbox', 'color', 'file', 'image', 'radio', 'reset', 'submit']);

/** A text field, select or editable region: it keeps the arrow keys, Home and End for itself. */
function usesArrowKeys(target: HTMLElement): boolean {
  if (target instanceof HTMLInputElement) {
    return !PRESSABLE_INPUT.has(target.type);
  }
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
}

/**
 * Roving focus for a dense group (segmented buttons, a chip row, sheet rows): the group is one Tab stop, and arrow
 * keys, Home and End move focus between its `frRovingFocusItem`s. Focus moves only; Enter and Space still press.
 * While focus is inside, the tab stop is the item last focused; once focus leaves, it goes back to the
 * `rovingSelected` item, else the first enabled one. An item that is a text field keeps its arrow keys.
 *
 * Horizontal follows the layout's direction (Right moves back in right-to-left). Grid moves along a row with
 * Left and Right and between rows with Up and Down; Home and End go to the row's ends, Ctrl+Home and Ctrl+End
 * to the first and last item. A grid counts its columns from the layout unless `rovingColumns` is set.
 *
 * Give the group a composite role so assistive tech announces arrow-key navigation: `toolbar` for a row of
 * buttons, `grid` or `listbox` where their item roles fit.
 *
 * Not `@angular/aria`'s toolbar or grid: their item directives must sit on the focusable element, and frontier
 * components such as `fr-button` render it themselves behind a `display: contents` host.
 *
 * ```html
 * <div role="toolbar" frRovingFocus="horizontal" rovingWrap>
 *   <fr-button frRovingFocusItem [rovingSelected]="chosen">…</fr-button>
 * </div>
 * ```
 */
@Directive({
  selector: '[frRovingFocus]',
  host: { '(keydown)': 'keydown($event)', '(focusin)': 'focusin($event)', '(focusout)': 'focusout($event)' },
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
  readonly #tabStop = computed(() => {
    const enabled = this.items().filter((item) => item.enabled());
    const active = this.#active();
    if (active !== undefined && enabled.includes(active)) {
      return active;
    }
    return enabled.find((item) => item.rovingSelected()) ?? enabled[0];
  });

  public constructor() {
    afterRenderEffect({
      write: () => {
        const stop = this.#tabStop();
        for (const item of this.items()) {
          item.target().setAttribute('tabindex', item === stop ? TAB_STOP : SKIPPED);
        }
      },
    });
  }

  protected focusin(event: FocusEvent): void {
    const item = this.items().find((candidate) => candidate.target() === event.target);
    if (item !== undefined) {
      this.#active.set(item);
    }
  }

  protected focusout(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !this.#host.contains(next)) {
      this.#active.set(undefined);
    }
  }

  protected keydown(event: KeyboardEvent): void {
    if (event.altKey || event.metaKey || event.shiftKey) {
      return;
    }
    const items = this.items();
    const from = items.findIndex((item) => item.target() === event.target);
    if (from === -1 || usesArrowKeys(items[from]?.target() ?? this.#host)) {
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

  /** `rovingColumns`, else how many items share the first item's row. Only a grid asks. */
  #columns(items: readonly RovingFocusItem[]): number {
    const columns = this.rovingColumns();
    if (columns !== undefined || this.orientation() !== RovingOrientation.Grid) {
      return columns ?? 1;
    }
    // A row ends where an item starts below the first item, so items of mixed height still share a row.
    const first = items[0]?.target().getBoundingClientRect();
    if (first === undefined || first.height === 0) {
      return items.length;
    }
    const nextRow = items.findIndex((item) => item.target().getBoundingClientRect().top >= first.bottom);
    return nextRow === -1 ? items.length : nextRow;
  }
}
