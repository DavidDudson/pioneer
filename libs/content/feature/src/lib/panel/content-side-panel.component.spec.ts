import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { contentBrowserMessages } from '@pioneer/content/ui';
import { frontierMessages } from '@pioneer/frontier';
import { prebuildContentTesting, provideContentTesting, TestContentDelivery } from '@pioneer/rules/data-access/testing';
import { packContentsFromFiles, rulesMessages } from '@pioneer/rules/sdk';
import type { ContentPack, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { IDLE_SCHEDULER, provideI18n, ShellSearch } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { afterEach, beforeAll, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import contentMessages from '../../i18n/en.json';
import { ContentSidePanel } from './content-side-panel.component';

const BUILDER = new ContentPackBuilder().withId('side-panel-test');
const PACK: ContentPack = BUILDER.withFeat('power-attack', {
  level: 1,
  traits: [],
  description: [{ type: 'paragraph', content: [{ type: 'text', text: 'Strike with all your might.' }] }],
})
  .withFeat('attack-of-opportunity', { level: 1, traits: [] })
  .withFeat('toughness', { level: 1, traits: [] })
  .build();
const LOADER: PackContentsLoader = {
  id: PACK.id,
  load: async () => packContentsFromFiles(PACK.manifest, [PACK.otherEntries]),
};

/** The shell's messages the search reads: the app owns them, so the spec holds the ones it needs. */
const SHELL_MESSAGES = {
  'shell.search.label': 'Search the content',
  'shell.search.placeholder': 'Search content',
  'shell.search.kind.feat': 'Feat',
};
const SEARCH_LABEL = SHELL_MESSAGES['shell.search.label'];
const BACK_LABEL = contentMessages.sidePanel.back;
const OPEN_IN_BROWSER_LABEL = contentMessages.sidePanel.openInBrowser;

interface Opened {
  readonly fixture: ComponentFixture<ContentSidePanel>;
  readonly root: HTMLElement;
  readonly input: HTMLInputElement;
  readonly router: Router;
}

/** The layout jsdom does not do: a listbox with height and rows with a touch target's size. */
function stubLayout(): void {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(220);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ width: 220, height: 44 }),
  );
}

/** The panel with the address as given, the way a reload or a shared link reaches it. */
async function open(address = '/'): Promise<Opened> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      provideI18n({
        en: async () => ({
          ...frontierMessages,
          ...rulesMessages,
          ...contentBrowserMessages,
          ...SHELL_MESSAGES,
          content: contentMessages,
        }),
      }),
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
  const router = TestBed.inject(Router);
  await router.navigateByUrl(address);
  const fixture = TestBed.createComponent(ContentSidePanel);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const input = root.querySelector('input');
  if (input === null) {
    throw new Error('Expected the search box to render');
  }
  return { fixture, root, input, router };
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

const backLink = ({ root }: Opened): HTMLElement | undefined =>
  [...root.querySelectorAll<HTMLElement>('button')].find((button) => button.textContent.trim() === BACK_LABEL);

/** The text of the entry read under the box, once it has loaded. */
async function readEntry(opened: Opened, text: string): Promise<void> {
  await vi.waitFor(() => {
    opened.fixture.detectChanges();
    expect(opened.root.textContent).toContain(text);
  });
}

describe(ContentSidePanel, () => {
  beforeAll(async () => {
    await prebuildContentTesting([LOADER]);
  }, 60_000);

  beforeEach(() => {
    stubLayout();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is a labelled combobox with no entry shown', async () => {
    const opened = await open();
    expect(opened.input.getAttribute('role')).toBe('combobox');
    expect(opened.input.getAttribute('aria-label')).toBe(SEARCH_LABEL);
    expect(backLink(opened)).toBeUndefined();
  });

  it('reads the picked result under the box, keeps the words and writes both to the address', async () => {
    const opened = await open();
    type(opened, 'toughness');
    await vi.waitFor(() => {
      opened.fixture.detectChanges();
      expect(listed(opened)).toStrictEqual(['Toughness']);
    });
    await press(opened, 'ArrowDown');
    await press(opened, 'Enter');
    await vi.waitFor(() => {
      expect(opened.router.url).toBe('/?sq=toughness&se=feat:toughness');
    });
    await readEntry(opened, 'Toughness');
    expect(opened.input.value).toBe('toughness');
    expect(backLink(opened)).toBeDefined();
  });

  it('restores the words and the entry from the address', async () => {
    const opened = await open('/?sq=attack&se=feat:power-attack');
    await readEntry(opened, 'Strike with all your might.');
    expect(opened.input.value).toBe('attack');
  });

  it('goes back to the results of the same words', async () => {
    const opened = await open('/?sq=attack&se=feat:power-attack');
    await readEntry(opened, 'Strike with all your might.');
    backLink(opened)?.click();
    await vi.waitFor(() => {
      opened.fixture.detectChanges();
      expect(opened.router.url).toBe('/?sq=attack');
    });
    await vi.waitFor(() => {
      opened.fixture.detectChanges();
      expect(listed(opened)).toStrictEqual(['Attack-of-opportunity', 'Power-attack']);
    });
    expect(backLink(opened)).toBeUndefined();
    expect(opened.input.getAttribute('aria-expanded')).toBe('true');
  });

  it('opens the drawer on Ctrl+K and puts the cursor in the box', async () => {
    const opened = await open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(opened.router.url).toBe('/?drawer=open');
    });
    await vi.waitFor(() => {
      opened.fixture.detectChanges();
      expect(document.activeElement).toBe(opened.input);
    });
  });

  it('opens the drawer on a slash outside a text field', async () => {
    const opened = await open();
    const event = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    await vi.waitFor(() => {
      expect(opened.router.url).toBe('/?drawer=open');
    });
  });

  it('leaves a slash typed in another text field alone', async () => {
    const opened = await open();
    const other = document.createElement('input');
    document.body.append(other);
    onTestFinished(() => {
      other.remove();
    });
    other.focus();
    const event = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    other.dispatchEvent(event);
    await opened.fixture.whenStable();

    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(other);
    expect(opened.router.url).toBe('/');
  });

  it('only moves the cursor to the box on Ctrl+K when the drawer is already open', async () => {
    const opened = await open('/?drawer=open');
    opened.input.blur();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      opened.fixture.detectChanges();
      expect(document.activeElement).toBe(opened.input);
    });
    expect(opened.router.url).toBe('/?drawer=open');
  });

  it('moves the cursor to the box when the page asks for it while the drawer is already open', async () => {
    const opened = await open('/?drawer=open');
    opened.input.blur();
    TestBed.inject(ShellSearch).requestFocus();
    await vi.waitFor(() => {
      opened.fixture.detectChanges();
      expect(document.activeElement).toBe(opened.input);
    });
    expect(opened.router.url).toBe('/?drawer=open');
  });

  it('keeps what was typed when the address echoes it back', async () => {
    const opened = await open();
    type(opened, 'power');
    await vi.waitFor(() => {
      expect(opened.router.url).toBe('/?sq=power');
    });
    await opened.fixture.whenStable();
    opened.fixture.detectChanges();

    expect(opened.input.value).toBe('power');
    expect(listed(opened)).toStrictEqual(['Power-attack']);
  });

  it('takes in words that change in the address from outside', async () => {
    const opened = await open('/?sq=power');
    await settled(opened);

    await opened.router.navigateByUrl('/?sq=tough');
    await vi.waitFor(() => {
      opened.fixture.detectChanges();
      expect(opened.input.value).toBe('tough');
    });
    await press(opened, 'ArrowDown');
    await vi.waitFor(() => {
      opened.fixture.detectChanges();
      expect(listed(opened)).toStrictEqual(['Toughness']);
    });
  });

  it('links the entry being read to the full content page, with its kind and the words', async () => {
    const opened = await open('/?sq=attack&se=feat:power-attack');
    await readEntry(opened, 'Strike with all your might.');
    const link = [...opened.root.querySelectorAll('a')].find(
      (anchor) => anchor.textContent.trim() === OPEN_IN_BROWSER_LABEL,
    );
    expect(link?.getAttribute('href')).toBe('/content/feat/power-attack?kind=feat&q=attack');
  });

  it('drops the words from the address when the box is emptied', async () => {
    const opened = await open('/?sq=power');
    await settled(opened);

    type(opened, '');
    await vi.waitFor(() => {
      expect(opened.router.url).toBe('/');
    });
    expect(opened.input.value).toBe('');
  });
});

/** Lets the words in the address reach the box and the search. */
async function settled({ fixture, input }: Opened): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
  expect(input.value).not.toBe('');
}
