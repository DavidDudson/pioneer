import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CampaignRole } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignMemberId, NamedMember } from '@pioneer/campaign/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Avatar,
  Badge,
  DateDisplay,
  Heading,
  List,
  ListItem,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';

import { CampaignStore } from '../../data/campaign-store';

/** Message key for each role's badge. */
const ROLE_LABEL = {
  [CampaignRole.Gm]: 'campaign.roster.gm',
  [CampaignRole.Player]: 'campaign.roster.player',
} as const satisfies Record<CampaignRole, string>;

/** Skeleton rows shown while the members load. */
const PLACEHOLDERS = ['first', 'second'] as const;

/** The two changes the GM makes to a player's membership. */
interface MemberActions {
  readonly remove: () => Promise<void>;
  readonly transfer: () => Promise<void>;
}

/**
 * The open campaign's members, oldest first, with their role and when they joined. The GM removes
 * players and hands the GM role over; a player leaves. None of these can be undone by the one who
 * makes it, so each button asks first: a second press on the same button confirms (frontier rule 4).
 */
@Component({
  selector: 'pio-campaign-member-list',
  imports: [
    AsyncButton,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Avatar,
    Badge,
    DateDisplay,
    Heading,
    List,
    ListItem,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './campaign-member-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignMemberList {
  protected readonly store = inject(CampaignStore);
  readonly #router = inject(Router);
  readonly #i18n = inject(TranslocoService);
  /** One pair of actions per member, so each button keeps the same action across renders. */
  readonly #actions = new Map<CampaignMemberId, MemberActions>();

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly roleLabel = ROLE_LABEL;
  protected readonly role = CampaignRole;
  /**
   * Players removed since the roster loaded. Their rows stay, marked, until it next loads, so the
   * focused Remove button and its tick survive; removing again is harmless.
   */
  protected readonly removed = signal<ReadonlySet<CampaignMemberId>>(new Set());

  protected readonly describeRemoveError = (): string => this.#i18n.translate('campaign.members.removeFailed');
  protected readonly describeTransferError = (): string => this.#i18n.translate('campaign.members.transferFailed');
  protected readonly describeLeaveError = (): string => this.#i18n.translate('campaign.members.leaveFailed');

  protected readonly leave = async (): Promise<void> => {
    await this.store.leave(this.#campaignId());
    // Nothing here is the user's to see any more.
    await this.#router.navigate(['/campaigns']);
  };

  protected actionsFor(member: NamedMember): MemberActions {
    const existing = this.#actions.get(member.id);
    if (existing !== undefined) {
      return existing;
    }
    const actions: MemberActions = {
      remove: async (): Promise<void> => {
        await this.store.removeMember(this.#campaignId(), member.id);
        this.removed.update((removed) => new Set([...removed, member.id]));
      },
      transfer: async (): Promise<void> => this.store.transferGm(this.#campaignId(), member.id),
    };
    this.#actions.set(member.id, actions);
    return actions;
  }

  #campaignId(): CampaignId {
    const campaign = this.store.selected.data();
    if (campaign === undefined) {
      throw new Error('No campaign loaded');
    }
    return campaign.id;
  }
}
