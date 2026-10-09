import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, Page, Stack, Text } from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';
import { HOME_PATH } from '@pioneer/identity/domain';

/** Where a failed or cancelled sign-in lands: say so, and offer to try again. */
@Component({
  selector: 'pio-sign-in-failed-page',
  imports: [Button, Page, Stack, Text, TranslocoPipe],
  templateUrl: './sign-in-failed-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInFailedPage {
  protected readonly session = inject(SessionStore);
  /** Retrying from here returns home, not to this page. */
  protected readonly home = HOME_PATH;
}
