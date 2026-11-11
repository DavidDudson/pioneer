import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import messages from '../../../i18n/en.json';
import { CreationChoicePage } from './creation-choice-page.component';

async function open(): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters/new', component: CreationChoicePage }]),
      provideI18n({ en: async () => ({ ...frontierMessages, character: messages }) }),
    ],
  });
  const harness = await RouterTestingHarness.create('/characters/new');
  await harness.fixture.whenStable();
  const root = harness.routeNativeElement;
  if (root === null) {
    throw new Error('Expected the page to render');
  }
  return root;
}

describe(CreationChoicePage, () => {
  it('offers Import, Generate and Create, each linking to its own page', async () => {
    const root = await open();
    const cards = [...root.querySelectorAll('fr-surface a')].map((anchor) => [
      anchor.textContent.trim(),
      anchor.getAttribute('href'),
    ]);
    expect(cards).toStrictEqual([
      ['Import', '/characters/new/import'],
      ['Generate', '/characters/new/generate'],
      ['Create', '/characters/new/create'],
    ]);
  });

  it('describes each option in a line', async () => {
    const root = await open();
    const descriptions = [...root.querySelectorAll('fr-surface fr-text')].map((text) => text.textContent.trim());
    expect(descriptions).toHaveLength(3);
    expect(descriptions.every((text) => text.length > 0)).toBe(true);
  });

  it('links back to the character list', async () => {
    const root = await open();
    const back = [...root.querySelectorAll('a')].find((anchor) => anchor.textContent.includes('Back to characters'));
    expect(back?.getAttribute('href')).toBe('/characters');
  });
});
