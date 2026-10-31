import { ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, onTestFinished } from 'vitest';

import { Toast } from './toast.component';

/** Renders `fr-toast` with "16" projected and returns its host. */
async function render(open: boolean): Promise<HTMLElement> {
  const toast = createComponent(Toast, {
    environmentInjector: TestBed.inject(EnvironmentInjector),
    projectableNodes: [[document.createTextNode('16')]],
  });
  onTestFinished(() => {
    toast.destroy();
  });
  toast.setInput('open', open);
  const appRef = TestBed.inject(ApplicationRef);
  appRef.attachView(toast.hostView);
  await appRef.whenStable();
  return toast.location.nativeElement as HTMLElement;
}

describe(Toast, () => {
  it('is a polite status region, pinned to the bottom centre and click-through around the pill', async () => {
    const host = await render(true);
    expect([...host.classList]).toStrictEqual(
      expect.arrayContaining(['fixed', 'bottom-lg', 'justify-center', 'pointer-events-none']),
    );
    expect(host.querySelector('[role="status"]')).not.toBeNull();
  });

  it('shows the projected content in a pill while open', async () => {
    const host = await render(true);
    const pill = host.querySelector('[role="status"] > div');
    expect(pill?.textContent.trim()).toBe('16');
    expect(pill?.classList.contains('rounded-pill')).toBe(true);
  });

  it('keeps an empty status region while closed, with no pill', async () => {
    const host = await render(false);
    const status = host.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.textContent.trim()).toBe('');
  });
});
