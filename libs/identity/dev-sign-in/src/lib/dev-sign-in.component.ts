import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, Stack, Surface, Text } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';
import type { SignInExtra } from '@pioneer/identity/data-access';
import { DEV_USERS, DevSignInPath } from '@pioneer/identity/dev-users';
import type { DevUser } from '@pioneer/identity/dev-users';
import type { ReturnPath } from '@pioneer/identity/domain';

/**
 * One-click sign-in as each seeded dev user, shown on the sign-in page in development builds only. Like a
 * provider, it is a full page navigation: the API sets the session cookie and redirects to `returnTo`.
 */
@Component({
  selector: 'pio-dev-sign-in',
  imports: [Button, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './dev-sign-in.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevSignIn implements SignInExtra {
  public readonly returnTo = input.required<ReturnPath>();

  readonly #session = inject(SessionStore);
  protected readonly users = DEV_USERS;

  protected signIn(user: DevUser): void {
    this.#session.signInAt(DevSignInPath.of(user.id), this.returnTo());
  }
}
