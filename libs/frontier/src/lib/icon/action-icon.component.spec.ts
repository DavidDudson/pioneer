import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ActionIcon, ActionIconCost } from './action-icon.component';

async function render(inputs: Record<string, unknown>): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(ActionIcon);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function drawn(host: HTMLElement): readonly string[] {
  return [...host.querySelectorAll('svg')].map((svg) => svg.querySelector('path')?.getAttribute('fill') ?? '');
}

describe(ActionIcon, () => {
  it.each([
    [ActionIconCost.One, 1],
    [ActionIconCost.Two, 2],
    [ActionIconCost.Three, 3],
  ])('draws %s as %i solid diamonds', async (cost, count) => {
    const host = await render({ cost, label: 'Actions' });
    expect(drawn(host)).toStrictEqual(Array.from({ length: count }, () => 'currentColor'));
  });

  it('draws a free action as one open diamond and a reaction as an arrow', async () => {
    const free = await render({ cost: ActionIconCost.Free, label: 'Free action' });
    const reaction = await render({ cost: ActionIconCost.Reaction, label: 'Reaction' });
    expect(drawn(free)).toStrictEqual(['']);
    expect(reaction.querySelectorAll('svg')).toHaveLength(1);
    expect(reaction.querySelectorAll('svg path')).toHaveLength(2);
  });

  it('draws a range as the cost, a rule and the cost it runs to', async () => {
    const host = await render({ cost: ActionIconCost.One, upTo: ActionIconCost.Three, label: 'One to three actions' });
    expect(drawn(host)).toStrictEqual(['currentColor', '', 'currentColor', 'currentColor', 'currentColor']);
  });

  it('hides the drawing and reads out its label', async () => {
    const host = await render({ cost: ActionIconCost.Two, label: 'Two actions' });
    expect(host.querySelector('[aria-hidden="true"]')?.querySelectorAll('svg')).toHaveLength(2);
    expect(host.querySelector('.sr-only')?.textContent).toBe('Two actions');
  });
});
