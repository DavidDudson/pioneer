import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Link, Page, Stack, Text } from '@pioneer/frontier';
import { SIGN_IN_PATH } from '@pioneer/identity/domain';

/** Where a failed or cancelled sign-in lands: say so, and offer to try again. */
@Component({
  selector: 'pio-sign-in-failed-page',
  imports: [Link, Page, Stack, Text, TranslocoPipe],
  templateUrl: './sign-in-failed-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInFailedPage {
  protected readonly signInPath = SIGN_IN_PATH;
}
