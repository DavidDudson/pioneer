import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Check } from 'lucide';
import { describe, expect, it } from 'vitest';

import { Size } from '../tokens';
import { Icon } from './icon.component';

async function render(inputs: Record<string, unknown>): Promise<SVGElement> {
  const fixture = TestBed.createComponent(Icon);
  fixture.componentRef.setInput('icon', Check);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture.debugElement.query(By.css('svg')).nativeElement as SVGElement;
}

describe(Icon, () => {
  it.each(Object.values(Size))('draws 1px non-scaling lines at size %s', async (size) => {
    const svg = await render({ size });
    expect(svg.getAttribute('stroke-width')).toBe('1');
    const effects = [...svg.querySelectorAll('path, line, polyline, circle, rect')].map((shape) =>
      shape.getAttribute('vector-effect'),
    );
    expect(effects.length).toBeGreaterThan(0);
    expect(new Set(effects)).toStrictEqual(new Set(['non-scaling-stroke']));
  });

  it('draws the shapes of a Lucide icon', async () => {
    const svg = await render({});
    expect(svg.querySelector('path')?.getAttribute('d')).toBe('M20 6 9 17l-5-5');
  });

  it('is decorative without a label', async () => {
    const svg = await render({});
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('is announced with a label', async () => {
    const svg = await render({ label: 'Saved' });
    expect(svg.getAttribute('aria-hidden')).not.toBe('true');
    expect(svg.querySelector('title')?.textContent).toBe('Saved');
  });
});
