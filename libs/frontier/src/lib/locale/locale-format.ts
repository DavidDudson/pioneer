import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { DistanceUnit, feetToMetres } from '@pioneer/shared/kernel';

/** The viewer's distance unit. The app provides it from its preferences; frontier defaults to feet. */
export const DISTANCE_UNIT = new InjectionToken<Signal<DistanceUnit>>('DISTANCE_UNIT', {
  providedIn: 'root',
  factory: (): Signal<DistanceUnit> => signal(DistanceUnit.Feet).asReadonly(),
});

/** At most one decimal for metres (1.5 m squares); feet are always whole. */
const METRES_FRACTION_DIGITS = 1;

/**
 * `Intl` formatting in the active UI locale (ADR-0009): numbers, lists,
 * distances and sorting. Every call reads the locale signal, so format inside
 * a `computed` and it re-renders on a locale switch (see `fr-distance`).
 */
@Injectable({ providedIn: 'root' })
export class LocaleFormat {
  readonly #i18n = inject(TranslocoService);
  readonly #distanceUnit = inject(DISTANCE_UNIT);

  /** The active UI locale (BCP 47). */
  public readonly locale: Signal<string> = toSignal(this.#i18n.langChanges$, {
    initialValue: this.#i18n.getActiveLang(),
  });

  public number(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale(), options).format(value);
  }

  /** "Elf, Human and Orc", joined the locale's way. */
  public list(items: readonly string[], type: Intl.ListFormatType = 'conjunction'): string {
    return new Intl.ListFormat(this.locale(), { type, style: 'long' }).format(items);
  }

  /** A distance given in feet (as the rules write it), shown in the viewer's unit: "30 ft" or "9 m". */
  public distance(feet: number): string {
    if (this.#distanceUnit() === DistanceUnit.Metres) {
      return this.number(feetToMetres(feet), {
        style: 'unit',
        unit: 'meter',
        maximumFractionDigits: METRES_FRACTION_DIGITS,
      });
    }
    return this.number(feet, { style: 'unit', unit: 'foot' });
  }

  /**
   * Up to two initials for a name: the first character of its first and last words, upper-cased the locale's
   * way. Words and characters are segmented in the locale, so a combining accent or an emoji stays whole and
   * punctuation is skipped. Empty when the name has no words.
   */
  public initials(name: string): string {
    const locale = this.locale();
    const words = [...new Intl.Segmenter(locale, { granularity: 'word' }).segment(name)]
      .filter((segment) => segment.isWordLike === true)
      .map((segment) => segment.segment);
    const graphemes = new Intl.Segmenter(locale, { granularity: 'grapheme' });
    const first = (word: string | undefined): string => [...graphemes.segment(word ?? '')][0]?.segment ?? '';
    const last = words.length > 1 ? first(words.at(-1)) : '';
    return `${first(words[0])}${last}`.toLocaleUpperCase(locale);
  }

  /** Locale-aware ordering for sorting labels. */
  public compare(left: string, right: string): number {
    return new Intl.Collator(this.locale()).compare(left, right);
  }
}
