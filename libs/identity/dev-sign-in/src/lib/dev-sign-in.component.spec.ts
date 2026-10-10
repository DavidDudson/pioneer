import { TestBed } from '@angular/core/testing';
import { frontierMessages } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';
import { DEV_USERS, DevSignInPath, DevUser } from '@pioneer/identity/dev-users';
import { ReturnPath } from '@pioneer/identity/domain';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import devSignInMessages from '../i18n/en.json';
import { DevSignIn } from './dev-sign-in.component';

interface Rendered {
  readonly root: HTMLElement;
  readonly signInAt: Mock<(path: string, returnTo: ReturnPath) => void>;
}

async function render(returnTo: string): Promise<Rendered> {
  const signInAt = vi.fn<(path: string, returnTo: ReturnPath) => void>();
  TestBed.configureTestingModule({
    providers: [
      provideI18n({ en: async () => ({ ...frontierMessages, ...devSignInMessages }) }),
      { provide: SessionStore, useValue: { signInAt } },
    ],
  });
  const fixture = TestBed.createComponent(DevSignIn);
  fixture.componentRef.setInput('returnTo', ReturnPath.parse(returnTo));
  await fixture.whenStable();
  return { root: fixture.nativeElement as HTMLElement, signInAt };
}

function buttons(root: HTMLElement): HTMLButtonElement[] {
  return [...root.querySelectorAll('button')];
}

describe(DevSignIn, () => {
  it('lists every dev user, GM first', async () => {
    const { root } = await render('/');
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Dev users');
    });
    expect(buttons(root).map((button) => button.textContent.trim())).toStrictEqual(
      DEV_USERS.map(({ displayName }) => displayName),
    );
  });

  it('signs in as the chosen user and returns to the page asked for', async () => {
    const { root, signInAt } = await render('/campaigns');
    buttons(root)[1]?.click();
    expect(signInAt).toHaveBeenCalledWith(DevSignInPath.of(DevUser.PlayerOne.id), ReturnPath.parse('/campaigns'));
  });
});
