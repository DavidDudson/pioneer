import { computed, inject, Injectable, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { CharacterContract, CORE_RULE_LIMITS } from '@pioneer/character/domain';
import type {
  AcknowledgeItemBody,
  AttachedCampaignId,
  CharacterId,
  CharacterItemApprovals,
  ItemAcknowledgementId,
  ItemApproval,
  RuleLimits,
} from '@pioneer/character/domain';
import { ApiClient, injectScopedQuery } from '@pioneer/shared/web';

import { characterKeys } from './character-query-keys';
import { CharacterStore } from './character-store';

/** What the table decides about the open character's inventory: its limits, and the rule-breaking lines its GM approved. */
export interface TableRules {
  readonly limits: RuleLimits;
  readonly approvals: ReadonlyArray<ItemApproval>;
  /** Whether the owner may acknowledge a warning: a character outside a campaign has no GM to approve it. */
  readonly acknowledgeable?: boolean | undefined;
  /** The campaign it comes from, which a key item on the sheet links back to; none outside a campaign. */
  readonly campaign?: AttachedCampaignId | undefined;
}

/** The core rules' limits and no approval: the table until the server's answers arrive. */
export const CORE_TABLE: TableRules = { limits: CORE_RULE_LIMITS, approvals: [] };

/**
 * The table limits the open character's inventory is held to: its campaign's, else the core rules' (ADR-0064). Cached
 * by TanStack Query apart from the build, as a GM changing a limit never changes the character's version. Provided by
 * the sheet page.
 */
@Injectable()
export class CharacterRuleLimitStore {
  readonly #api = inject(ApiClient);
  readonly #characters = inject(CharacterStore);
  readonly #approvalsWanted = signal(false);
  readonly #id = computed(() => this.#characters.selected()?.id);
  readonly #limits = injectScopedQuery<CharacterId, RuleLimits>({
    id: this.#id,
    key: characterKeys.ruleLimits,
    fetch: async (id) => this.#api.call(CharacterContract.ruleLimits, { params: { id }, body: undefined }),
    missingMessage: 'No character selected',
  });

  readonly #approvals = injectScopedQuery<CharacterId, CharacterItemApprovals>({
    id: this.#id,
    key: characterKeys.itemApprovals,
    fetch: async (id) => this.#api.call(CharacterContract.itemApprovals, { params: { id }, body: undefined }),
    missingMessage: 'No character selected',
    enabled: () => this.#approvalsWanted(),
  });

  /** The open character's limits as the server worked them out. */
  public readonly query = this.#limits.query;

  /**
   * The rule-breaking lines the character's campaign approved; none outside a campaign. The sheet bundle leaves them
   * out, so they are read once a panel that shows them has asked with `wantApprovals`.
   */
  public readonly approvalsQuery = this.#approvals.query;

  /** The owner acknowledges a rule-breaking line of the open character, which silences its warning. */
  public async acknowledge(target: AcknowledgeItemBody): Promise<void> {
    const id = this.#approvals.openId();
    await this.#api.call(CharacterContract.acknowledgeItem, { params: { id }, body: target });
    await this.#approvals.invalidate(id);
  }

  /** The owner takes an acknowledgement back, so the warning returns. */
  public async revoke(acknowledgement: ItemAcknowledgementId): Promise<void> {
    const id = this.#approvals.openId();
    await this.#api.call(CharacterContract.revokeItemAcknowledgement, {
      params: { id, acknowledgementId: acknowledgement },
      body: undefined,
    });
    await this.#approvals.invalidate(id);
  }

  /** Asks for the approvals: called by the panels that show them, as they open. */
  public wantApprovals(): void {
    this.#approvalsWanted.set(true);
  }

  /** The limits in force; the core rules' until the server's arrive, so the sheet never waits on them. */
  public readonly limits: Signal<RuleLimits> = computed(() => this.query.data() ?? CORE_RULE_LIMITS);

  /** The limits and approvals in force; the core rules' and none until the server's arrive, so the sheet never waits. */
  public readonly rules: Signal<TableRules> = computed(() => ({
    limits: this.limits(),
    approvals: this.approvalsQuery.data()?.approvals ?? CORE_TABLE.approvals,
    campaign: this.approvalsQuery.data()?.campaign,
    acknowledgeable: this.approvalsQuery.data()?.acknowledgeable,
  }));
}
