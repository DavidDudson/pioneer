import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { kernelMessages } from '@pioneer/shared/kernel';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import { playRoutes } from '../../play.routes';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

async function openPlayground(): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'play', children: playRoutes }]),
      provideI18n({ en: async () => ({ ...kernelMessages, ...frontierMessages }) }),
    ],
  });
  const harness = await RouterTestingHarness.create('/play/rules');
  await harness.fixture.whenStable();
  return harness;
}

async function typeJson(harness: RouterTestingHarness, text: string): Promise<void> {
  const textarea = present(harness.routeNativeElement?.querySelector('textarea'));
  textarea.value = text;
  textarea.dispatchEvent(new Event('input'));
  await harness.fixture.whenStable();
}

async function chooseSchema(harness: RouterTestingHarness, label: string): Promise<void> {
  present(harness.routeNativeElement?.querySelector('button')).click();
  await harness.fixture.whenStable();
  const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  present(options.find((option) => option.textContent.trim() === label)).click();
  await harness.fixture.whenStable();
}

async function typeInto(harness: RouterTestingHarness, input: HTMLInputElement, text: string): Promise<void> {
  input.value = text;
  input.dispatchEvent(new Event('input'));
  await harness.fixture.whenStable();
}

function pageText(harness: RouterTestingHarness): string {
  return present(harness.routeNativeElement).textContent;
}

/** The verdict tool's second text area. */
function factsInput(harness: RouterTestingHarness): HTMLTextAreaElement {
  return present(present(harness.routeNativeElement).querySelectorAll('textarea').item(1));
}

describe('RulesPlaygroundPage', () => {
  it('opens on a valid example predicate', async () => {
    const harness = await openPlayground();
    // Text from the route's `play` scope, loaded with the page's code.
    expect(pageText(harness)).toContain('Valid.');
    expect(pageText(harness)).toContain('"gte"');
    // The schema picker's label comes from the `play` scope, not a scope-prefixed key.
    const picker = present(harness.routeNativeElement?.querySelector('button')).textContent;
    expect(picker).toContain('Predicate');
    expect(picker).not.toContain('play.rules');
    expect(present(harness.routeNativeElement?.querySelector('textarea')).value).toContain('self:condition:frightened');
  });

  it('points at each problem with text from the rules and kernel bundles', async () => {
    const harness = await openPlayground();
    await typeJson(harness, '["Frightened", { "and": ["a:b"], "label": "x" }]');

    const text = pageText(harness);
    expect(text).toContain('2 problems');
    expect(text).toContain('[0]');
    expect(text).toContain('Use a namespace and a name joined by colons, like self:condition:frightened.');
    expect(text).toContain('[1].label');
    expect(text).toContain('“label” is not a field here.');
  });

  it('describes the textarea with the problem summary, so screen readers announce it', async () => {
    const harness = await openPlayground();
    await typeJson(harness, '["Frightened", { "and": ["a:b"], "label": "x" }]');

    const textarea = present(harness.routeNativeElement?.querySelector('textarea'));
    const describedBy = present(textarea.getAttribute('aria-describedby'));
    const description = present(document.querySelector(`#${CSS.escape(describedBy)}`));
    expect(description.textContent).toContain('2 problems, listed under Result.');
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
  });

  it('says when the text is not JSON yet', async () => {
    const harness = await openPlayground();
    await typeJson(harness, '[self:condition:frightened');
    expect(pageText(harness)).toContain('This is not valid JSON yet.');
  });

  it('checks rule elements, naming an element it does not know', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Rule element');
    expect(pageText(harness)).toContain('Valid.');
    expect(pageText(harness)).toContain('"FlatModifier"');

    await typeJson(harness, '{ "key": "ActiveEffectLike", "path": "system.attributes.ac.value" }');
    const text = pageText(harness);
    expect(text).toContain('1 problem');
    expect(text).toContain('key');
    expect(text).toContain('“ActiveEffectLike” is not a rule element Pioneer knows yet.');
  });

  it('switches to a one-line formula input that opens on a valid example', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Formula');
    expect(pageText(harness)).toContain('Value: 20');
    expect(pageText(harness)).toContain('10 + @attr.dex.capped + @prof.armor + @level');
    expect(harness.routeNativeElement?.querySelector('textarea')).toBeNull();
  });

  it('evaluates the formula with a number box per reference', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Formula');
    expect(pageText(harness)).toContain('Value: 20');
    expect(pageText(harness)).toContain('@attr.dex.capped');

    const boxes = [...present(harness.routeNativeElement).querySelectorAll<HTMLInputElement>('input[type="number"]')];
    expect(boxes).toHaveLength(3);
    const level = present(boxes[2]);
    await typeInto(harness, level, '10');
    expect(pageText(harness)).toContain('Value: 25');
  });

  it('leaves a reference without a value while its box is empty, and points at it', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Formula');
    const boxes = [...present(harness.routeNativeElement).querySelectorAll<HTMLInputElement>('input[type="number"]')];
    const level = present(boxes[2]);
    await typeInto(harness, level, '');
    const text = pageText(harness);
    expect(text).toContain('“@level” at position 39 has no value.');
    expect(text).toContain(`10 + @attr.dex.capped + @prof.armor + @level\n${' '.repeat(38)}^`);
    expect(level.getAttribute('aria-invalid')).toBe('true');
  });

  it('keeps the boxes while the formula is mid-edit, and resets one whose reference left the formula', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Formula');
    const formula = present(harness.routeNativeElement?.querySelector<HTMLInputElement>('input:not([type="number"])'));
    const level = present(
      [...present(harness.routeNativeElement).querySelectorAll<HTMLInputElement>('input[type="number"]')][2],
    );
    await typeInto(harness, level, '');

    await typeInto(harness, formula, '10 + @attr.dex.capped + @prof.armor + @level *');
    expect(level.isConnected).toBe(true);

    await typeInto(harness, formula, '10 + @attr.dex.capped + @prof.armor');
    await typeInto(harness, formula, '10 + @attr.dex.capped + @prof.armor + @level');
    const boxes = [...present(harness.routeNativeElement).querySelectorAll<HTMLInputElement>('input[type="number"]')];
    expect(present(boxes[2]).value).toBe('5');
    expect(pageText(harness)).toContain('Value: 20');
  });

  it('points at the first mistake in a formula with text from the formula bundle', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Formula');
    const input = present(harness.routeNativeElement?.querySelector('input'));
    input.value = 'max(1, level)';
    input.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();

    const text = pageText(harness);
    expect(text).toContain('max(1, level)\n       ^');
    expect(text).toContain('“level” at position 8 is not a function.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('evaluates a predicate against roll options and shows each statement verdict', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Predicate verdict');

    const text = pageText(harness);
    expect(text).toContain('The predicate depends on the situation');
    expect(text).toContain('Holds');
    expect(text).toContain('Depends');
    expect(text).toContain('{"gte":["self:level",5]}');

    const facts = factsInput(harness);
    facts.value = 'self:condition:frightened\nself:level:5\naction:seek';
    facts.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    expect(pageText(harness)).toContain('The predicate holds.');
  });

  it('points at roll option lines that are not roll options', async () => {
    const harness = await openPlayground();
    await chooseSchema(harness, 'Predicate verdict');

    const facts = factsInput(harness);
    facts.value = 'self:level:5\nFrightened';
    facts.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();

    expect(pageText(harness)).toContain('Line 2 is not a roll option.');
    expect(facts.getAttribute('aria-invalid')).toBe('true');
  });
});
