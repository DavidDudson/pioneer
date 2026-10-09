import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncButton, DateDisplay, Stack, Text } from '@pioneer/frontier';
import type { SessionSummary } from '@pioneer/identity/domain';

import { SessionList } from '../../data/session-list';

/** One signed-in browser: when it signed in, when it was last used, and a way to end it. */
@Component({
  selector: 'pio-session-row',
  imports: [AsyncButton, DateDisplay, Stack, Text, TranslocoPipe],
  templateUrl: './session-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionRow {
  public readonly session = input.required<SessionSummary>();

  readonly #sessions = inject(SessionList);
  protected readonly revoke = async (): Promise<void> => this.#sessions.revoke(this.session());
}
