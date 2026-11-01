import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { PartyStashLine, StashCharacter } from '@pioneer/campaign/domain';
import { AsyncButton, ListItem, Stack, Text } from '@pioneer/frontier';

import { CampaignPartyStashStore } from '../../data/campaign-party-stash-store';
import { transferFailure } from '../../data/transfer-error';

/** A line of the stash with how many of it, and the name of the container it is inside, if any. */
interface LineLabel {
  readonly item: string;
  readonly count: number;
}

/**
 * One line of the party stash (ADR-0064): what it is, how many, and a button for each of the viewer's own characters to
 * take it, with what it holds, into their inventory. A line inside a container is not taken alone: it comes with its
 * container, so only a loose line has the buttons. Any member may take any loose line; the stash has no lock.
 */
@Component({
  selector: 'pio-campaign-party-stash-line',
  imports: [AsyncButton, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-party-stash-line.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignPartyStashLine {
  public readonly line = input.required<PartyStashLine>();
  /** The name of the container the line is inside; empty for a loose line. */
  public readonly inside = input<string>('');
  /** The viewer's own characters that may take it. */
  public readonly characters = input.required<readonly StashCharacter[]>();

  readonly #store = inject(CampaignPartyStashStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly label = computed((): LineLabel => ({ item: this.line().name, count: this.line().quantity }));
  protected readonly loose = computed((): boolean => this.line().container === undefined);

  protected readonly takeWith =
    (character: StashCharacter): (() => Promise<void>) =>
    async (): Promise<void> =>
      this.#store.take(character.characterId, this.line().id);

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = transferFailure(error, 'campaign.partyStash.takeFailed');
    return this.#i18n.translate(key, params);
  };
}
