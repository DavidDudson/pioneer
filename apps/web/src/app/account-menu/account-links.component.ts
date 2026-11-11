import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncButton, Icon, Link, Stack } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';
import { SETTINGS_PATH } from '@pioneer/identity/domain';
import { BUG_REPORT_PATH, BUG_REPORTS_PATH } from '@pioneer/shared/kernel';
import { Bug, ClipboardList, LogOut, Settings } from 'lucide';

/** The signed-in viewer's account actions in the account menu: settings, bug reports and sign out. */
@Component({
  selector: 'pio-account-links',
  imports: [AsyncButton, Icon, Link, Stack, TranslocoPipe],
  templateUrl: './account-links.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountLinks {
  protected readonly session = inject(SessionStore);
  protected readonly settingsIcon = Settings;
  protected readonly reportBugIcon = Bug;
  protected readonly bugReportsIcon = ClipboardList;
  protected readonly signOutIcon = LogOut;
  protected readonly settingsPath = SETTINGS_PATH;
  protected readonly reportBugPath = BUG_REPORT_PATH;
  protected readonly bugReportsPath = BUG_REPORTS_PATH;
  protected readonly signOut = async (): Promise<void> => this.session.signOut();
}
