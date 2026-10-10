import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import { legalRoutes } from '../legal.routes';
import { ORC_ATTRIBUTION } from './orc-attribution';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

async function renderLegalPage(): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'legal', children: legalRoutes }]),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create('/legal');
  await harness.fixture.whenStable();
  return present(harness.routeNativeElement);
}

describe('LegalPage', () => {
  it('shows the Paizo, ORC and Foundry notices without an account', async () => {
    const root = await renderLegalPage();
    // Text comes from the route's `legal` message scope, loaded with the page's code.
    const headings = [...root.querySelectorAll('h1, h2')].map((heading) => heading.textContent.trim());
    expect(headings).toStrictEqual(['Legal', 'Paizo Community Use Policy', 'ORC License', 'Foundry VTT pf2e system']);
    expect(root.textContent).toContain('We are expressly prohibited from charging you to use or access this content.');
    // ORC License section III(a), verbatim.
    expect(root.textContent).toContain(
      'This product is licensed under the ORC License located at the Library of Congress at TX 9-307-067 and available online at various locations. All warranties are disclaimed as set forth therein.',
    );
    expect(root.textContent).toContain('This product contains no Expressly Designated Licensed Material.');
    expect(root.textContent).toContain('not affiliated with Foundry Gaming LLC');
  });

  it('credits every upstream ORC work as a list item, Monster Core included', async () => {
    const root = await renderLegalPage();
    const credits = [...root.querySelectorAll('ul [role="listitem"]')].map((item) => item.textContent.trim());
    expect(credits).toHaveLength(ORC_ATTRIBUTION.flatMap((group) => group.works).length);
    expect(credits).toContain('Pathfinder NPC Core © 2025, Paizo Inc.');
    expect(credits.some((credit) => credit.startsWith('Pathfinder Monster Core © 2024, Paizo Inc.'))).toBe(true);
  });

  it('links the Community Use Policy, Paizo, the ORC License and the Foundry pf2e repository', async () => {
    const root = await renderLegalPage();
    const links = [...root.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(links).toStrictEqual([
      'https://paizo.com/licenses/communityuse',
      'https://paizo.com',
      'https://paizo.com/orclicense',
      'https://github.com/foundryvtt/pf2e',
    ]);
  });
});
