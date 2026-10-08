import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import { legalRoutes } from '../legal.routes';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

describe('LegalPage', () => {
  it('shows the Paizo, ORC and Foundry notices with their links, without an account', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'legal', children: legalRoutes }]),
        provideI18n({ en: async () => frontierMessages }),
      ],
    });
    const harness = await RouterTestingHarness.create('/legal');
    await harness.fixture.whenStable();

    const root = present(harness.routeNativeElement);
    // Text comes from the route's `legal` message scope, loaded with the page's code.
    const headings = [...root.querySelectorAll('h1, h2')].map((heading) => heading.textContent.trim());
    expect(headings).toStrictEqual(['Legal', 'Paizo Community Use Policy', 'ORC License', 'Foundry VTT pf2e system']);
    expect(root.textContent).toContain('We are expressly prohibited from charging you to use or access this content.');
    expect(root.textContent).toContain('TX 9-307-067');
    expect(root.textContent).toContain('not affiliated with Foundry Gaming LLC');

    const links = [...root.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(links).toStrictEqual([
      'https://paizo.com/licenses/communityuse',
      'https://paizo.com',
      'https://paizo.com/orclicense',
      'https://github.com/foundryvtt/pf2e',
    ]);
  });
});
