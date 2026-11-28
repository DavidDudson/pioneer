import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import type { ComponentInputs } from '../../testing/component-inputs';
import { DamageTone, Tone } from '../../tokens';
import { FontWeight, TextVariant } from '../text.variants';
import { INHERIT_TONE, Text, TextElement } from './text.component';

/** Renders `fr-text` with `content` projected and returns the element it renders. */
async function render(inputs: ComponentInputs<Text>, content = 'AC'): Promise<HTMLElement> {
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
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  let rendered = (text.location.nativeElement as HTMLElement).firstElementChild;

  // Inline elements render through the internal fr-text-phrase.
  while (rendered?.tagName.startsWith('FR-') === true) {
    rendered = rendered.firstElementChild;
  }

  if (!(rendered instanceof HTMLElement)) {
    throw new TypeError('fr-text rendered no element');
  }

  return rendered;
}

describe(Text, () => {
  it('renders a <span> by default', async () => {
    const rendered = await render({});
    expect(rendered.tagName).toBe('SPAN');
    expect(rendered.textContent.trim()).toBe('AC');
  });

  it('sets body text with no colour by default, so it takes its parent', async () => {
    const rendered = await render({});
    expect([...rendered.classList]).toContain('text-body');
    expect([...rendered.classList].filter((name) => name.startsWith('text-fg-'))).toStrictEqual([]);
  });

  it('sets the default tone when asked', async () => {
    const rendered = await render({ tone: Tone.Default });
    expect([...rendered.classList]).toContain('text-fg-default');
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

  it.each([TextVariant.Display, TextVariant.Title, TextVariant.Heading, TextVariant.Subheading])(
    'balances the lines of the %s variant',
    async (variant) => {
      const rendered = await render({ variant });
      expect([...rendered.classList]).toContain('text-balance');
    },
  );

  it.each([TextVariant.Lead, TextVariant.Body, TextVariant.Label, TextVariant.Caption])(
    'leaves the lines of the %s variant unbalanced',
    async (variant) => {
      const rendered = await render({ variant });
      expect([...rendered.classList]).not.toContain('text-balance');
    },
  );

  it.each([
    [TextVariant.Display, 'font-display'],
    [TextVariant.Title, 'font-display'],
    [TextVariant.Heading, 'font-display'],
    [TextVariant.Subheading, 'font-display'],
    [TextVariant.Label, 'font-ui'],
    [TextVariant.Caption, 'font-ui'],
    [TextVariant.Lead, 'font-text'],
    [TextVariant.Brand, 'font-brand'],
  ])('sets the %s variant in the %s role', async (variant, role) => {
    const rendered = await render({ variant });
    expect([...rendered.classList]).toContain(role);
  });

  it.each(['font-display', 'font-ui', 'font-text', 'font-brand', 'font-mono'])(
    'leaves body text without %s, so it takes the role of what holds it',
    async (role) => {
      const rendered = await render({ variant: TextVariant.Body });
      expect([...rendered.classList]).not.toContain(role);
    },
  );

  it.each([TextElement.Code, TextElement.Preformatted, TextElement.Keyboard])(
    'sets <%s> in the mono face alone, whatever its variant',
    async (element) => {
      const rendered = await render({ element, variant: TextVariant.Label });
      expect([...rendered.classList]).toContain('font-mono');
      expect([...rendered.classList]).not.toContain('font-ui');
    },
  );

  it.each([TextVariant.Display, TextVariant.Label, TextVariant.Lead])(
    'sets monospace %s text in the mono face alone',
    async (variant) => {
      const rendered = await render({ variant, monospace: true });
      expect([...rendered.classList]).toContain('font-mono');
      expect([...rendered.classList]).not.toContain('font-display');
      expect([...rendered.classList]).not.toContain('font-ui');
      expect([...rendered.classList]).not.toContain('font-text');
    },
  );

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

  it('colours by a damage type in place of its tone', async () => {
    const rendered = await render({ damage: DamageTone.Fire, tone: Tone.Muted });
    expect([...rendered.classList]).toContain('text-damage-fire');
    expect([...rendered.classList]).not.toContain('text-fg-muted');
    expect([...rendered.classList]).not.toContain('text-fg-default');
  });

  it('sets no colour for the inherit tone, so the text takes the colour of its parent', async () => {
    const rendered = await render({ tone: INHERIT_TONE });

    expect([...rendered.classList].filter((name) => name.startsWith('text-fg-'))).toStrictEqual([]);
  });

  it('keeps the line breaks in a <pre>', async () => {
    const rendered = await render({ element: TextElement.Preformatted }, '[\n  "a"\n]');
    expect(rendered.textContent).toBe('[\n  "a"\n]');
    expect([...rendered.classList]).toContain('whitespace-pre-wrap');
  });

  it('boxes a <kbd> like a key', async () => {
    const rendered = await render({ element: TextElement.Keyboard });
    expect([...rendered.classList]).toStrictEqual(expect.arrayContaining(['border', 'border-line-default']));
  });

  it('gives a <kbd> a height and a least width, so one letter is a square key', async () => {
    const rendered = await render({ element: TextElement.Keyboard }, 'K');
    expect([...rendered.classList]).toStrictEqual(expect.arrayContaining(['h-key', 'min-w-key']));
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

  it('sets the text in the monospace face on request', async () => {
    const rendered = await render({ monospace: true }, '+10');

    expect(rendered.classList).toContain('font-mono');
  });

  it('sets a text with a width floor in tabular, lining figures, since it is a figure', async () => {
    const rendered = await render({ minWidth: 'modifier' }, '+10');

    expect([...rendered.classList]).toStrictEqual(expect.arrayContaining(['tabular-nums', 'lining-nums']));
  });

  it('sets no figure classes on prose', async () => {
    const rendered = await render({});

    expect([...rendered.classList]).not.toContain('tabular-nums');
  });

  it('keeps a floor for the width, centring shorter text in it', async () => {
    const rendered = await render({ minWidth: 'modifier' }, '-3');

    expect(rendered.classList).toContain('min-w-modifier');
    expect(rendered.classList).toContain('text-center');
  });
});
