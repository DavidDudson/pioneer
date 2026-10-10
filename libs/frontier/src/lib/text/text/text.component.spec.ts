import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Tone } from '../../tokens';
import { FontWeight, TextVariant } from '../text.variants';
import { Text, TextElement } from './text.component';

/** Renders `fr-text` with `content` projected and returns the element it renders. */
async function render(inputs: Readonly<Record<string, unknown>>, content = 'AC'): Promise<HTMLElement> {
  const node = document.createTextNode(content);
  const text = createComponent(Text, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[node]],
  });
  onTestFinished(() => {
    text.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    text.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(text.hostView);
  await appRef.whenStable();
  let rendered = (text.location.nativeElement as HTMLElement).firstElementChild;
  // Inline elements render through the internal fr-text-phrase.
  while (rendered?.tagName.startsWith('FR-') === true) {
    rendered = rendered.firstElementChild;
  }
  if (!(rendered instanceof HTMLElement)) {
    throw new Error('fr-text rendered no element');
  }
  return rendered;
}

describe(Text, () => {
  it('renders a <span> by default', async () => {
    const rendered = await render({});
    expect(rendered.tagName).toBe('SPAN');
    expect(rendered.textContent.trim()).toBe('AC');
  });

  it('sets body text in the default tone by default', async () => {
    const rendered = await render({});
    expect([...rendered.classList]).toStrictEqual(expect.arrayContaining(['text-body', 'text-fg-default']));
  });

  it.each([
    [TextVariant.Display, 'text-display'],
    [TextVariant.Lead, 'text-lead'],
    [TextVariant.Label, 'text-label'],
    [TextVariant.Caption, 'text-caption'],
  ])('sets the %s variant as %s', async (variant, expected) => {
    const rendered = await render({ variant });
    expect([...rendered.classList]).toContain(expected);
    expect([...rendered.classList]).not.toContain('text-body');
  });

  it('takes a tone and weight, truncates and aligns figures when asked', async () => {
    const rendered = await render({ tone: Tone.Muted, weight: FontWeight.Bold, truncate: true, numeric: true });
    expect([...rendered.classList]).toStrictEqual(
      expect.arrayContaining(['text-fg-muted', 'font-bold', 'truncate', 'tabular-nums']),
    );
  });

  it.each(Object.values(TextElement))('renders <%s> when asked', async (element) => {
    const rendered = await render({ element });
    expect(rendered.tagName).toBe(element.toUpperCase());
    expect(rendered.textContent.trim()).toBe('AC');
  });

  it.each([TextElement.Preformatted, TextElement.Code, TextElement.Keyboard])(
    'sets <%s> in the mono font',
    async (element) => {
      const rendered = await render({ element });
      expect([...rendered.classList]).toContain('font-mono');
    },
  );

  it('keeps the line breaks in a <pre>', async () => {
    const rendered = await render({ element: TextElement.Preformatted }, '[\n  "a"\n]');
    expect(rendered.textContent).toBe('[\n  "a"\n]');
    expect([...rendered.classList]).toContain('whitespace-pre-wrap');
  });

  it('boxes a <kbd> like a key', async () => {
    const rendered = await render({ element: TextElement.Keyboard });
    expect([...rendered.classList]).toStrictEqual(expect.arrayContaining(['border', 'border-line-default']));
  });

  it('spells out an <abbr> in its title', async () => {
    const rendered = await render({ element: TextElement.Abbreviation, expansion: 'Armor Class' });
    expect(rendered.getAttribute('title')).toBe('Armor Class');
  });

  it.each([
    [TextElement.Emphasis, 'EM', 'italic'],
    [TextElement.Strong, 'STRONG', 'font-semibold'],
  ])('renders %s as <%s>, styled %s', async (element, tagName, style) => {
    const rendered = await render({ element });
    expect(rendered.tagName).toBe(tagName);
    expect([...rendered.classList]).toContain(style);
  });

  it('leaves the title off an <abbr> with no expansion', async () => {
    const rendered = await render({ element: TextElement.Abbreviation });
    expect(rendered.hasAttribute('title')).toBe(false);
  });
});
