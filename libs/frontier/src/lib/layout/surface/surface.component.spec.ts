import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Space } from '../../tokens';
import { Surface, SurfaceVariant } from './surface.component';

/** Renders `fr-surface` with "Hit points" projected and returns its host element. */
async function render(inputs: Readonly<Record<string, unknown>>): Promise<HTMLElement> {
  const surface = createComponent(Surface, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[document.createTextNode('Hit points')]],
  });
  onTestFinished(() => {
    surface.destroy();
  });
  for (const [name, value] of Object.entries(inputs)) {
    surface.setInput(name, value);
  }
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(surface.hostView);
  await appRef.whenStable();
  return surface.location.nativeElement as HTMLElement;
}

describe(Surface, () => {
  it('is a raised, large-padded panel by default and projects its content', async () => {
    const host = await render({});
    expect([...host.classList]).toStrictEqual(
      expect.arrayContaining(['bg-surface-raised', 'border', 'border-line-default', 'p-lg']),
    );
    expect(host.textContent).toBe('Hit points');
  });

  it.each([
    [SurfaceVariant.Base, ['bg-surface-base'], ['border']],
    [SurfaceVariant.Raised, ['bg-surface-raised', 'border'], []],
    [SurfaceVariant.Sunken, ['bg-surface-sunken'], ['border']],
    [
      SurfaceVariant.Outline,
      ['border', 'border-line-default'],
      ['bg-surface-raised', 'bg-surface-base', 'bg-surface-sunken'],
    ],
  ])('styles the %s variant without a look-alike class', async (variant, present, absent) => {
    const host = await render({ variant });
    expect([...host.classList]).toStrictEqual(expect.arrayContaining(present));
    for (const name of absent) {
      expect([...host.classList]).not.toContain(name);
    }
  });

  it('pads from the space token', async () => {
    const host = await render({ padding: Space.None });
    expect([...host.classList]).toContain('p-none');
    expect([...host.classList]).not.toContain('p-lg');
  });
});
