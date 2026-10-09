import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Divider, DividerOrientation, DividerTone } from './divider.component';

/** Renders a divider and returns the element that draws the rule. */
async function render(inputs: Readonly<Record<string, unknown>>): Promise<HTMLElement> {
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
  const rule = (divider.location.nativeElement as HTMLElement).firstElementChild;
  if (!(rule instanceof HTMLElement)) {
    throw new Error('fr-divider rendered no rule');
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

  it('draws a vertical rule that stretches to its row and is hidden from assistive technology', async () => {
    const rule = await render({ orientation: DividerOrientation.Vertical });
    expect(rule.tagName).toBe('SPAN');
    expect([...rule.classList]).toStrictEqual(expect.arrayContaining(['border-s', 'self-stretch']));
    expect([...rule.classList]).not.toContain('border-t');
    expect(rule.getAttribute('aria-hidden')).toBe('true');
  });

  it.each(
    Object.values(DividerOrientation).flatMap((orientation) =>
      Object.values(DividerTone).map((tone) => [orientation, tone] as const),
    ),
  )('draws a %s rule in line-%s', async (orientation, tone) => {
    const rule = await render({ orientation, tone });
    expect([...rule.classList]).toContain(`border-line-${tone}`);
  });
});
