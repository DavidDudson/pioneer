import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import type { ComponentInputs } from '../../testing/component-inputs';
import { Divider, DividerTone } from './divider.component';

/** Renders a divider and returns the element that draws the rule. */
async function render(inputs: ComponentInputs<Divider>): Promise<HTMLElement> {
  const divider = createComponent(Divider, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
  });

  onTestFinished(() => {
    divider.destroy();
  });

  for (const [name, value] of Object.entries(inputs)) {
    divider.setInput(name, value);
  }

  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(divider.hostView);
  await appRef.whenStable();
  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  const rule = (divider.location.nativeElement as HTMLElement).firstElementChild;

  if (!(rule instanceof HTMLElement)) {
    throw new TypeError('fr-divider rendered no rule');
  }

  return rule;
}

describe(Divider, () => {
  it('draws a horizontal <hr> separator in line-subtle by default', async () => {
    const rule = await render({});
    expect(rule.tagName).toBe('HR');
    expect([...rule.classList]).toStrictEqual(expect.arrayContaining(['border-t', 'border-line-subtle']));
    expect(rule.hasAttribute('aria-hidden')).toBe(false);
  });

  it.each(Object.values(DividerTone))('draws a rule in line-%s', async (tone) => {
    const rule = await render({ tone });
    expect([...rule.classList]).toContain(`border-line-${tone}`);
  });
});
