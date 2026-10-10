import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Space } from '../../tokens';
import { Box, BoxWidth } from './box.component';

interface Rendered {
  readonly host: HTMLElement;
  readonly inner: Element;
}

/** Renders `fr-box` with "Ability scores" projected and returns its host and inner element. */
async function render(inputs: Readonly<Record<string, unknown>>): Promise<Rendered> {
  const box = createComponent(Box, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[document.createTextNode('Ability scores')]],
  });
  onTestFinished(() => {
    box.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    box.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(box.hostView);
  await appRef.whenStable();
  const host = box.location.nativeElement as HTMLElement;
  const inner = host.firstElementChild;
  if (inner === null) {
    throw new Error('fr-box rendered no inner element');
  }
  return { host, inner };
}

describe(Box, () => {
  it('is a full-width query container with no padding by default', async () => {
    const { host, inner } = await render({});
    expect([...host.classList]).toStrictEqual(expect.arrayContaining(['@container', 'w-full']));
    expect([...host.classList]).not.toContain('mx-auto');
    expect([...inner.classList]).toStrictEqual(['p-none']);
  });

  it.each([
    [BoxWidth.Prose, 'max-w-prose'],
    [BoxWidth.Page, 'max-w-page'],
  ])('centres a %s box at %s', async (width, maxWidth) => {
    const { host } = await render({ width });
    expect([...host.classList]).toStrictEqual(expect.arrayContaining(['mx-auto', 'w-full', maxWidth]));
  });

  it('pads the inner element from the space token', async () => {
    const { host, inner } = await render({ padding: Space.Lg });
    expect([...inner.classList]).toContain('p-lg');
    expect([...host.classList]).not.toContain('p-lg');
  });

  it('adds a side gutter that widens from the lg container size', async () => {
    const { inner } = await render({ gutter: '' });
    expect([...inner.classList]).toStrictEqual(expect.arrayContaining(['px-md', '@lg:px-xl']));
  });

  it('projects its content into the inner element', async () => {
    const { inner } = await render({});
    expect(inner.textContent).toBe('Ability scores');
  });
});
