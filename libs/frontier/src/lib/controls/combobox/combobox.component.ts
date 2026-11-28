import { Combobox as AriaCombobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';

import { Badge, BadgeTone } from '../../text/badge/badge.component';
import { Control } from '../control';
import { injectSearchQuery } from '../search-query';
import type { SelectOption } from '../select/select.component';
import { VirtualRow } from '../virtual-rows/virtual-row.directive';
import { VirtualRows } from '../virtual-rows/virtual-rows.directive';
import { ComboboxStatus } from './combobox-status.component';
import { samePicked, sameTextSource, textOf } from './combobox-text';
import type { Picked, TextSource } from './combobox-text';
import {
  comboboxHostClasses,
  comboboxInputClasses,
  comboboxListboxClasses,
  comboboxOptionClasses,
  comboboxOptionDescriptionClasses,
  comboboxOptionTagsClasses,
  comboboxPopupClasses,
} from './combobox.variants';

/** How many rows from the end of the loaded options `loadMore` fires. */
const LOAD_AHEAD = 8;

/** A small badge under an option's name: what kind it is, its level, a trait. */
export interface ComboboxTag {
  readonly label: string;
  readonly tone?: BadgeTone;
}

/**
 * A combobox option: a select option that may say more under its label (why it can't be picked, what it needs), may
 * carry tags for what the name alone cannot say, and may be shown but not picked. A disabled option is still reached
 * with the arrow keys, so its description is read out.
 */
export interface ComboboxOption<TValue extends string> extends SelectOption<TValue> {
  readonly disabled?: boolean;
  readonly tags?: ReadonlyArray<ComboboxTag>;
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
 * list; Escape puts the picked label back and fires `cancelled`.
 *
 * `multi` picks any number: `values` is the picked set, a press toggles one option and the list stays open, so
 * a person ticks several in one visit. Picks made under an earlier query stay picked while a later query hides
 * their options. Past the loaded options, `hasMore` and `loadingMore` let the list ask for the next page: `loadMore`
 * fires once the end is near.
 */
@Component({
  selector: 'fr-combobox',
  imports: [
    AriaCombobox,
    Badge,
    ComboboxPopup,
    ComboboxStatus,
    ComboboxWidget,
    Listbox,
    Option,
    VirtualRow,
    VirtualRows,
  ],
  templateUrl: './combobox.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClasses()' },
})
export class Combobox<TValue extends string> extends Control {
  /** The picked value; `undefined` until the user picks. */
  public readonly value = model<TValue | undefined>(undefined);
  /** Pick any number of options: `values` is the picked set, and a press toggles one without closing the list. */
  public readonly multi = input(false, { transform: booleanAttribute });
  /** The picked values of a `multi` combobox; `value` is for a single pick. */
  public readonly values = model<ReadonlyArray<TValue>>([]);
  /** There are options past the loaded ones: scrolling near the end fires `loadMore`. */
  public readonly hasMore = input(false, { transform: booleanAttribute });
  /** The next page is loading: skeleton rows sit under the options. */
  public readonly loadingMore = input(false, { transform: booleanAttribute });
  /** The matches for the last `searched` query. */
  public readonly options = input.required<ReadonlyArray<ComboboxOption<TValue>>>();
  /** The text the input shows while nothing is picked. Setting it again replaces whatever was typed. */
  public readonly query = input('');
  /** Options are loading: the listbox shows skeleton rows. */
  public readonly loading = input(false, { transform: booleanAttribute });
  public readonly placeholder = input('');
  /** The list floats over the content below the input instead of pushing it down. */
  public readonly floating = input(false, { transform: booleanAttribute });
  /** Every keystroke, as typed: for matches that must follow the text at once. Never fired for a pick's label. */
  public readonly typed = output<string>();
  /** The typed query, debounced. Never fired for the label a pick fills in. */
  public readonly searched = output<string>();
  /** The end of the loaded options is near and `hasMore`: append the next page. */
  public readonly loadMore = output();

  protected readonly expanded = signal(false);
  /** The picked value and its label, once an option for it has loaded. */
  readonly #picked = computed<Picked<TValue>>(
    () => {
      const value = this.value();

      return { value, label: value === undefined ? undefined : this.#labelOf(value) };
    },
    { equal: samePicked },
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
    equal: samePicked,
  });
  /**
   * The input's text: the typed query, or the picked option's label. The label also fills in when
   * its option arrives after the value (an async source), but never over typing in an open list.
   */
  protected readonly text = linkedSignal<TextSource<TValue>, string>({
    source: computed(() => ({ picked: this.#shown(), query: this.query() }), { equal: sameTextSource }),
    computation: (source, previous) => textOf(source, previous?.value, untracked(this.expanded)),
  });
  /** The picked value while it is among the options; the listbox drops values it has no option for. */
  protected readonly selected = computed<Array<TValue>>(() => {
    if (this.multi()) {
      // The listbox only knows the options rendered now and drops the rest, so offer it just those.
      const rendered = new Set(this.ariaOptions().map((option) => option.value()));

      return this.values().filter((value) => rendered.has(value));
    }

    const value = this.value();

    return value !== undefined && this.pickedIndex() !== undefined ? [value] : [];
  });

  protected readonly inputClasses = comboboxInputClasses;
  protected readonly popupClasses = computed(() => comboboxPopupClasses({ floating: this.floating() }));
  protected readonly hostClasses = computed(() => comboboxHostClasses({ floating: this.floating() }));
  protected readonly listboxClasses = comboboxListboxClasses;
  protected readonly optionClasses = comboboxOptionClasses;
  protected readonly descriptionClasses = comboboxOptionDescriptionClasses;
  protected readonly tagsClasses = comboboxOptionTagsClasses;
  protected readonly neutral = BadgeTone.Neutral;

  protected readonly field = viewChild<string, ElementRef<HTMLInputElement>>('combobox', { read: ElementRef });
  protected readonly ariaOptions = viewChildren<Option<TValue>>(Option);
  protected readonly listbox = viewChild<Listbox<TValue>>(Listbox);
  protected readonly loadAhead = LOAD_AHEAD;
  protected readonly keys = computed(() => this.options().map((option) => option.value));
  readonly #indexByValue = computed(
    () => new Map(this.options().map((option, index): [TValue, number] => [option.value, index])),
  );
  protected readonly pickedIndex = computed(() => {
    const value = this.value();

    return value === undefined ? undefined : this.#indexByValue().get(value);
  });
  /** The keyboard-highlighted option's index. */
  protected readonly activeIndex = computed(() => {
    const active = this.ariaOptions().find((option) => option.active());

    return active === undefined ? undefined : this.#indexByValue().get(active.value());
  });

  /** Set while the listbox's value is put back, so that write isn't taken for a pick. */
  #syncing = false;
  readonly #query = injectSearchQuery({
    current: this.text,
    emit: (query) => {
      this.searched.emit(query);
    },
  });

  public constructor() {
    super();
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
    // A finished load frees the end of the list to ask again, so a failed one is retried on the next scroll.
    afterRenderEffect(() => {
      if (!this.loadingMore()) {
        untracked(() => {
          this.#loadedFor = undefined;
        });
      }
    });
  }

  protected optionAt(index: number): ComboboxOption<TValue> | undefined {
    return this.options()[index];
  }

  /** Opens the list of matches, for a link that returns to them. */
  public open(): void {
    this.expanded.set(true);
  }

  /** Puts the cursor in the input, for a shortcut that opens the box. */
  public focus(): void {
    this.field()?.nativeElement.focus();
  }

  protected type(query: string): void {
    this.text.set(query);
    this.typed.emit(query);
    this.#query.type(query);
  }

  protected choose(values: ReadonlyArray<TValue>): void {
    if (this.#syncing) {
      return;
    }

    if (this.multi()) {
      this.#chooseMany(values);
    } else {
      this.#chooseOne(values);
    }
  }

  #chooseOne(values: ReadonlyArray<TValue>): void {
    // The listbox toggles: picking the picked option again empties it. That is still a pick.
    const repicked = this.activeIndex() !== undefined && this.activeIndex() === this.pickedIndex();
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
    this.#query.cancel();
    this.#restore();
    this.cancelled.emit();
  }

  /** Enter on a closed list commits; on an open one the listbox picks, which commits. */
  protected enter(): void {
    if (!this.expanded()) {
      this.committed.emit();
    }
  }

  /**
   * The listbox reports the picks among the options rendered now; picks whose options are not rendered (a query hides
   * them, or they are scrolled out of the window) stay as they were. The list stays open, so several can be ticked in
   * one visit.
   */
  #chooseMany(shown: ReadonlyArray<TValue>): void {
    const rendered = new Set(this.ariaOptions().map((option) => option.value()));
    const unseen = this.values().filter((value) => !rendered.has(value));

    this.values.set([...unseen, ...shown.filter((value) => rendered.has(value))]);
    this.committed.emit();
  }

  /** The row count `loadMore` last fired for, so one end of the list asks once. */
  #loadedFor: number | undefined;

  /** The end of the options is in view: ask for the next page, once for each length the list has. */
  protected askForMore(): void {
    const count = this.options().length;
    const busy = this.loading() || this.loadingMore();

    if (this.hasMore() && !busy && this.#loadedFor !== count) {
      this.#loadedFor = count;
      this.loadMore.emit();
    }
  }

  #restore(): void {
    const value = this.value();
    this.text.set(value === undefined ? this.query() : (this.#pickedLabel() ?? this.text()));
  }

  #labelOf(value: TValue): string | undefined {
    return this.options()[this.#indexByValue().get(value) ?? -1]?.label;
  }
}
