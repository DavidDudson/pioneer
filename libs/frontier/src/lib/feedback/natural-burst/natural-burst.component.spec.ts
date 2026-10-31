import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { NaturalBurst, NaturalBurstKind } from './natural-burst.component';

/** Renders `fr-natural-burst` of `kind` and returns its host. */
async function render(kind: NaturalBurstKind): Promise<HTMLElement> {
  const burst = createComponent(NaturalBurst, { environmentInjector: TestBed.inject(EnvironmentInjector) });
  onTestFinished(() => {
    burst.destroy();
  });
  burst.setInput('kind', kind);
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(burst.hostView);
  await appRef.whenStable();
  return burst.location.nativeElement as HTMLElement;
}

describe(NaturalBurst, () => {
  it('is hidden from screen readers and takes no click', async () => {
    const host = await render(NaturalBurstKind.High);
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect([...host.classList]).toContain('pointer-events-none');
  });

  it('is gold for a natural 20, and only flashes', async () => {
    const host = await render(NaturalBurstKind.High);
    expect([...host.classList]).toStrictEqual(expect.arrayContaining(['bg-natural-max', 'animate-natural-flash']));
  });

  it('is red for a natural 1, and shakes as well', async () => {
    const host = await render(NaturalBurstKind.Low);
    expect([...host.classList]).toStrictEqual(
      expect.arrayContaining(['bg-natural-min', 'animate-natural-flash-shake']),
    );
  });
});
