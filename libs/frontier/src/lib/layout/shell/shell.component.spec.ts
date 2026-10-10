import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';

import { projectBySelector } from '../../testing/project-by-selector';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { Shell } from './shell.component';

interface Rendered {
  readonly shell: HTMLElement;
  readonly header: HTMLElement;
  readonly nav: HTMLElement;
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
async function render(): Promise<Rendered> {
  const elements = [
    element('a', 'frShellNav', 'Characters'),
    element('button', 'frShellActions', 'Appearance'),
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
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(component.hostView);
  await appRef.whenStable();
  const shell = component.location.nativeElement as HTMLElement;
  const header = shell.querySelector<HTMLElement>(':scope > header');
  const nav = shell.querySelector<HTMLElement>(':scope > header nav');
  const content = shell.querySelector<HTMLElement>(':scope > div');
  const footer = shell.querySelector<HTMLElement>(':scope > footer');
  if (header === null || nav === null || content === null || footer === null) {
    throw new Error('fr-shell rendered no header, nav, content or footer');
  }
  return { shell, header, nav, content, footer };
}

describe(Shell, () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFrontierI18nTesting()] });
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

  it('labels the main navigation from the en messages and projects frShellNav into it', async () => {
    const { nav } = await render();
    expect(nav.getAttribute('aria-label')).toBe('Main');
    expect(nav.querySelector('a')?.textContent).toBe('Characters');
  });

  it('projects frShellActions into the header, outside the navigation', async () => {
    const { header, nav } = await render();
    expect(header.querySelector('button')?.textContent).toBe('Appearance');
    expect(nav.querySelector('button')).toBeNull();
  });

  it('projects routed content between the header and the footer', async () => {
    const { content, header, footer } = await render();
    expect(content.textContent.trim()).toBe('Routed page');
    expect(content.previousElementSibling).toBe(header);
    expect(content.nextElementSibling).toBe(footer);
    expect([...content.classList]).toContain('flex-1');
  });

  it('projects frShellFooter into the footer, padded for the home indicator', async () => {
    const { footer } = await render();
    expect(footer.textContent.trim()).toBe('Licence notice');
    expect([...footer.classList]).toContain('pb-safe-bottom');
  });
});
