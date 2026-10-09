import type { ElementRef, Signal } from '@angular/core';
import { defaultRangeExtractor, injectVirtualizer } from '@tanstack/angular-virtual';
import type { AngularVirtualizer, Range, VirtualItem } from '@tanstack/angular-virtual';

/** Rough option height before options are measured: a touch target. */
const ESTIMATE_PX = 44;
const OVERSCAN = 8;

export interface OptionVirtualizerSource {
  /** Stable key per option, in order. */
  readonly keys: Signal<readonly string[]>;
  readonly scroller: Signal<ElementRef<HTMLElement> | undefined>;
  /** Indexes that must stay rendered whatever the scroll position; out-of-range ones are ignored. */
  readonly pinned: Signal<readonly (number | undefined)[]>;
}

/**
 * TanStack Virtual over a listbox's own scroll container. @angular/aria only
 * knows the options in the DOM, so the first and last options and the
 * `pinned` ones always render: Home and End reach the real ends, and the
 * caller pins the highlight and the picked option.
 * Call in an injection context.
 */
export function injectOptionVirtualizer(source: OptionVirtualizerSource): AngularVirtualizer<HTMLElement, HTMLElement> {
  return injectVirtualizer<HTMLElement, HTMLElement>(() => {
    const keys = source.keys();
    // Read here, not in the extractor: a new extractor makes the virtualizer recalculate its range.
    const pinned = source.pinned();
    return {
      scrollElement: source.scroller(),
      count: keys.length,
      estimateSize: (): number => ESTIMATE_PX,
      overscan: OVERSCAN,
      getItemKey: (index: number): string => keys[index] ?? String(index),
      rangeExtractor: (range: Range): number[] => renderedIndexes(range, pinned),
    };
  });
}

function renderedIndexes(range: Range, pinned: readonly (number | undefined)[]): number[] {
  const indexes = new Set(defaultRangeExtractor(range));
  for (const index of [0, range.count - 1, ...pinned]) {
    if (index !== undefined && index >= 0 && index < range.count) {
      indexes.add(index);
    }
  }
  return [...indexes].toSorted((left, right) => left - right);
}

/** An option's offset inside the listbox. */
export function optionOffset(row: VirtualItem): string {
  return `translateY(${row.start}px)`;
}
