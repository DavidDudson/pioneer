import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import type { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Size } from '../../tokens';
import { Button, ButtonType, ButtonVariant } from './button.component';

interface Rendered {
  readonly button: HTMLButtonElement;
  readonly ref: ComponentRef<Button>;
  readonly presses: MouseEvent[];
}

/** Renders `fr-button` with "Save" projected and returns its native button and the presses it emits. */
async function render(inputs: Readonly<Record<string, unknown>>): Promise<Rendered> {
  const ref = createComponent(Button, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[document.createTextNode('Save')]],
  });
  onTestFinished(() => {
    ref.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    ref.setInput(name, value);
  }
  const presses: MouseEvent[] = [];
  ref.instance.pressed.subscribe((event) => {
    presses.push(event);
  });
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(ref.hostView);
  await appRef.whenStable();
  const button = (ref.location.nativeElement as HTMLElement).querySelector('button');
  if (button === null) {
    throw new Error('fr-button rendered no <button>');
  }
  return { button, ref, presses };
}

interface VariantClasses {
  readonly has: readonly string[];
  /** Classes of look-alike variants, so one variant rendering as another fails. */
  readonly lacks: readonly string[];
}

const VARIANT_CLASSES: Record<ButtonVariant, VariantClasses> = {
  primary: { has: ['bg-accent-solid', 'hover:bg-accent-solid-hover'], lacks: [] },
  secondary: { has: ['bg-surface-base', 'border-line-default'], lacks: ['aria-pressed:border-accent-solid'] },
  ghost: { has: ['text-fg-default', 'hover:bg-surface-sunken'], lacks: ['border', 'bg-surface-base', 'text-start'] },
  danger: { has: ['bg-danger-solid', 'hover:bg-danger-solid-hover'], lacks: [] },
  inline: { has: ['text-start', 'min-h-touch'], lacks: [] },
  toggle: { has: ['border-line-default', 'aria-pressed:border-accent-solid'], lacks: [] },
  segment: { has: ['w-full', 'aria-pressed:bg-accent-solid'], lacks: ['border'] },
};

describe(Button, () => {
  it('renders a native secondary <button type="button"> by default', async () => {
    const { button } = await render({});
    expect(button.getAttribute('type')).toBe('button');
    expect(button.textContent.trim()).toBe('Save');
    expect([...button.classList]).toStrictEqual(expect.arrayContaining(['bg-surface-base', 'border-line-default']));
  });

  it('renders a submit button when asked', async () => {
    const { button } = await render({ type: ButtonType.Submit });
    expect(button.getAttribute('type')).toBe('submit');
  });

  it.each(Object.values(ButtonVariant))('styles the %s variant', async (variant) => {
    const { button } = await render({ variant });
    const classes = [...button.classList];
    expect(classes).toStrictEqual(expect.arrayContaining([...VARIANT_CLASSES[variant].has]));
    for (const lacked of VARIANT_CLASSES[variant].lacks) {
      expect(classes).not.toContain(lacked);
    }
  });

  it.each([
    [Size.Sm, 'text-label', 'px-sm'],
    [Size.Md, 'text-body', 'px-md'],
    [Size.Lg, 'text-lead', 'px-lg'],
  ])('sizes the text and padding at %s', async (size, text, padding) => {
    const { button } = await render({ size });
    expect([...button.classList]).toStrictEqual(expect.arrayContaining([text, padding]));
  });

  it.each([Size.Sm, Size.Md])('keeps size %s at least 44px tall for touch', async (size) => {
    const { button } = await render({ size });
    expect([...button.classList]).toContain('h-touch');
  });

  it('sizes the inline variant by its content, whatever the size', async () => {
    const { button } = await render({ variant: ButtonVariant.Inline, size: Size.Lg });
    expect([...button.classList]).toContain('min-h-touch');
    expect([...button.classList]).not.toContain('h-control-lg');
    expect([...button.classList]).not.toContain('px-lg');
  });

  it('squares an icon-only button and drops its side padding', async () => {
    const { button } = await render({ iconOnly: true, ariaLabel: 'Close' });
    expect([...button.classList]).toContain('aspect-square');
    expect([...button.classList]).not.toContain('px-md');
    expect(button.getAttribute('aria-label')).toBe('Close');
  });

  it('leaves the optional ARIA and id attributes off by default', async () => {
    const { button } = await render({});
    for (const name of [
      'id',
      'aria-label',
      'aria-describedby',
      'aria-invalid',
      'aria-pressed',
      'aria-busy',
      'aria-disabled',
    ]) {
      expect(button.hasAttribute(name)).toBe(false);
    }
  });

  it('wires the id, description and invalid state for a field', async () => {
    const { button } = await render({ controlId: 'size', describedBy: 'size-hint', invalid: true });
    expect(button.id).toBe('size');
    expect(button.getAttribute('aria-describedby')).toBe('size-hint');
    expect(button.getAttribute('aria-invalid')).toBe('true');
  });

  it.each([
    [true, 'true'],
    [false, 'false'],
  ])('announces toggled=%s as aria-pressed', async (toggled, pressed) => {
    const { button } = await render({ variant: ButtonVariant.Toggle, toggled });
    expect(button.getAttribute('aria-pressed')).toBe(pressed);
  });

  it('emits the click when pressed', async () => {
    const { button, presses } = await render({});
    button.click();
    expect(presses).toHaveLength(1);
    expect(presses[0]).toBeInstanceOf(MouseEvent);
  });

  it('disables the native button, so it cannot be pressed', async () => {
    const { button, presses } = await render({ disabled: true });
    expect(button.disabled).toBe(true);
    button.click();
    expect(presses).toHaveLength(0);
  });

  it('stays focusable while busy but ignores presses and blocks the default action', async () => {
    const { button, presses } = await render({ busy: true, type: ButtonType.Submit });
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    button.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(presses).toHaveLength(0);
  });
});
