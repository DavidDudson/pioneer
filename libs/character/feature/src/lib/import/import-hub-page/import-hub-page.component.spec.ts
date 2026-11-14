import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import messages from '../../../i18n/en.json';
import { ImportHubPage } from './import-hub-page.component';

async function open(): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters/new/import', component: ImportHubPage }]),
      provideI18n({ en: async () => ({ ...frontierMessages, character: messages }) }),
    ],
  });
  const harness = await RouterTestingHarness.create('/characters/new/import');
  await harness.fixture.whenStable();
  const root = harness.routeNativeElement;
  if (root === null) {
    throw new Error('Expected the page to render');
  }
  return root;
}

describe(ImportHubPage, () => {
  it('offers exactly the Pathbuilder and the Pioneer backup imports, each linking to its page', async () => {
    const root = await open();
    const buttons = [...root.querySelectorAll('fr-surface a')].map((anchor) => [
      anchor.textContent.trim(),
      anchor.getAttribute('href'),
    ]);
    expect(buttons).toStrictEqual([
      ['Import from Pathbuilder', '/characters/new/import/pathbuilder'],
      ['Import from a Pioneer backup', '/characters/new/import/backup'],
    ]);
  });

  it('links back to the creation choices', async () => {
    const root = await open();
    const back = [...root.querySelectorAll('a')].find((anchor) =>
      anchor.textContent.includes('Back to the creation choices'),
    );
    expect(back?.getAttribute('href')).toBe('/characters/new');
  });
});
