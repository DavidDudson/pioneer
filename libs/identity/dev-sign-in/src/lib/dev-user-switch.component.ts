import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Avatar, Box, Button, Dropdown, Stack } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';
import { DEV_USERS, DevSignInPath } from '@pioneer/identity/dev-users';
import type { DevUser } from '@pioneer/identity/dev-users';
import { returnPathOr } from '@pioneer/identity/domain';

/**
 * Switches to another seeded dev user from the account menu, staying on the current page. Like the sign-in page's
 * one-click sign-in it is a full navigation: the API sets the session cookie and redirects back.
 */
@Component({
  selector: 'pio-dev-user-switch',
  imports: [Avatar, Box, Button, Dropdown, Stack, TranslocoPipe],
  templateUrl: './dev-user-switch.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevUserSwitch {
  readonly #session = inject(SessionStore);
  readonly #router = inject(Router);
  protected readonly users = DEV_USERS;
  protected readonly current = this.#session.user;

  protected switchTo(user: DevUser): void {
    this.#session.signInAt(DevSignInPath.of(user.id), returnPathOr(this.#router.url));
  }
}
