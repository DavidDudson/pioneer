import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { DistanceUnit, Temporal } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { DateDisplay } from '../date/date.component';
import { DISTANCE_UNIT, LocaleFormat } from './locale-format';

function setup(unit: DistanceUnit = DistanceUnit.Feet): LocaleFormat {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { en: {}, de: {}, tr: {} },
        translocoConfig: { availableLangs: ['en', 'de', 'tr'], defaultLang: 'en' },
      }),
    ],
    providers: [{ provide: DISTANCE_UNIT, useValue: signal(unit).asReadonly() }],
  });
  return TestBed.inject(LocaleFormat);
}

function switchTo(locale: string): void {
  TestBed.inject(TranslocoService).setActiveLang(locale);
}

describe(LocaleFormat, () => {
  it('formats numbers in the active locale and follows a switch', () => {
    const format = setup();
    expect(format.number(1234.5)).toBe('1,234.5');
    switchTo('de');
    expect(format.number(1234.5)).toBe('1.234,5');
  });

  it('shows modifiers with an explicit sign', () => {
    const format = setup();
    expect(format.number(0, { signDisplay: 'always' })).toBe('+0');
    expect(format.number(-2, { signDisplay: 'always' })).toBe('-2');
  });

  it('joins lists the locale way', () => {
    const format = setup();
    expect(format.list(['Elf', 'Human', 'Orc'])).toBe('Elf, Human, and Orc');
    switchTo('de');
    expect(format.list(['Elf', 'Human', 'Orc'])).toBe('Elf, Human und Orc');
  });

  it('shows distances in feet by default', () => {
    expect(setup().distance(30)).toBe('30 ft');
  });

  it('shows distances in metres at 1.5 m per square when preferred', () => {
    const format = setup(DistanceUnit.Metres);
    expect(format.distance(30)).toBe('9 m');
    switchTo('de');
    expect(format.distance(25)).toBe('7,5 m');
  });

  it('takes initials from the first and last words of a name', () => {
    const format = setup();
    expect(format.initials('Valeros')).toBe('V');
    expect(format.initials('seelah of the dawn')).toBe('SD');
    expect(format.initials('  Ezren   the  Wizard ')).toBe('EW');
  });

  it('skips punctuation and keeps whole characters', () => {
    const format = setup();
    expect(format.initials('"Kyra" Al-Hakim')).toBe('KH');
    expect(format.initials('e\u0301lodie Moreau')).toBe('E\u0301M');
    expect(format.initials('👩‍🚀 Astra')).toBe('A');
    expect(format.initials('—')).toBe('');
  });

  it('upper-cases initials the locale way', () => {
    const format = setup();
    switchTo('tr');
    expect(format.initials('ilker yılmaz')).toBe('İY');
  });

  it('sorts with the locale collation', () => {
    const format = setup();
    expect(['Zwerg', 'Ärger', 'Elf'].toSorted((left, right) => format.compare(left, right))).toStrictEqual([
      'Ärger',
      'Elf',
      'Zwerg',
    ]);
  });
});

describe(DateDisplay, () => {
  it('renders dates in the active locale', async () => {
    setup();
    switchTo('de');
    const fixture = TestBed.createComponent(DateDisplay);
    fixture.componentRef.setInput('value', Temporal.PlainDate.from('2026-10-07'));
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent.trim()).toBe('07.10.2026');
  });
});
