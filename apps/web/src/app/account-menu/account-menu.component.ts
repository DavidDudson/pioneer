import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideUser } from '@lucide/angular';
import { Avatar, Button, Divider, Dropdown, Link, Stack, Text } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';
import { ACCOUNT_PATH } from '@pioneer/identity/domain';
import { BUG_REPORT_PATH } from '@pioneer/shared/kernel';

import { DarkModeToggle } from '../dark-mode-toggle/dark-mode-toggle.component';
import { ThemeMenu } from '../theme-menu/theme-menu.component';
import { AccountLinks } from './account-links.component';

/**
 * The shell's account slot: an avatar dropdown with the viewer's account actions, the theme and colour mode, and in
 * development builds the dev-user switch. Signed out, the trigger is a plain user icon and the menu offers sign in.
 * Empty until the server answers.
 */
@Component({
  selector: 'pio-account-menu',
  imports: [
    AccountLinks,
    Avatar,
    Button,
    DarkModeToggle,
    Divider,
    Dropdown,
    Link,
    Stack,
    Text,
    ThemeMenu,
    TranslocoPipe,
  ],
  templateUrl: './account-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountMenu {
  protected readonly session = inject(SessionStore);
  protected readonly accountPath = ACCOUNT_PATH;
  protected readonly reportBugPath = BUG_REPORT_PATH;
  protected readonly signedOutIcon = LucideUser;
  protected readonly signedIn = computed(() => this.session.user() !== undefined);
}
