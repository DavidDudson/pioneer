import { TestBed } from '@angular/core/testing';
import { Temporal } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { DateDisplay } from './date.component';

describe(DateDisplay, () => {
  it('renders a <time> with the ISO value', async () => {
    const fixture = TestBed.createComponent(DateDisplay);
    fixture.componentRef.setInput('value', Temporal.PlainDate.from('2026-10-07'));
    await fixture.whenStable();
    const time = (fixture.nativeElement as HTMLElement).querySelector('time');
    expect(time?.getAttribute('datetime')).toBe('2026-10-07');
    expect(time?.textContent.trim().length).toBeGreaterThan(0);
  });
});
