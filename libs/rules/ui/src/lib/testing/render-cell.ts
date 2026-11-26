import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentInputs } from '@pioneer/frontier';

import { provideRulesUiI18nTesting } from './provide-rich-text-testing';

/** Renders a presentational cell with the `en` messages and returns its host element. */
export async function renderCell<TCell>(cell: Type<TCell>, inputs: ComponentInputs<TCell>): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(cell);

  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }

  await fixture.whenStable();
  const host: unknown = fixture.nativeElement;

  if (!(host instanceof HTMLElement)) {
    throw new TypeError('The cell rendered no host element');
  }

  return host;
}
