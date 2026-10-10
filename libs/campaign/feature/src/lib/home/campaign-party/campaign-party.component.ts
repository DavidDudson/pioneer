import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LucideUsers } from '@lucide/angular';
import type { CampaignId, CharacterId, PartyCharacter } from '@pioneer/campaign/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Avatar,
  Badge,
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
import { CampaignAttachPicker } from '../campaign-attach-picker/campaign-attach-picker.component';

/** Skeleton rows shown while the party loads. */
const PLACEHOLDERS = ['first', 'second'] as const;

/**
 * The characters players have brought into the open campaign, and a picker of the user's own
 * characters to bring one in. A character's owner or the GM detaches it; the owner can bring it
 * back, so detaching acts on the first press.
 */
@Component({
  selector: 'pio-campaign-party',
  imports: [
    AsyncButton,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Avatar,
    Badge,
    CampaignAttachPicker,
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
  templateUrl: './campaign-party.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignPartyPanel {
  protected readonly store = inject(CampaignStore);
  readonly #i18n = inject(TranslocoService);
  /** One detach action per character, so each button keeps the same action across renders. */
  readonly #detaches = new Map<CharacterId, () => Promise<void>>();

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly emptyIcon = LucideUsers;
  /**
   * Characters detached since the party loaded. Their rows stay, marked, until it next loads, so the
   * focused Detach button and its tick survive; detaching again is harmless.
   */
  protected readonly detached = signal<ReadonlySet<CharacterId>>(new Set());

  protected readonly describeDetachError = (): string => this.#i18n.translate('campaign.party.detachFailed');

  /** A character brought back into the party is no longer detached. */
  protected rejoined(characterId: CharacterId): void {
    this.detached.update((detached) => new Set([...detached].filter((id) => id !== characterId)));
  }

  protected detach(character: PartyCharacter): () => Promise<void> {
    const existing = this.#detaches.get(character.characterId);
    if (existing !== undefined) {
      return existing;
    }
    const action = async (): Promise<void> => {
      await this.store.detachCharacter(this.#campaignId(), character.characterId);
      this.detached.update((detached) => new Set([...detached, character.characterId]));
    };
    this.#detaches.set(character.characterId, action);
    return action;
  }

  #campaignId(): CampaignId {
    const campaign = this.store.selected.data();
    if (campaign === undefined) {
      throw new Error('No campaign loaded');
    }
    return campaign.id;
  }
}
