import { ApplicationRef, createComponent, EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';

import { projectBySelector } from '../../testing/project-by-selector';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { BoxWidth } from '../box/box.component';
import { HeaderCrumbs } from '../header-crumbs/header-crumbs';
import { ShellWidth } from '../shell-width/shell-width';
import { Shell } from './shell.component';

interface Rendered {
  readonly shell: HTMLElement;
  readonly header: HTMLElement;
  readonly search: HTMLElement;
  readonly content: HTMLElement;
  readonly footer: HTMLElement;
}

function element(tag: string, slot: string | undefined, text: string): Element {
  const created = document.createElement(tag);
  if (slot !== undefined) {
    created.setAttribute(slot, '');
  }
  created.textContent = text;
  return created;
}

/** Renders `fr-shell` branded "Pioneer" with an element projected into each slot. */
async function render(inputs: Readonly<Record<string, boolean | string>> = {}): Promise<Rendered> {
  const elements = [
    element('input', 'frShellSearch', 'Search'),
    element('button', 'frShellActions', 'Appearance'),
    element('p', 'frShellPanel', 'Avatars'),
    element('p', undefined, 'Routed page'),
    element('small', 'frShellFooter', 'Licence notice'),
  ];
  const component = createComponent(Shell, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: projectBySelector(Shell, elements),
  });
  onTestFinished(() => {
    component.destroy();
  });
  component.setInput('brand', 'Pioneer');
  component.setInput('badge', 'Pre-Alpha');
  for (const [name, value] of Object.entries(inputs)) {
    component.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(component.hostView);
  await appRef.whenStable();
  const shell = component.location.nativeElement as HTMLElement;
  const header = shell.querySelector<HTMLElement>(':scope > header');
  const search = shell.querySelector<HTMLElement>(':scope > header [frShellSearch]');
  const content = shell.querySelector<HTMLElement>(':scope > div main');
  const footer = shell.querySelector<HTMLElement>(':scope > footer');
  if (header === null || search === null || content === null || footer === null) {
    throw new Error('fr-shell rendered no header, search slot, main or footer');
  }
  return { shell, header, search, content, footer };
}

function panelOf(shell: HTMLElement): HTMLElement | null {
  return shell.querySelector<HTMLElement>(':scope > div aside:not(.hidden)');
}

function menuTrigger(shell: HTMLElement): HTMLElement | null {
  return shell.querySelector<HTMLElement>('header button[aria-label="More"]');
}

async function openMenu(shell: HTMLElement): Promise<void> {
  menuTrigger(shell)?.click();
  await TestBed.inject(ApplicationRef).whenStable();
}

/** Presses the entry of the open header menu with this text. */
async function pressEntry(name: string): Promise<void> {
  const entries = [...document.querySelectorAll<HTMLElement>('.cdk-overlay-container button')];
  entries.find((button) => button.textContent.trim() === name)?.click();
  await TestBed.inject(ApplicationRef).whenStable();
}

/** The classes of the box that holds a header's or footer's content, which cap its width. */
function boxClasses(region: HTMLElement): string[] {
  const box = region.querySelector('fr-box');
  if (box === null) {
    throw new Error('Expected the region to hold an fr-box');
  }
  return [...box.classList];
}

describe(Shell, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFrontierI18nTesting(), provideRouter([])] });
  });

  it('is a full-height column that pads for safe areas', async () => {
    const { shell } = await render();
    expect([...shell.classList]).toStrictEqual(
      expect.arrayContaining(['min-h-dvh', 'flex-col', 'pl-safe-left', 'pr-safe-right']),
    );
  });

  it('renders the brand in a sticky header padded for the notch', async () => {
    const { header } = await render();
    expect([...header.classList]).toStrictEqual(expect.arrayContaining(['sticky', 'z-sticky', 'pt-safe-top']));
    expect(header.querySelector('fr-text')?.textContent.trim()).toBe('Pioneer');
  });

  it('shows the badge beside the brand, and none when there is no badge', async () => {
    const { header } = await render();
    expect(header.querySelector('fr-badge')?.textContent.trim()).toBe('Pre-Alpha');
  });

  it('keeps the brand, crumbs, search and actions in one row', async () => {
    const { header } = await render();
    expect(header.querySelectorAll('fr-stack[direction="horizontal"]').length).toBeGreaterThan(0);
    expect(header.querySelector('[frShellSearch]')?.textContent).toBe('Search');
    expect(header.querySelector('button')?.textContent).toBe('Appearance');
  });

  it('shows the trail a page header published, and nothing without one', async () => {
    const empty = await render();
    expect(empty.header.querySelector('fr-breadcrumbs')).toBeNull();

    const release = TestBed.inject(HeaderCrumbs).show(
      signal([{ label: 'Characters', to: '/characters' }, { label: 'Valeros' }]),
    );
    onTestFinished(release);
    const shown = await render();
    expect(shown.header.querySelector('nav[aria-label="Breadcrumb"]')?.textContent).toContain('Valeros');
  });

  describe('search', () => {
    it('shows an icon button instead of the box until opened, and keeps the crumbs', async () => {
      const release = TestBed.inject(HeaderCrumbs).show(signal([{ label: 'Characters' }]));
      onTestFinished(release);
      const { header, search } = await render({ searchAvailable: true, searchOpen: false });
      expect(search.closest('div')?.className).toContain('hidden');
      expect(header.querySelector('button[aria-label="Search"]')).not.toBeNull();
      expect(header.querySelector('fr-breadcrumbs')).not.toBeNull();
    });

    it('has no button when no search is projected', async () => {
      const { header } = await render();
      expect(header.querySelector('button[aria-label="Search"]')).toBeNull();
    });

    it('opens on the button, hiding the crumbs and giving the box the row', async () => {
      const release = TestBed.inject(HeaderCrumbs).show(signal([{ label: 'Characters' }]));
      onTestFinished(release);
      const { shell, header, search } = await render({ searchAvailable: true, searchOpen: false });
      document.body.append(shell);
      onTestFinished(() => {
        shell.remove();
      });
      header.querySelector<HTMLElement>('button[aria-label="Search"]')?.click();
      await TestBed.inject(ApplicationRef).whenStable();
      expect(search.closest('div')?.className).toContain('flex-1');
      expect(header.querySelector('fr-breadcrumbs')).toBeNull();
      expect(header.querySelector('button[aria-label="Search"]')).toBeNull();
      expect(document.activeElement).toBe(search);
    });

    it('closes on Escape, with focus back on the button', async () => {
      const { shell, header, search } = await render({ searchAvailable: true, searchOpen: true });
      document.body.append(shell);
      onTestFinished(() => {
        shell.remove();
      });
      search.focus();
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await TestBed.inject(ApplicationRef).whenStable();
      expect(search.closest('div')?.className).toContain('hidden');
      expect(document.activeElement).toBe(header.querySelector('button[aria-label="Search"]'));
    });

    it('closes when focus leaves the box', async () => {
      const { shell, search } = await render({ searchAvailable: true, searchOpen: true });
      document.body.append(shell);
      onTestFinished(() => {
        shell.remove();
      });
      search.focus();
      search.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await TestBed.inject(ApplicationRef).whenStable();
      expect(search.closest('div')?.className).toContain('hidden');
    });
  });

  describe('panel', () => {
    const MINIMISED_KEY = 'fr-shell-panel-minimised';

    beforeEach(() => {
      localStorage.removeItem(MINIMISED_KEY);
      onTestFinished(() => {
        localStorage.removeItem(MINIMISED_KEY);
      });
    });

    it('takes no space and adds no menu while the page has no panel', async () => {
      const { shell } = await render();
      expect(panelOf(shell)).toBeNull();
      expect(menuTrigger(shell)).toBeNull();
    });

    it('puts the panel beside main, not in it, stuck in place and padded for the home indicator', async () => {
      const { shell, content } = await render({ panelAvailable: true, panelLabel: 'Party' });
      const panel = panelOf(shell);
      expect(panel?.getAttribute('aria-label')).toBe('Party');
      expect(panel?.textContent.trim()).toBe('Avatars');
      expect(content.contains(panel)).toBe(false);
      expect(panel?.className).toContain('sticky');
      expect(panel?.className).toContain('pb-safe-bottom');
    });

    it('minimises and restores from the header menu, remembering the choice', async () => {
      const { shell } = await render({ panelAvailable: true, panelLabel: 'Party' });
      await openMenu(shell);
      await pressEntry('Hide Party');
      expect(panelOf(shell)).toBeNull();
      expect(localStorage.getItem(MINIMISED_KEY)).toBe('true');

      // A control pressed in the dropdown leaves it open, now offering to show the panel again.
      await pressEntry('Show Party');
      expect(panelOf(shell)).not.toBeNull();
      expect(localStorage.getItem(MINIMISED_KEY)).toBeNull();
    });

    it('starts minimised when the browser remembers it', async () => {
      localStorage.setItem(MINIMISED_KEY, 'true');
      const { shell } = await render({ panelAvailable: true, panelLabel: 'Party' });
      expect(panelOf(shell)).toBeNull();
      expect(menuTrigger(shell)).not.toBeNull();
    });
  });

  it('projects routed content into main, between the header and the footer', async () => {
    const { content, header, footer } = await render();
    expect(content.textContent.trim()).toBe('Routed page');
    expect(content.closest('div')?.parentElement?.previousElementSibling).toBe(header);
    expect(content.closest('div')?.parentElement?.nextElementSibling).toBe(footer);
    expect([...content.classList]).toContain('flex-1');
  });

  it('makes main the only main landmark, focusable as a skip target but not by Tab', async () => {
    const { shell, content } = await render();
    expect(shell.querySelectorAll('main')).toHaveLength(1);
    expect(content.id).not.toBe('');
    expect(content.getAttribute('tabindex')).toBe('-1');
  });

  it('starts with a skip link to main, visually hidden until it has focus', async () => {
    const { shell, header, content } = await render();
    const first = shell.querySelector('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    expect(first?.textContent.trim()).toBe('Skip to content');
    expect(first?.getAttribute('href')).toBe(`#${content.id}`);
    expect(header.querySelector(':scope > span a')).toBe(first);
    const wrapper = header.querySelector(':scope > span');
    expect(wrapper?.className).toMatch(/(?:^| )sr-only(?: |$)/u);
    expect(wrapper?.className).toMatch(/(?:^| )focus-within:not-sr-only(?: |$)/u);
  });

  it('moves focus to main when the skip link is followed', async () => {
    const { shell, content } = await render();
    document.body.append(shell);
    onTestFinished(() => {
      shell.remove();
    });
    const skipLink = shell.querySelector('a');
    skipLink?.click();
    expect(document.activeElement).toBe(content);
  });

  it('projects frShellFooter into the footer, padded for the home indicator', async () => {
    const { footer } = await render();
    expect(footer.textContent.trim()).toBe('Licence notice');
    expect([...footer.classList]).toContain('pb-safe-bottom');
  });

  it('caps the header and footer at the page width when no page says otherwise', async () => {
    const { header, footer } = await render();
    expect(boxClasses(header)).toContain('max-w-page');
    expect(boxClasses(footer)).toContain('max-w-page');
  });

  it('makes the header and footer as wide as a full-width page, so the brand and actions sit at its edges', async () => {
    TestBed.inject(ShellWidth).show(signal<BoxWidth>(BoxWidth.Full));
    const { header, footer } = await render();
    expect(boxClasses(header)).not.toContain('max-w-page');
    expect(boxClasses(footer)).not.toContain('max-w-page');
  });
});
