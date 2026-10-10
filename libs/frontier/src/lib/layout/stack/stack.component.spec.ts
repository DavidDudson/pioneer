import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Stack, StackAlign, StackJustify } from './stack.component';

interface Rendered {
  readonly host: HTMLElement;
  readonly flex: Element;
  readonly items: readonly Element[];
}

/** Renders `fr-stack` with two spans projected and returns its host, inner element and the spans. */
async function render(inputs: Readonly<Record<string, unknown>>): Promise<Rendered> {
  const items = [document.createElement('span'), document.createElement('span')];
  const component = createComponent(Stack, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [items],
  });
  onTestFinished(() => {
    component.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    component.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(component.hostView);
  await appRef.whenStable();
  const host = component.location.nativeElement as HTMLElement;
  const flex = host.firstElementChild;
  if (flex === null) {
    throw new Error('Stack rendered no inner element');
  }
  return { host, flex, items };
}

describe(Stack, () => {
  it('maps token inputs to literal utility classes', async () => {
    const { flex } = await render({ gap: 'lg', direction: 'horizontal' });
    expect(flex.className).toContain('gap-lg');
    expect(flex.className).toContain('flex-row');
  });

  it('is not a query container unless responsive', async () => {
    const { host } = await render({});
    expect(host.className).not.toContain('@container');
  });

  it('stacks when narrow and becomes a row from its own container size', async () => {
    const { host, flex } = await render({ horizontalFrom: 'md' });
    expect(host.className).toContain('@container');
    expect(flex.className).toContain('flex-col');
    expect(flex.className).toContain('@md:flex-row');
  });

  it('stretches its children from the start by default', async () => {
    const { host, flex } = await render({});
    expect([...flex.classList]).toStrictEqual(
      expect.arrayContaining(['flex', 'flex-col', 'gap-md', 'items-stretch', 'justify-start']),
    );
    expect([...flex.classList]).not.toContain('flex-wrap');
    expect([...host.classList]).not.toContain('flex-1');
  });

  it.each([
    [StackAlign.Start, 'items-start'],
    [StackAlign.Center, 'items-center'],
    [StackAlign.End, 'items-end'],
    [StackAlign.Baseline, 'items-baseline'],
  ])('aligns %s children with %s', async (align, expected) => {
    const { flex } = await render({ align });
    expect([...flex.classList]).toContain(expected);
    expect([...flex.classList]).not.toContain('items-stretch');
  });

  it.each([
    [StackJustify.Center, 'justify-center'],
    [StackJustify.End, 'justify-end'],
    [StackJustify.Between, 'justify-between'],
  ])('justifies %s with %s', async (justify, expected) => {
    const { flex } = await render({ justify });
    expect([...flex.classList]).toContain(expected);
    expect([...flex.classList]).not.toContain('justify-start');
  });

  it('wraps onto new lines as a boolean attribute', async () => {
    const { flex } = await render({ wrap: '' });
    expect([...flex.classList]).toContain('flex-wrap');
  });

  it('takes the remaining space in a row as a boolean attribute', async () => {
    const { host } = await render({ grow: '' });
    expect([...host.classList]).toContain('flex-1');
  });

  it('projects its children into the inner flexbox', async () => {
    const { flex, items } = await render({});
    expect(items.map((item) => item.parentElement)).toStrictEqual([flex, flex]);
  });
});
