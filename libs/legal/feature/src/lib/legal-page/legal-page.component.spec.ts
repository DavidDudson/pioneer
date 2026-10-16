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

/** The surface whose level-2 heading reads `heading`. */
function section(root: HTMLElement, heading: string): HTMLElement {
  const title = [...root.querySelectorAll('h2')].find((element) => element.textContent.trim() === heading);
  return present(title?.closest<HTMLElement>('fr-surface'));
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
  it('shows the Paizo, ORC, OGL, books and Foundry notices without an account', async () => {
    const root = await renderLegalPage();
    // Text comes from the route's `legal` message scope, loaded with the page's code.
    const headings = [...root.querySelectorAll('h1, h2')].map((heading) => heading.textContent.trim());
    expect(headings).toStrictEqual([
      'Legal',
      'Paizo Community Use Policy',
      'ORC License',
      'Open Game License',
      'Books',
      'Foundry VTT pf2e system',
    ]);
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
    const credits = [...section(root, 'ORC License').querySelectorAll('ul [role="listitem"]')].map((item) =>
      item.textContent.trim(),
    );
    expect(credits).toHaveLength(ORC_ATTRIBUTION.flatMap((group) => group.works).length);
    expect(credits).toContain('Pathfinder NPC Core © 2025, Paizo Inc.');
    expect(credits.some((credit) => credit.startsWith('Pathfinder Monster Core © 2024, Paizo Inc.'))).toBe(true);
  });

  it("links the Community Use Policy, Paizo, the ORC License, each pack's Foundry release and the repository", async () => {
    const root = await renderLegalPage();
    const links = [...root.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(links).toStrictEqual([
      'https://paizo.com/licenses/communityuse',
      'https://paizo.com',
      'https://paizo.com/orclicense',
      'https://github.com/foundryvtt/pf2e/blob/pf2e-8.6.0/static/licenses/OpenGameLicense.md',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.0',
      'https://github.com/foundryvtt/pf2e',
    ]);
  });

  it('lists every registered book with its publisher and licence', async () => {
    const root = await renderLegalPage();
    const books = [...section(root, 'Books').querySelectorAll('[role="listitem"]')];
    expect(books.map((book) => book.querySelector('fr-text')?.textContent.trim())).toStrictEqual([
      'Player Core',
      'GM Core',
      'Monster Core',
      'Player Core 2',
      'Lost Omens Divine Mysteries',
      'Treasure Vault (Remastered)',
      'Howl of the Wild',
      'War of Immortals',
      'Lost Omens The Mwangi Expanse',
      'Secrets of Magic',
      'Rage of Elements',
      'Lost Omens Tian Xia Character Guide',
      'Dark Archive (Remastered)',
      'Lost Omens Character Guide',
      'Lost Omens Impossible Lands',
      'Impossible Magic',
      'Guns & Gears',
      'Battlecry!',
    ]);
    const licenses = books.map((book) => /Paizo · (?<license>.+)$/u.exec(book.textContent.trim())?.groups?.['license']);
    expect(licenses).toStrictEqual([
      ...Array.from({ length: 8 }, () => 'ORC License'),
      ...Array.from({ length: 3 }, () => 'Open Game License 1.0a'),
      'ORC License',
      'ORC License',
      'Open Game License 1.0a',
      'Open Game License 1.0a',
      'ORC License',
      'ORC License',
      'ORC License',
    ]);
  });

  it('names the Foundry release each official pack was imported from, and that it has been edited since', async () => {
    const root = await renderLegalPage();
    const foundry = section(root, 'Foundry VTT pf2e system');
    const packs = [...foundry.querySelectorAll('[role="listitem"]')].map((item) => item.textContent.trim());
    expect(packs).toStrictEqual([
      expect.stringMatching(/^Player Core\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^Player Core 2\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^Lost Omens Divine Mysteries\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^Treasure Vault \(Remastered\)\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^GM Core\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^Howl of the Wild\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^War of Immortals\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^Lost Omens The Mwangi Expanse\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^Secrets of Magic\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^Rage of Elements\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^Lost Omens Tian Xia Character Guide\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^Dark Archive \(Remastered\)\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^Lost Omens Character Guide\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^Lost Omens Impossible Lands\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^Impossible Magic\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^Guns & Gears\s*Foundry release pf2e-8\.6\.0$/u),
      expect.stringMatching(/^Battlecry!\s*Foundry release pf2e-8\.6\.0$/u),
    ]);
    expect(foundry.textContent).toContain('then corrected and enriched by Pioneer contributors');
  });
});
