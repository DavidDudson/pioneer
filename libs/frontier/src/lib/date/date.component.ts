import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Temporal } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';

import { LocaleFormat } from '../locale/locale-format';

export const DateFormat = {
  /** 7 Oct 2026 */
  Date: 'date',
  /** 7 Oct 2026, 10:00 */
  DateTime: 'datetime',
  /** 3 days ago */
  Relative: 'relative',
} as const;
export type DateFormat = ValueOf<typeof DateFormat>;

export type DateValue = Temporal.Instant | Temporal.PlainDate | Temporal.ZonedDateTime;

const RELATIVE_UNITS = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'] as const;

function toZoned(value: DateValue, timeZone: string): Temporal.ZonedDateTime {
  if (value instanceof Temporal.PlainDate) {
    return value.toZonedDateTime(timeZone);
  }
  if (value instanceof Temporal.Instant) {
    return value.toZonedDateTimeISO(timeZone);
  }
  return value;
}

function relative(value: DateValue, now: Temporal.ZonedDateTime, locale: string): string {
  const untilTarget = now.until(toZoned(value, now.timeZoneId), { largestUnit: 'years', smallestUnit: 'seconds' });
  const unit = RELATIVE_UNITS.find((candidate) => untilTarget[candidate] !== 0) ?? 'seconds';
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(untilTarget[unit], unit);
}

function format(value: DateValue, style: DateFormat, locale: string): string {
  if (style === DateFormat.Relative) {
    return relative(value, Temporal.Now.zonedDateTimeISO(), locale);
  }
  if (style === DateFormat.DateTime && !(value instanceof Temporal.PlainDate)) {
    return value.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
  }
  return value.toLocaleString(locale, { dateStyle: 'medium' });
}

/**
 * Renders a Temporal value as a `<time>` element in the active UI locale.
 * The only date rendering in the app; `Date` is banned by lint.
 */
@Component({
  selector: 'fr-date',
  templateUrl: './date.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateDisplay {
  public readonly value = input.required<DateValue>();
  public readonly format = input<DateFormat>(DateFormat.Date);

  protected readonly iso = computed(() => this.value().toString());
  readonly #locale = inject(LocaleFormat).locale;
  protected readonly text = computed(() => format(this.value(), this.format(), this.#locale()));
}
