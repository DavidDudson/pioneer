import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import type { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import type { ComponentInputs } from '../../testing/component-inputs';
import { Size } from '../../tokens';
import { Button, ButtonType, ButtonVariant, RollLuck, RollTone } from './button.component';
import type { ButtonSize } from './button.component';

interface Rendered {
  readonly button: HTMLButtonElement;
  readonly ref: ComponentRef<Button>;
  readonly presses: Array<MouseEvent>;
}

/** Renders `fr-button` with "Save" projected and returns its native button and the presses it emits. */
async function render(inputs: ComponentInputs<Button>): Promise<Rendered> {
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

  const presses: Array<MouseEvent> = [];
  ref.instance.pressed.subscribe((event) => {
    presses.push(event);
  });
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(ref.hostView);
  await appRef.whenStable();
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  const button = (ref.location.nativeElement as HTMLElement).querySelector('button');

  if (button === null) {
    throw new Error('fr-button rendered no <button>');
  }

  return { button, ref, presses };
}

interface VariantClasses {
  readonly has: ReadonlyArray<string>;
  /** Classes of look-alike variants, so one variant rendering as another fails. */
  readonly lacks: ReadonlyArray<string>;
}

const VARIANT_CLASSES: Record<ButtonVariant, VariantClasses> = {
  primary: { has: ['bg-accent-solid', 'hover:bg-accent-solid-hover'], lacks: [] },
  secondary: { has: ['bg-surface-base', 'border-line-default'], lacks: ['aria-pressed:border-accent-solid'] },
  ghost: { has: ['text-fg-default', 'hover:bg-surface-sunken'], lacks: ['border', 'bg-surface-base', 'text-start'] },
  menu: {
    has: ['w-full', 'justify-start', 'text-start', 'aria-pressed:bg-accent-subtle'],
    lacks: ['border', 'justify-center'],
  },
  danger: {
    has: ['bg-danger-solid', 'text-danger-on-solid', 'hover:bg-danger-solid-hover', 'active:bg-danger-solid-active'],
    lacks: ['text-accent-on-solid'],
  },
  'outline-subtle': { has: ['border-accent-line', 'bg-accent-subtle', 'text-accent-fg'], lacks: ['bg-surface-base'] },
  roll: {
    has: ['border-line-default', 'bg-surface-sunken', 'text-fg-default'],
    lacks: ['text-roll-bonus-fg', 'bg-roll-fortune-bg', 'border-roll-degree-line'],
  },
  inline: { has: ['text-start', 'min-h-control-sm'], lacks: [] },
  field: { has: ['border', 'border-line-default', 'bg-surface-sunken', 'w-full'], lacks: ['bg-surface-base'] },
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

  it.each(Object.values(ButtonVariant))('sets the %s variant in the UI role', async (variant) => {
    const { button } = await render({ variant });
    expect([...button.classList]).toContain('font-ui');
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

  it.each<[ButtonSize, string]>([
    ['xs', 'min-h-control-xs'],
    [Size.Sm, 'min-h-control-sm'],
    [Size.Md, 'min-h-control-md'],
    [Size.Lg, 'min-h-control-lg'],
  ])('sizes %s from the control scale so a fine pointer shrinks it', async (size, minHeight) => {
    const { button } = await render({ size });
    expect([...button.classList]).toContain(minHeight);
    expect(button.className).not.toContain('pointer-fine:');
    expect(button.className).not.toContain('-touch');
  });

  it('gives an icon-only button a fixed height so it stays square', async () => {
    const { button } = await render({ size: Size.Md, iconOnly: true });
    expect([...button.classList]).toStrictEqual(expect.arrayContaining(['aspect-square', 'h-control-md']));
  });

  it('sizes the inline variant by its content, whatever the size', async () => {
    const { button } = await render({ variant: ButtonVariant.Inline, size: Size.Lg });
    expect([...button.classList]).toContain('min-h-control-sm');
    expect([...button.classList]).not.toContain('min-h-control-lg');
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

  describe('roll variant cues', () => {
    it('colours the text by the sign of what applies', async () => {
      const bonus = await render({ variant: ButtonVariant.Roll, rollTone: RollTone.Bonus });
      const penalty = await render({ variant: ButtonVariant.Roll, rollTone: RollTone.Penalty });

      expect([...bonus.button.classList]).toStrictEqual(expect.arrayContaining(['text-roll-bonus-fg']));
      expect([...bonus.button.classList]).not.toContain('text-fg-default');
      expect([...penalty.button.classList]).toStrictEqual(expect.arrayContaining(['text-roll-penalty-fg']));
    });

    it('fills the background for fortune and misfortune', async () => {
      const fortune = await render({ variant: ButtonVariant.Roll, rollLuck: RollLuck.Fortune });
      const misfortune = await render({ variant: ButtonVariant.Roll, rollLuck: RollLuck.Misfortune });

      expect([...fortune.button.classList]).toStrictEqual(expect.arrayContaining(['bg-roll-fortune-bg']));
      expect([...fortune.button.classList]).not.toContain('bg-surface-sunken');
      expect([...misfortune.button.classList]).toStrictEqual(expect.arrayContaining(['bg-roll-misfortune-bg']));
    });

    it('colours the border when the degree of success shifts', async () => {
      const { button } = await render({ variant: ButtonVariant.Roll, rollShifted: true });

      expect([...button.classList]).toStrictEqual(expect.arrayContaining(['border-roll-degree-line']));
      expect([...button.classList]).not.toContain('border-line-default');
    });

    it('ignores the cues on any other variant', async () => {
      const { button } = await render({ rollTone: RollTone.Bonus, rollLuck: RollLuck.Fortune, rollShifted: true });

      expect([...button.classList]).not.toContain('text-roll-bonus-fg');
      expect([...button.classList]).not.toContain('bg-roll-fortune-bg');
    });
  });
});
