import { Combobox as AriaCombobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import type { ElementRef } from '@angular/core';
import { injectDebouncer } from '@tanstack/angular-pacer';

import { Control } from '../control';
import { SEARCH_DEBOUNCE } from '../search-input/search-input.component';
import type { SelectOption } from '../select/select.component';
import { ComboboxStatus } from './combobox-status.component';
import {
  comboboxInputClasses,
  comboboxListboxClasses,
  comboboxOptionClasses,
  comboboxPopupClasses,
} from './combobox.variants';
import { injectOptionVirtualizer, optionOffset } from './option-virtualizer';

interface Picked<TValue extends string> {
  readonly value: TValue | undefined;
  readonly label: string | undefined;
}

/**
 * Plain single pick from a long list (feats, spells, items) by typing to
 * filter, on `@angular/aria` (combobox + listbox). The listbox opens inline
 * below the input, pushing content down rather than covering it.
 *
 * Query out, options in: `searched` fires with the typed query once typing
 * goes quiet (`SEARCH_DEBOUNCE`); the feature runs its query and passes the
 * matches as `options`, with `loading` while they load (skeleton rows).
 * Options are virtualised (TanStack Virtual on the listbox's own scroll), so
 * hundreds stay cheap. `committed` fires on a pick, or Enter on a closed
 * list; Escape puts the picked label back and fires `cancelled`. In a form
 * use `fr-combobox-field`.
 */
@Component({
  selector: 'fr-combobox',
  imports: [AriaCombobox, ComboboxPopup, ComboboxStatus, ComboboxWidget, Listbox, Option],
  templateUrl: './combobox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Combobox<TValue extends string> extends Control {
  /** The picked value; `undefined` until the user picks. */
  public readonly value = model<TValue | undefined>(undefined);
  /** The matches for the last `searched` query. */
  public readonly options = input.required<readonly SelectOption<TValue>[]>();
  /** Options are loading: the listbox shows skeleton rows. */
  public readonly loading = input(false, { transform: booleanAttribute });
  public readonly placeholder = input('');
  /** The typed query, debounced. Never fired for the label a pick fills in. */
  public readonly searched = output<string>();

  protected readonly expanded = signal(false);
  /** The picked value and its label, once an option for it has loaded. */
  readonly #picked = computed<Picked<TValue>>(
    () => {
      const value = this.value();
      return { value, label: value === undefined ? undefined : this.#labelOf(value) };
    },
    { equal: (left, right) => left.value === right.value && left.label === right.label },
  );
  /** The picked option's last known label, kept while a search leaves the option out. */
  readonly #pickedLabel = linkedSignal<Picked<TValue>, string | undefined>({
    source: this.#picked,
    computation: (picked, previous) => {
      if (picked.label !== undefined || previous === undefined) {
        return picked.label;
      }
      return previous.source.value === picked.value ? previous.value : undefined;
    },
  });
  /** The picked value with its last known label; `text` reads it, so the label is remembered from the start. */
  readonly #shown = computed<Picked<TValue>>(() => ({ value: this.value(), label: this.#pickedLabel() }), {
    equal: (left, right) => left.value === right.value && left.label === right.label,
  });
  /**
   * The input's text: the typed query, or the picked option's label. The label also fills in when
   * its option arrives after the value (an async source), but never over typing in an open list.
   */
  protected readonly text = linkedSignal<Picked<TValue>, string>({
    source: this.#shown,
    computation: (picked, previous) => {
      if (picked.value === undefined) {
        return '';
      }
      if (previous !== undefined && untracked(this.expanded)) {
        return previous.value;
      }
      return picked.label ?? previous?.value ?? '';
    },
  });
  /** The picked value while it is among the options; the listbox drops values it has no option for. */
  protected readonly selected = computed<TValue[]>(() => {
    const value = this.value();
    return value !== undefined && this.#pickedIndex() !== undefined ? [value] : [];
  });

  protected readonly inputClasses = comboboxInputClasses;
  protected readonly popupClasses = comboboxPopupClasses;
  protected readonly listboxClasses = comboboxListboxClasses;
  protected readonly optionClasses = comboboxOptionClasses;
  protected readonly translate = optionOffset;

  protected readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  protected readonly optionElements = viewChildren<ElementRef<HTMLElement>>('optionElement');
  protected readonly ariaOptions = viewChildren<Option<TValue>>(Option);
  protected readonly listbox = viewChild<Listbox<TValue>>(Listbox);

  readonly #indexByValue = computed(
    () => new Map(this.options().map((option, index): [TValue, number] => [option.value, index])),
  );
  readonly #pickedIndex = computed(() => {
    const value = this.value();
    return value === undefined ? undefined : this.#indexByValue().get(value);
  });
  /** The keyboard-highlighted option's index. */
  readonly #activeIndex = computed(() => {
    const active = this.ariaOptions().find((option) => option.active());
    return active === undefined ? undefined : this.#indexByValue().get(active.value());
  });

  protected readonly virtualizer = injectOptionVirtualizer({
    keys: computed(() => this.options().map((option) => option.value)),
    scroller: this.scroller,
    pinned: computed(() => {
      const active = this.#activeIndex();
      /*
       * The highlight's neighbours too, so an arrow key always lands on the next option, even before
       * the listbox has scrolled; otherwise it would skip to the next rendered one.
       */
      const around = active === undefined ? [] : [active - 1, active, active + 1];
      return [...around, this.#pickedIndex()];
    }),
  });
  protected readonly virtualRows = computed(() => this.virtualizer.getVirtualItems());
  protected readonly totalSize = computed(() => this.virtualizer.getTotalSize());

  /** The query `searched` last fired; undefined until it first fires. */
  #lastSearched: string | undefined;
  /** Set while the listbox's value is put back, so that write isn't taken for a pick. */
  #syncing = false;
  /** Cancelled on destroy, so a pending query never fires after the control is gone. */
  readonly #debouncer = injectDebouncer(
    (query: string) => {
      // A pick or a new value replaced the typed query since this keystroke.
      if (query === this.text()) {
        this.#search(query);
      }
    },
    { wait: SEARCH_DEBOUNCE },
  );

  public constructor() {
    super();
    afterRenderEffect(() => {
      for (const element of this.optionElements()) {
        this.virtualizer.measureElement(element.nativeElement);
      }
    });
    // Arrow keys move the highlight; keep it in view inside the listbox, never scrolling the page.
    afterRenderEffect(() => {
      const index = this.#activeIndex();
      if (index !== undefined) {
        untracked(() => {
          this.virtualizer.scrollToIndex(index, { align: 'auto' });
        });
      }
    });
    /*
     * A listbox that opens before its options register drops the picked value as unknown, and the
     * binding never re-sends it. Put it back so the picked option shows as selected.
     */
    afterRenderEffect(() => {
      const listbox = this.listbox();
      const selected = this.selected();
      if (listbox !== undefined && listbox.value().join(',') !== selected.join(',')) {
        untracked(() => {
          this.#syncing = true;
          listbox.value.set(selected);
          this.#syncing = false;
        });
      }
    });
    // New matches start from the top.
    afterRenderEffect(() => {
      this.options();
      untracked(() => {
        this.virtualizer.scrollToOffset(0);
      });
    });
  }

  protected optionAt(index: number): SelectOption<TValue> | undefined {
    return this.options()[index];
  }

  protected type(query: string): void {
    this.text.set(query);
    this.#debouncer.maybeExecute(query);
  }

  protected choose(values: readonly TValue[]): void {
    if (this.#syncing) {
      return;
    }
    // The listbox toggles: picking the picked option again empties it. That is still a pick.
    const repicked = this.#activeIndex() !== undefined && this.#activeIndex() === this.#pickedIndex();
    const value = values[0] ?? (repicked ? this.value() : undefined);
    if (value === undefined) {
      return;
    }
    this.expanded.set(false);
    this.value.set(value);
    this.text.set(this.#labelOf(value) ?? this.text());
    this.committed.emit();
  }

  /** Closing without a pick puts the picked label back over whatever was typed. */
  protected expandedChange(expanded: boolean): void {
    this.expanded.set(expanded);
    if (!expanded) {
      this.#restore();
    }
  }

  protected escape(): void {
    this.#debouncer.cancel();
    this.#restore();
    this.cancelled.emit();
  }

  /** Enter on a closed list commits; on an open one the listbox picks, which commits. */
  protected enter(): void {
    if (!this.expanded()) {
      this.committed.emit();
    }
  }

  #restore(): void {
    const value = this.value();
    this.text.set(value === undefined ? '' : (this.#pickedLabel() ?? this.text()));
  }

  #labelOf(value: TValue): string | undefined {
    const index = this.#indexByValue().get(value);
    return index === undefined ? undefined : this.options()[index]?.label;
  }

  #search(query: string): void {
    if (query === this.#lastSearched) {
      return;
    }
    this.#lastSearched = query;
    this.searched.emit(query);
  }
}
