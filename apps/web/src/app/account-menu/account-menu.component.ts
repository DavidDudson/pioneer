import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncButton, Button, Stack, Text } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';

/** The shell's account slot: sign in, or who is signed in and sign out. Empty until the server answers. */
@Component({
  selector: 'pio-account-menu',
  imports: [AsyncButton, Button, Stack, Text, TranslocoPipe],
  templateUrl: './account-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMenu {
  protected readonly session = inject(SessionStore);
  protected readonly signOut = async (): Promise<void> => this.session.signOut();
}
