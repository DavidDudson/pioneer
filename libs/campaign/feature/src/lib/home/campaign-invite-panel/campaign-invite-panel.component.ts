import { ChangeDetectionStrategy, Component, DOCUMENT, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideLink } from '@lucide/angular';
import type { CampaignId, InviteSummary, InviteToken } from '@pioneer/campaign/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncPending,
  AsyncRegion,
  DateDisplay,
  EmptyState,
  Heading,
  List,
  ListItem,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';

import { CampaignStore } from '../../data/campaign-store';

/**
 * The GM's invite links: make one (its link is shown once, to copy), and see and revoke the ones
 * that still work. Revoking acts on the first press: the GM can always make another link.
 */
@Component({
  selector: 'pio-campaign-invite-panel',
  imports: [
    AsyncButton,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    DateDisplay,
    EmptyState,
    Heading,
    List,
    ListItem,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './campaign-invite-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignInvitePanel {
  public readonly campaignId = input.required<CampaignId>();

  protected readonly store = inject(CampaignStore);
  readonly #router = inject(Router);
  readonly #document = inject(DOCUMENT);
  readonly #i18n = inject(TranslocoService);
  /** One revoke action per invite, so each button keeps the same action across renders. */
  readonly #revokes = new Map<string, () => Promise<void>>();

  protected readonly emptyIcon = LucideLink;
  /** The link made last; its token can't be fetched again, so it lives only here. */
  protected readonly newLink = signal<string | undefined>(undefined);

  protected readonly create = async (): Promise<void> => {
    const { token } = await this.store.createInvite(this.campaignId());
    this.newLink.set(this.#linkFor(token));
  };

  protected readonly copy = async (): Promise<void> => {
    const link = this.newLink();
    const clipboard = this.#document.defaultView?.navigator.clipboard;
    if (link === undefined || clipboard === undefined) {
      throw new Error('Nothing to copy, or no clipboard');
    }
    await clipboard.writeText(link);
  };

  protected readonly describeCreateError = (): string => this.#i18n.translate('campaign.invites.createFailed');
  protected readonly describeCopyError = (): string => this.#i18n.translate('campaign.invites.copyFailed');
  protected readonly describeRevokeError = (): string => this.#i18n.translate('campaign.invites.revokeFailed');

  protected revoke(invite: InviteSummary): () => Promise<void> {
    const existing = this.#revokes.get(invite.id);
    if (existing !== undefined) {
      return existing;
    }
    const action = async (): Promise<void> => this.store.revokeInvite(this.campaignId(), invite.id);
    this.#revokes.set(invite.id, action);
    return action;
  }

  /** The absolute join URL for a token, on this app's origin. */
  #linkFor(token: InviteToken): string {
    const path = this.#router.serializeUrl(this.#router.createUrlTree(['/campaigns', 'join', token]));
    return `${this.#document.location.origin}${path}`;
  }
}
