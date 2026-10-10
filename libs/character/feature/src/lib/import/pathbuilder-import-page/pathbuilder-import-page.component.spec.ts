import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { briarRoseExport } from '@pioneer/interop/pathbuilder/testing';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import { characterRoutes } from '../../character.routes';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

interface OpenPage {
  readonly harness: RouterTestingHarness;
  readonly root: HTMLElement;
}

async function openPage(): Promise<OpenPage> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters', children: characterRoutes }]),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create('/characters/import/pathbuilder');
  await harness.fixture.whenStable();
  return { harness, root: present(harness.routeNativeElement) };
}

async function paste(harness: RouterTestingHarness, root: HTMLElement, text: string): Promise<void> {
  const area = present(root.querySelector('textarea'));
  area.value = text;
  area.dispatchEvent(new Event('input'));
  harness.detectChanges();
  await harness.fixture.whenStable();
}

describe('PathbuilderImportPage', () => {
  it('shows what it read from a pasted export', async () => {
    const { harness, root } = await openPage();

    await paste(harness, root, JSON.stringify(briarRoseExport));

    expect(root.textContent).toContain('Briar Rose');
    expect(root.textContent).toContain('Animist and Druid');
    expect(root.textContent).toContain('+5');
  });

  it('reports the names against loaded packs', async () => {
    const { harness, root } = await openPage();

    await paste(harness, root, JSON.stringify(briarRoseExport));

    await vi.waitFor(() => {
      harness.detectChanges();
      expect(root.textContent).toContain('names match content you have loaded');
    });
    expect(root.textContent).toContain('Ancestry · 0 of 1 matched');
    expect(root.textContent).toContain('Feats · 0 of 32 matched');
  });

  it('explains text that is not a Pathbuilder export', async () => {
    const { harness, root } = await openPage();

    await paste(harness, root, '{ "hello": "world" }');

    expect(present(root.querySelector('[role="alert"]')).textContent).toContain("isn't a Pathbuilder export");
    expect(root.textContent).not.toContain('What Pioneer read');
  });
});
