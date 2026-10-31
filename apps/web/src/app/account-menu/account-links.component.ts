import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideBug, LucideClipboardList, LucideLogOut, LucideSettings } from '@lucide/angular';
import { AsyncButton, Icon, Link, Stack } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';
import { SETTINGS_PATH } from '@pioneer/identity/domain';
import { BUG_REPORT_PATH, BUG_REPORTS_PATH } from '@pioneer/shared/kernel';

/** The signed-in viewer's account actions in the account menu: settings, bug reports and sign out. */
@Component({
  selector: 'pio-account-links',
  imports: [AsyncButton, Icon, Link, Stack, TranslocoPipe],
  templateUrl: './account-links.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountLinks {
  protected readonly session = inject(SessionStore);
  protected readonly settingsIcon = LucideSettings;
  protected readonly reportBugIcon = LucideBug;
  protected readonly bugReportsIcon = LucideClipboardList;
  protected readonly signOutIcon = LucideLogOut;
  protected readonly settingsPath = SETTINGS_PATH;
  protected readonly reportBugPath = BUG_REPORT_PATH;
  protected readonly bugReportsPath = BUG_REPORTS_PATH;
  protected readonly signOut = async (): Promise<void> => this.session.signOut();
}
