import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SignInExtra } from '@pioneer/identity/data-access';
import type { ReturnPath } from '@pioneer/identity/domain';

/** A sign-in extra for tests: shows where it would return to, so a spec can see the page passed it on. */
@Component({
  selector: 'pio-stub-sign-in-extra',
  templateUrl: './stub-sign-in-extra.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StubSignInExtra implements SignInExtra {
  public readonly returnTo = input.required<ReturnPath>();
}
