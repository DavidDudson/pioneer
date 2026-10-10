import { TestBed } from '@angular/core/testing';
import { Temporal } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../testing/provide-frontier-i18n-testing';
import { DateDisplay, DateFormat } from './date.component';
import type { DateValue } from './date.component';

async function render(value: DateValue, format?: DateFormat): Promise<HTMLTimeElement> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(DateDisplay);
  fixture.componentRef.setInput('value', value);
  if (format !== undefined) {
    fixture.componentRef.setInput('format', format);
  }
  await fixture.whenStable();
  const time = (fixture.nativeElement as HTMLElement).querySelector('time');
  if (time === null) {
    throw new Error('fr-date rendered no <time>');
  }
  return time;
}

const OCTOBER_7 = Temporal.PlainDate.from('2026-10-07');
const OCTOBER_7_10AM = Temporal.ZonedDateTime.from('2026-10-07T10:00[UTC]');

describe(DateDisplay, () => {
  it('renders a <time> with the ISO value as its datetime and title', async () => {
    const time = await render(OCTOBER_7);
    expect(time.getAttribute('datetime')).toBe('2026-10-07');
    expect(time.getAttribute('title')).toBe('2026-10-07');
  });

  it('shows the date in the active locale by default', async () => {
    const time = await render(OCTOBER_7);
    expect(time.textContent.trim()).toBe('Oct 7, 2026');
  });

  it('adds the time of day in the datetime format', async () => {
    const time = await render(OCTOBER_7_10AM, DateFormat.DateTime);
    expect(time.textContent).toMatch(/^Oct 7, 2026, 10:00\sAM$/u);
  });

  it('shows only the date of a plain date in the datetime format', async () => {
    const time = await render(OCTOBER_7, DateFormat.DateTime);
    expect(time.textContent.trim()).toBe('Oct 7, 2026');
  });

  it('shows how long ago in the relative format', async () => {
    const twoHoursAgo = Temporal.Now.instant().subtract({ hours: 2 });
    const time = await render(twoHoursAgo, DateFormat.Relative);
    expect(time.textContent.trim()).toBe('2 hours ago');
  });
});
