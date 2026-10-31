import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { frontierMessages } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';
import { DevSignInPath, DevUser } from '@pioneer/identity/dev-users';
import { ReturnPath } from '@pioneer/identity/domain';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import devSignInMessages from '../i18n/en.json';
import { DevUserSwitch } from './dev-user-switch.component';

interface Rendered {
  readonly root: HTMLElement;
  readonly signInAt: Mock<(path: string, returnTo: ReturnPath) => void>;
}

async function render(): Promise<Rendered> {
  const signInAt = vi.fn<(path: string, returnTo: ReturnPath) => void>();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      provideI18n({ en: async () => ({ ...frontierMessages, ...devSignInMessages }) }),
      { provide: SessionStore, useValue: { signInAt, user: signal(DevUser.PlayerOne) } },
    ],
  });
  await TestBed.inject(Router).navigateByUrl('/characters/abc?tab=feats');
  const fixture = TestBed.createComponent(DevUserSwitch);
  await fixture.whenStable();
  return { root: fixture.nativeElement as HTMLElement, signInAt };
}

describe(DevUserSwitch, () => {
  it('lists every dev user and marks the signed-in one', async () => {
    const { root } = await render();
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Switch dev user');
    });
    const buttons = [...root.querySelectorAll('button')];
    expect(buttons.map((button) => button.textContent.trim())).toStrictEqual([
      'Dev GM',
      'Dev Player One',
      'Dev Player Two',
    ]);
    expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toStrictEqual(['false', 'true', 'false']);
  });

  it('switches to the user and returns to the current page', async () => {
    const { root, signInAt } = await render();
    await vi.waitFor(() => {
      expect(root.querySelectorAll('button')).toHaveLength(3);
    });
    root.querySelectorAll('button')[2]?.click();
    expect(signInAt).toHaveBeenCalledWith(
      DevSignInPath.of(DevUser.PlayerTwo.id),
      ReturnPath.parse('/characters/abc?tab=feats'),
    );
  });
});
