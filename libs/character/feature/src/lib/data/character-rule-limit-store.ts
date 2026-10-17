import { computed, inject, Injectable } from '@angular/core';
import type { Signal } from '@angular/core';
import { CharacterContract, CORE_RULE_LIMITS } from '@pioneer/character/domain';
import type { ItemApproval, RuleLimits } from '@pioneer/character/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { CharacterStore } from './character-store';

/** What the table decides about the open character's inventory: its limits, and the rule-breaking lines its GM approved. */
export interface TableRules {
  readonly limits: RuleLimits;
  readonly approvals: readonly ItemApproval[];
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
  readonly #id = computed(() => this.#characters.selected()?.id);

  /** The open character's limits as the server worked them out. */
  public readonly query = injectQuery(() => {
    const id = this.#id();
    return {
      queryKey: ['characters', 'rule-limits', id],
      queryFn: async (): Promise<RuleLimits> => {
        if (id === undefined) {
          throw new Error('No character selected');
        }
        return this.#api.call(CharacterContract.ruleLimits, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });

  /** The rule-breaking lines the character's campaign approved; none outside a campaign. */
  public readonly approvalsQuery = injectQuery(() => {
    const id = this.#id();
    return {
      queryKey: ['characters', 'item-approvals', id],
      queryFn: async (): Promise<readonly ItemApproval[]> => {
        if (id === undefined) {
          throw new Error('No character selected');
        }
        const { approvals } = await this.#api.call(CharacterContract.itemApprovals, {
          params: { id },
          body: undefined,
        });
        return approvals;
      },
      enabled: id !== undefined,
    };
  });

  /** The limits in force; the core rules' until the server's arrive, so the sheet never waits on them. */
  public readonly limits: Signal<RuleLimits> = computed(() => this.query.data() ?? CORE_RULE_LIMITS);

  /** The limits and approvals in force; the core rules' and none until the server's arrive, so the sheet never waits. */
  public readonly rules: Signal<TableRules> = computed(() => ({
    limits: this.limits(),
    approvals: this.approvalsQuery.data() ?? CORE_TABLE.approvals,
  }));
}
