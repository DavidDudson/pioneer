import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { frontierMessages } from '@pioneer/frontier';
import { prebuildContentTesting, provideContentTesting, TestContentDelivery } from '@pioneer/rules/data-access/testing';
import { ContentKind, packContentsFromFiles } from '@pioneer/rules/sdk';
import type { ContentPack, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { IDLE_SCHEDULER, provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { GlobalSearch } from './global-search.component';

const BUILDER = new ContentPackBuilder().withId('search-shell-test');
/** Sudden Charge comes first and only matches "attack" in its text, so the server ranks it above Power Attack. */
const PACK: ContentPack = BUILDER.withFeat('sudden-charge', {
  level: 1,
  traits: [],
  description: [{ type: 'paragraph', content: [{ type: 'text', text: 'Close the distance, then attack.' }] }],
})
  .withFeat('power-attack', { level: 1, traits: [] })
  .withFeat('attack-of-opportunity', { level: 1, traits: [] })
  .withFeat('toughness', { level: 1, traits: [] })
  .withSpell('fireball', { rank: 3, traditions: ['arcane'], traits: ['fire'] })
  .build();
const LOADER: PackContentsLoader = {
  id: PACK.id,
  load: async () => packContentsFromFiles(PACK.manifest, [PACK.otherEntries]),
};

/** The shell's messages the search reads: the app owns them, so the spec holds the ones it needs. */
const SHELL_MESSAGES = {
  'shell.search.label': 'Search the content',
  'shell.search.placeholder': 'Search content',
  'shell.search.kind.spell': 'Spell',
  'shell.search.kind.feat': 'Feat',
};

interface Opened {
  readonly fixture: ComponentFixture<GlobalSearch>;
  readonly root: HTMLElement;
  readonly input: HTMLInputElement;
}

/** The layout jsdom does not do: a listbox with height and rows with a touch target's size. */
function stubLayout(): void {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(220);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ width: 220, height: 44 }),
  );
}

async function open(): Promise<Opened> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'content/:kind/:slug', children: [] }]),
      provideI18n({ en: async () => ({ ...frontierMessages, ...SHELL_MESSAGES }) }),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      // Idle is now, so every kind loads as soon as the box is used.
      {
        provide: IDLE_SCHEDULER,
        useValue: (task: () => void): void => {
          task();
        },
      },
      ...provideContentTesting(new TestContentDelivery([LOADER])),
    ],
  });
  const fixture = TestBed.createComponent(GlobalSearch);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const input = root.querySelector('input');
  if (input === null) {
    throw new Error('Expected the search box to render');
  }
  return { fixture, root, input };
}

function type({ fixture, input }: Opened, text: string): void {
  input.value = text;
  input.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
  fixture.detectChanges();
}

async function press({ fixture, input }: Opened, key: string): Promise<void> {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const listed = ({ root }: Opened): string[] =>
  [...root.querySelectorAll('[role="option"]')].map((option) => (option.firstChild?.textContent ?? '').trim());

/** The names listed once `count` of them are. */
async function listedWhen(opened: Opened, count: number): Promise<string[]> {
  await vi.waitFor(() => {
    opened.fixture.detectChanges();
    expect(listed(opened)).toHaveLength(count);
  });
  return listed(opened);
}

describe(GlobalSearch, () => {
  beforeAll(async () => {
    await prebuildContentTesting([LOADER]);
  }, 60_000);

  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is a labelled combobox', async () => {
    const { input } = await open();
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-label')).toBe('Search the content');
  });

  it('lists name matches best first: a name that starts with the words, then one with a word that does', async () => {
    const opened = await open();
    type(opened, 'attack');
    await expect(listedWhen(opened, 3)).resolves.toStrictEqual([
      'Attack-of-opportunity',
      'Power-attack',
      'Sudden-charge',
    ]);
  });

  it('adds what the server found below the names, without moving the names already listed', async () => {
    const opened = await open();
    type(opened, 'attack');
    await vi.waitFor(() => {
      opened.fixture.detectChanges();
      expect(listed(opened).slice(0, 2)).toStrictEqual(['Attack-of-opportunity', 'Power-attack']);
    });
    // The server ranks Sudden Charge first, but it only arrives below the names the user already sees.
    await expect(listedWhen(opened, 3)).resolves.toStrictEqual([
      'Attack-of-opportunity',
      'Power-attack',
      'Sudden-charge',
    ]);
  });

  it('shows the kind of each entry under its name', async () => {
    const opened = await open();
    type(opened, 'fireball');
    await listedWhen(opened, 1);
    expect(opened.root.querySelector('[role="option"]')?.textContent).toContain('Spell');
  });

  it('opens the highlighted entry on Enter', async () => {
    const opened = await open();
    type(opened, 'toughness');
    await listedWhen(opened, 1);
    await press(opened, 'ArrowDown');
    await press(opened, 'Enter');
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe(`/content/${ContentKind.Feat}/toughness`);
    });
    await vi.waitFor(() => {
      opened.fixture.detectChanges();
      expect(opened.input.value).toBe('');
    });
  });

  it('moves the highlight with the arrow keys', async () => {
    const opened = await open();
    type(opened, 'attack');
    await listedWhen(opened, 3);
    await press(opened, 'ArrowDown');
    const first = opened.input.getAttribute('aria-activedescendant');
    await press(opened, 'ArrowDown');
    expect(opened.input.getAttribute('aria-activedescendant')).not.toBe(first);
  });

  it('closes on Escape and forgets the words', async () => {
    const opened = await open();
    type(opened, 'attack');
    await listedWhen(opened, 3);
    await press(opened, 'Escape');
    expect(opened.input.value).toBe('');
    expect(opened.input.getAttribute('aria-expanded')).toBe('false');
  });

  it('takes focus on a slash', async () => {
    const opened = await open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(opened.input);
  });

  it('takes focus on Ctrl+K, even from a text field', async () => {
    const opened = await open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(opened.input);
  });

  it('leaves a slash typed in another text field alone', async () => {
    const opened = await open();
    const other = document.createElement('input');
    document.body.append(other);
    other.focus();
    other.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(other);
    other.remove();
    expect(opened.input).not.toBe(other);
  });
});
