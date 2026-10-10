import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { DistanceUnit } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { DISTANCE_UNIT } from '../locale-format';
import { Distance } from './distance.component';

describe(Distance, () => {
  it('shows the distance in the viewer unit and locale, and follows a change of either', async () => {
    const unit = signal<DistanceUnit>(DistanceUnit.Feet);
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { en: {}, de: {} },
          translocoConfig: { availableLangs: ['en', 'de'], defaultLang: 'en' },
        }),
      ],
      providers: [{ provide: DISTANCE_UNIT, useValue: unit.asReadonly() }],
    });
    const fixture = TestBed.createComponent(Distance);
    fixture.componentRef.setInput('feet', 5);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent.trim()).toBe('5 ft');

    unit.set(DistanceUnit.Metres);
    await fixture.whenStable();
    expect(host.textContent.trim()).toBe('1.5 m');

    TestBed.inject(TranslocoService).setActiveLang('de');
    await fixture.whenStable();
    expect(host.textContent.trim()).toBe('1,5 m');
  });
});
