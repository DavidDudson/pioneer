import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { Size } from '../../tokens';
import { Spinner } from './spinner.component';

async function render(inputs: Readonly<Record<string, unknown>>): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(Spinner);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function iconClasses(host: HTMLElement): string[] {
  const svg = host.querySelector('svg');
  if (svg === null) {
    throw new Error('fr-spinner drew no icon');
  }
  return [...svg.classList];
}

describe(Spinner, () => {
  it('draws a small spinning icon by default', async () => {
    const host = await render({});
    expect(iconClasses(host)).toStrictEqual(expect.arrayContaining(['animate-spin', 'size-sm']));
  });

  it('draws the icon at the given size', async () => {
    const host = await render({ size: Size.Lg });
    expect(iconClasses(host)).toContain('size-lg');
  });

  it('is decorative without a label', async () => {
    const host = await render({});
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.hasAttribute('role')).toBe(false);
    expect(host.hasAttribute('aria-label')).toBe(false);
  });

  it('is announced as a status with a label', async () => {
    const host = await render({ label: 'Saving' });
    expect(host.getAttribute('role')).toBe('status');
    expect(host.getAttribute('aria-label')).toBe('Saving');
    expect(host.hasAttribute('aria-hidden')).toBe(false);
  });
});
