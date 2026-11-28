import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import type { ComponentInputs } from '../../testing/component-inputs';
import { Inset, Space } from '../../tokens';
import { Box, BoxWidth } from './box.component';

interface Rendered {
  readonly host: HTMLElement;
  readonly inner: Element;
}

/** Renders `fr-box` with "Ability scores" projected and returns its host and inner element. */
async function render(inputs: ComponentInputs<Box>): Promise<Rendered> {
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
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
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
    expect([...inner.classList].toSorted()).toStrictEqual(['px-none', 'py-none']);
  });

  it.each([
    [BoxWidth.Prose, 'max-w-prose'],
    [BoxWidth.Page, 'max-w-page'],
  ])('centres a %s box at %s', async (width, maxWidth) => {
    const { host } = await render({ width });
    expect([...host.classList]).toStrictEqual(expect.arrayContaining(['mx-auto', 'w-full', maxWidth]));
  });

  it('pads the block axis alone from a token', async () => {
    const { host, inner } = await render({ paddingBlock: Space.Lg });
    expect([...inner.classList].toSorted()).toStrictEqual(['px-none', 'py-lg']);
    expect([...host.classList]).not.toContain('py-lg');
  });

  it('pads the block axis from an inset', async () => {
    const { inner } = await render({ paddingBlock: Inset.Page });
    expect([...inner.classList].toSorted()).toStrictEqual(['px-none', 'py-inset-page']);
  });

  it('pads the inline axis alone from a token', async () => {
    const { inner } = await render({ paddingInline: Inset.Panel });
    expect([...inner.classList].toSorted()).toStrictEqual(['px-inset-panel', 'py-none']);
  });

  it('adds a side gutter that widens from the lg container size, beside block padding', async () => {
    const { inner } = await render({ paddingBlock: Space.Lg, paddingInline: 'gutter' });
    expect([...inner.classList].toSorted()).toStrictEqual(['@lg:px-xl', 'px-md', 'py-lg']);
    expect([...inner.classList].filter((name) => name.startsWith('p-'))).toStrictEqual([]);
  });

  it('shows the box only from a container size, unless revealed', async () => {
    const hidden = await render({ shownFrom: 'md' });
    expect([...hidden.host.classList]).toStrictEqual(expect.arrayContaining(['hidden', '@md:block']));
    expect([...hidden.host.classList]).not.toContain('block');
    const revealed = await render({ shownFrom: 'md', revealed: '' });
    expect([...revealed.host.classList]).toContain('block');
    expect([...revealed.host.classList]).not.toContain('hidden');
  });

  it('hides the box from a container size up', async () => {
    const { host } = await render({ hiddenFrom: 'md' });
    expect([...host.classList]).toStrictEqual(expect.arrayContaining(['block', '@md:hidden']));
  });

  it('keeps the visibility off the inner element, which sits inside the box own container', async () => {
    const { inner } = await render({ shownFrom: 'md', hiddenFrom: 'lg' });
    expect([...inner.classList].toSorted()).toStrictEqual(['px-none', 'py-none']);
  });

  it('projects its content into the inner element', async () => {
    const { inner } = await render({});
    expect(inner.textContent).toBe('Ability scores');
  });
});
