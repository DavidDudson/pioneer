import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../../testing/provide-frontier-i18n-testing';
import { TableDensity } from '../../table-view/table-view-store';
import { TableDensityControl } from './table-density.component';

interface Rendered {
  readonly fixture: ComponentFixture<TableDensityControl>;
  readonly host: HTMLElement;
}

async function render(value?: TableDensity): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [...provideFrontierI18nTesting()] });
  const fixture = TestBed.createComponent(TableDensityControl);

  if (value !== undefined) {
    fixture.componentRef.setInput('value', value);
  }

  await fixture.whenStable();

  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

function options(host: HTMLElement): Array<HTMLButtonElement> {
  return [...host.querySelectorAll<HTMLButtonElement>('button')];
}

describe(TableDensityControl, () => {
  it('offers comfortable and compact, comfortable chosen by default', async () => {
    const { host } = await render();
    expect(
      options(host).map((button) => [button.textContent.trim(), button.getAttribute('aria-pressed')]),
    ).toStrictEqual([
      ['Comfortable', 'true'],
      ['Compact', 'false'],
    ]);
  });

  it('is named Row density', async () => {
    const { host } = await render();
    expect(host.querySelector('[aria-label="Row density"]')).not.toBeNull();
  });

  it('shows the chosen density', async () => {
    const { host } = await render(TableDensity.Compact);
    expect(options(host).map((button) => button.getAttribute('aria-pressed'))).toStrictEqual(['false', 'true']);
  });

  it('chooses compact when it is pressed', async () => {
    const { fixture, host } = await render();
    options(host)[1]?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe(TableDensity.Compact);
  });
});
