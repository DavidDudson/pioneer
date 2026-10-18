import { computed, inject, Injectable } from '@angular/core';
import type { Provider } from '@angular/core';
import {
  abilityFrequencies,
  abilityUseKey,
  PlayCommandField,
  SlotCountKey,
  SpendCount,
  SpendId,
  SpendKind,
  UseCountKey,
} from '@pioneer/character/domain';
import type { SpellSpend, SpendCommand, SpendCost, SpendRequest, TurnState } from '@pioneer/character/domain';
import { ActionCost, ContentKind } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { ActionUser } from '@pioneer/rules/ui';
import type { ActionUse, UsePayment } from '@pioneer/rules/ui';
import { newId } from '@pioneer/shared/kernel';

import { injectContentRegistry } from '../data/content-registry-query';
import { PlayStore } from '../data/play-store';
import { ACTION_CONTENT_KINDS, makesAttack, spendCostOf } from './sheet-actions';
import { sustainedCast } from './sheet-active-list';
import { raisedEdit, shieldIds } from './sheet-shields';

/** What a spend reads: the actions, and the spells a sustained cast starts an active spell from. */
const SPENDER_CONTENT_KINDS: readonly ContentKind[] = [...ACTION_CONTENT_KINDS, ContentKind.Spell];

/** The cost of Sustain and of the Dismiss action: one action. */
const ONE_ACTION: SpendCost = { kind: SpendKind.Actions, count: SpendCount.parse(1) };

/** The payment a spend records beside its cost, as the spend names it. */
type SpendPayment = Pick<SpendRequest, 'use' | 'slot' | 'focus'>;

/** What `payment` pays, as the keys and flag a spend records. */
function paymentOf(payment: UsePayment | undefined): SpendPayment {
  return {
    ...(payment?.use === undefined ? {} : { use: UseCountKey.parse(payment.use) }),
    ...(payment?.slot === undefined ? {} : { slot: SlotCountKey.parse(payment.slot) }),
    ...(payment?.focus === true ? { focus: true as const } : {}),
  };
}

/** The frequency use an action with a frequency records, when the use did not name one. */
function frequencyOf(registry: ContentRegistry, { line }: ActionUse): SpendPayment {
  return abilityFrequencies(registry).has(line.id) ? { use: abilityUseKey(line.id) } : {};
}

/**
 * The spend using `request` records, or undefined when its cost is not known. Casting a sustained spell also records
 * the active spell it starts, which reads the spell from `registry`.
 */
export function spendOf(registry: ContentRegistry, request: ActionUse): SpendCommand | undefined {
  const { line, actions } = request;
  const pays = line.payment !== undefined;
  const cost = spendCostOf(line.cost ?? (pays ? ActionCost.Free : undefined), actions);
  if (cost === undefined) {
    return undefined;
  }
  const recorded = pays ? paymentOf(line.payment) : frequencyOf(registry, request);
  const attacks = line.attack === true || makesAttack(registry, line.id);
  const cast = sustainedCast(registry, line.id, recorded.slot);
  return {
    field: PlayCommandField.SpendAction,
    id: SpendId.parse(newId()),
    action: line.id,
    cost,
    ...recorded,
    ...(attacks ? { attack: true as const } : {}),
    ...(cast === undefined ? {} : { spell: cast }),
  };
}

/**
 * What using an action, Strike, spell or item activation does on the sheet (#355): its cost taken from the turn with
 * what it pays (a frequency use, a spell slot or a Focus Point), and logged, by one `spendAction` edit the server
 * checks. Provided by the sheet page, so every list on its tabs spends the same way, and the turn it reads is the one
 * they filter by.
 */
@Injectable()
export class SheetSpender extends ActionUser {
  readonly #play = inject(PlayStore);
  readonly #registry = injectContentRegistry(SPENDER_CONTENT_KINDS);

  /** The turn as the play state has it; undefined while that loads. */
  public readonly turn = computed((): TurnState | undefined => this.#play.play.data()?.play.turn);

  public override async use(request: ActionUse): Promise<void> {
    const registry = this.#registry.data();
    const spend = registry === undefined ? undefined : spendOf(registry, request);
    if (spend === undefined) {
      return;
    }
    await this.#play.send(spend);
    await this.#raised(request.line.id);
  }

  /** Sustains or dismisses the active spell `change` names with the one action each takes, spent and logged like any other. */
  public async spendSpell(action: ContentId, change: SpellSpend): Promise<void> {
    await this.#play.send({
      field: PlayCommandField.SpendAction,
      id: SpendId.parse(newId()),
      action,
      cost: ONE_ACTION,
      spell: change,
    });
  }

  /** Raising a shield puts its effect on the character until the start of its next turn, unless it is already on. */
  async #raised(action: ContentId): Promise<void> {
    const registry = this.#registry.data();
    const read = this.#play.play.data();
    const ids = registry === undefined ? undefined : shieldIds(registry);
    if (ids === undefined || read === undefined || ids.raise !== action) {
      return;
    }
    const edit = raisedEdit(read.play, ids);
    if (edit !== undefined) {
      await this.#play.send(edit);
    }
  }
}

/** What the sheet page provides for play: its state, and the spender every list on its tabs uses an action with. */
export const SHEET_PLAY_PROVIDERS: readonly Provider[] = [
  PlayStore,
  SheetSpender,
  { provide: ActionUser, useExisting: SheetSpender },
];
