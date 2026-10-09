import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncButton, Button, Link, Stack } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';
import { ACCOUNT_PATH, SETTINGS_PATH } from '@pioneer/identity/domain';

/**
 * The shell's account slot: sign in, or who is signed in (linking to their account), their
 * settings and sign out. Empty until the server answers.
 */
@Component({
  selector: 'pio-account-menu',
  imports: [AsyncButton, Button, Link, Stack, TranslocoPipe],
  templateUrl: './account-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMenu {
  protected readonly session = inject(SessionStore);
  protected readonly accountPath = ACCOUNT_PATH;
  protected readonly settingsPath = SETTINGS_PATH;
  protected readonly signOut = async (): Promise<void> => this.session.signOut();
}
