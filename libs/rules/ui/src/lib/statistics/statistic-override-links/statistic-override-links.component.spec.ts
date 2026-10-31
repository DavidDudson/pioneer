import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Selector } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../../testing/provide-rich-text-testing';
import { STATISTIC_OVERRIDES } from '../statistic-overrides';
import type { StatisticOverrides } from '../statistic-overrides';
import { StatisticOverrideLinks } from './statistic-override-links.component';

const PERCEPTION = Selector.parse('perception');

const OVERRIDES: StatisticOverrides = {
  link: (selector, mode) => ({ to: ['/sheet'], queryParams: { statistic: selector, mode } }),
};

async function render(overrides: StatisticOverrides | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideRulesUiI18nTesting(),
      ...(overrides === undefined ? [] : [{ provide: STATISTIC_OVERRIDES, useValue: overrides }]),
    ],
  });
  const fixture = TestBed.createComponent(StatisticOverrideLinks);
  fixture.componentRef.setInput('name', 'Perception');
  fixture.componentRef.setInput('selector', PERCEPTION);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe(StatisticOverrideLinks, () => {
  it('offers Adjust and Set, each named for the statistic', async () => {
    const host = await render(OVERRIDES);

    const labels = [...host.querySelectorAll('a')].map((link) => link.getAttribute('aria-label'));
    expect(labels).toStrictEqual(['Adjust Perception', 'Set Perception']);
  });

  it('links each to the form for its mode', async () => {
    const host = await render(OVERRIDES);

    const targets = [...host.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(targets).toStrictEqual(['/sheet?statistic=perception&mode=adjust', '/sheet?statistic=perception&mode=set']);
  });

  it('shows nothing where the page provides no overrides', async () => {
    const host = await render(undefined);

    expect(host.querySelector('a')).toBeNull();
  });
});
