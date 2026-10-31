import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncButton, Link, Stack } from '@pioneer/frontier';
import { ACCOUNT_MENU_EXTRAS, SessionStore } from '@pioneer/identity/data-access';
import { SETTINGS_PATH } from '@pioneer/identity/domain';
import { BUG_REPORT_PATH, BUG_REPORTS_PATH } from '@pioneer/shared/kernel';

/** The signed-in viewer's account actions in the account menu: settings, bug reports, dev extras and sign out. */
@Component({
  selector: 'pio-account-links',
  imports: [AsyncButton, Link, NgComponentOutlet, Stack, TranslocoPipe],
  templateUrl: './account-links.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountLinks {
  protected readonly session = inject(SessionStore);
  protected readonly extras = inject(ACCOUNT_MENU_EXTRAS);
  protected readonly settingsPath = SETTINGS_PATH;
  protected readonly reportBugPath = BUG_REPORT_PATH;
  protected readonly bugReportsPath = BUG_REPORTS_PATH;
  protected readonly signOut = async (): Promise<void> => this.session.signOut();
}
