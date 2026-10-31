import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import type { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { ScreenOverlay } from './screen-overlay.component';

async function render(): Promise<ComponentRef<ScreenOverlay>> {
  const overlay = createComponent(ScreenOverlay, { environmentInjector: TestBed.inject(EnvironmentInjector) });
  onTestFinished(() => {
    overlay.destroy();
  });
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(overlay.hostView);
  await appRef.whenStable();
  return overlay;
}

describe(ScreenOverlay, () => {
  it('covers the viewport, takes no clicks and is hidden from assistive technology', async () => {
    const overlay = await render();
    const host = overlay.location.nativeElement as HTMLElement;
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect([...host.classList]).toStrictEqual(expect.arrayContaining(['fixed', 'inset-none', 'pointer-events-none']));
  });

  it('exposes the element the dice are drawn into', async () => {
    const overlay = await render();
    const surface = overlay.instance.surface().nativeElement;
    expect(surface.parentElement).toBe(overlay.location.nativeElement);
  });
});
