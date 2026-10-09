import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AsyncButton,
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Button,
  Heading,
  List,
  ListItem,
  Page,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';
import { SessionStore } from '@pioneer/identity/data-access';

import { SessionList } from '../data/session-list';
import { SessionRow } from './session-row/session-row.component';

/** Skeleton rows shown while the session list loads. */
const PLACEHOLDERS = ['first', 'second'] as const;

/**
 * The signed-in user's account: every browser signed in to it, each revocable, and signing out
 * everywhere behind an inline second click. Signed out, it offers sign-in instead.
 */
@Component({
  selector: 'pio-account-page',
  imports: [
    AsyncButton,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Button,
    Heading,
    List,
    ListItem,
    Page,
    SessionRow,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './account-page.component.html',
  providers: [SessionList],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage {
  protected readonly session = inject(SessionStore);
  protected readonly sessions = inject(SessionList);
  protected readonly placeholders = PLACEHOLDERS;

  /** True after the first click on "sign out everywhere", until confirmed or cancelled. */
  protected readonly confirmingEverywhere = signal(false);
  protected readonly signOutEverywhere = async (): Promise<void> => this.sessions.signOutEverywhere();
}
