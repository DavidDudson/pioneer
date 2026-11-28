import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import type { ComponentInputs } from '../../testing/component-inputs';
import { Inset, Space } from '../../tokens';
import { Surface } from './surface.component';

/** Renders `fr-surface` with "Hit points" projected and returns its host element. */
async function render(inputs: ComponentInputs<Surface>): Promise<HTMLElement> {
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

  // SAFETY: a rendered component's host element is always an HTMLElement under the DOM test environment; nativeElement is typed any.
  return surface.location.nativeElement as HTMLElement;
}

describe(Surface, () => {
  it('is a raised panel padded by the panel inset by default and projects its content', async () => {
    const host = await render({});
    expect([...host.classList]).toStrictEqual(
      expect.arrayContaining(['bg-elevation-raised', 'border', 'border-elevation-raised-line', 'p-inset-panel']),
    );
    expect(host.textContent).toBe('Hit points');
  });

  it('pads from one token only', async () => {
    const host = await render({ padding: Space.None });
    expect([...host.classList]).toContain('p-none');
    expect([...host.classList]).not.toContain('p-inset-panel');
  });

  it('takes an inset by role', async () => {
    const host = await render({ padding: Inset.Page });
    expect([...host.classList]).toContain('p-inset-page');
  });
});
