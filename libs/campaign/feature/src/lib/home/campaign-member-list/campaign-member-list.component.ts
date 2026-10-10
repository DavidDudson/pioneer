import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CampaignRole } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignMemberId, NamedMember } from '@pioneer/campaign/domain';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Avatar,
  Badge,
  Button,
  DateDisplay,
  Heading,
  List,
  ListItem,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';
import type { ValueOf } from '@pioneer/shared/kernel';

import { CampaignStore } from '../../data/campaign-store';
import { CampaignMemberConfirm } from '../campaign-member-confirm/campaign-member-confirm.component';
import type { MemberChangeText } from '../campaign-member-confirm/campaign-member-confirm.component';

/** Message key for each role's badge. */
const ROLE_LABEL = {
  [CampaignRole.Gm]: 'campaign.roster.gm',
  [CampaignRole.Player]: 'campaign.roster.player',
} as const satisfies Record<CampaignRole, string>;

/** Skeleton rows shown while the members load. */
const PLACEHOLDERS = ['first', 'second'] as const;

/** A membership change that asks before it acts: none of them can be undone by the one who makes it. */
const MemberChange = { Remove: 'remove', Transfer: 'transfer', Leave: 'leave' } as const;
type MemberChange = ValueOf<typeof MemberChange>;

/** The keys for each change's question, button and states. */
const CHANGE_TEXT = {
  [MemberChange.Remove]: {
    confirm: 'campaign.members.removeConfirm',
    action: 'campaign.members.remove',
    pending: 'campaign.members.removing',
    success: 'campaign.members.removed',
    failed: 'campaign.members.removeFailed',
  },
  [MemberChange.Transfer]: {
    confirm: 'campaign.members.transferConfirm',
    action: 'campaign.members.transfer',
    pending: 'campaign.members.transferring',
    success: 'campaign.members.transferred',
    failed: 'campaign.members.transferFailed',
  },
  [MemberChange.Leave]: {
    confirm: 'campaign.members.leaveConfirm',
    action: 'campaign.members.leave',
    pending: 'campaign.members.leaving',
    success: 'campaign.members.left',
    failed: 'campaign.members.leaveFailed',
  },
} as const satisfies Record<MemberChange, MemberChangeText & { readonly failed: string }>;

/** The change the user is being asked about, and whose membership it is (none when leaving). */
interface Confirming {
  readonly change: MemberChange;
  readonly member?: CampaignMemberId;
  readonly name: string;
}

/**
 * The open campaign's members, oldest first, with their role and when they joined. The GM removes
 * players and hands the GM role over; a player leaves. Each asks inline first, below the list,
 * and the question stays once it is done so focus stays on its button.
 */
@Component({
  selector: 'pio-campaign-member-list',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Avatar,
    Badge,
    Button,
    CampaignMemberConfirm,
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

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly roleLabel = ROLE_LABEL;
  protected readonly role = CampaignRole;
  protected readonly change = MemberChange;
  protected readonly changeText = CHANGE_TEXT;

  /** The change awaiting a second press, if any. */
  protected readonly confirming = signal<Confirming | undefined>(undefined);
  /** True once the confirmed change is done; its question stays, without Cancel. */
  protected readonly settled = signal(false);
  /** Players removed since the roster loaded; their rows stay, marked, until it next loads. */
  protected readonly removed = signal<ReadonlySet<CampaignMemberId>>(new Set());

  protected readonly confirmAction = computed((): (() => Promise<void>) => {
    const confirming = this.confirming();
    return async (): Promise<void> => {
      if (confirming !== undefined) {
        await this.#run(confirming);
      }
    };
  });

  protected readonly describeError = (): string => {
    const confirming = this.confirming();
    return confirming === undefined ? '' : this.#i18n.translate(CHANGE_TEXT[confirming.change].failed);
  };

  protected ask(change: MemberChange, member?: NamedMember): void {
    this.settled.set(false);
    this.confirming.set(
      member === undefined ? { change, name: '' } : { change, member: member.id, name: member.displayName },
    );
  }

  protected cancel(): void {
    this.confirming.set(undefined);
  }

  async #run({ change, member }: Confirming): Promise<void> {
    const id = this.#campaignId();
    if (change === MemberChange.Leave) {
      // Nothing here is the user's to see any more.
      await this.store.leave(id);
      await this.#router.navigate(['/campaigns']);
      return;
    }
    if (member === undefined) {
      throw new Error(`No member to `);
    }
    if (change === MemberChange.Remove) {
      await this.store.removeMember(id, member);
      this.removed.update((removed) => new Set([...removed, member]));
    } else {
      await this.store.transferGm(id, member);
    }
    this.settled.set(true);
  }

  #campaignId(): CampaignId {
    const campaign = this.store.selected.data();
    if (campaign === undefined) {
      throw new Error('No campaign loaded');
    }
    return campaign.id;
  }
}
