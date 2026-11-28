import { computed, inject, Injectable, signal } from '@angular/core';
import type { Provider } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  abilityFrequencies,
  abilityUseKey,
  cantripRank,
  characterPredicateFacts,
  InventoryItemId,
  PlayCommandField,
  SlotCountKey,
  SpendCount,
  SpendId,
  SpendKind,
  UseCountKey,
} from '@pioneer/character/domain';
import type {
  EffectInstanceId,
  FormApply,
  FormShift,
  SpellSpend,
  SpendCommand,
  SpendCost,
  SpendRequest,
  TurnState,
} from '@pioneer/character/domain';
import { ActionCost, ContentId } from '@pioneer/rules/sdk';
import type { ContentKind, ContentRegistry, HitPoints } from '@pioneer/rules/sdk';
import { ActionUser } from '@pioneer/rules/ui';
import type { ActionUse, UsePayment } from '@pioneer/rules/ui';
import { newId } from '@pioneer/shared/kernel';
import { filter, firstValueFrom } from 'rxjs';

import { injectContentRegistry } from '../data/content-registry-query';
import { PlayStore } from '../data/play-store';
import { ACTION_CONTENT_KINDS, makesAttack, spendCostOf } from './sheet-actions';
import { spellEntries, sustainedCast } from './sheet-active-list';
import { SheetConsumableUse } from './sheet-consumable-use';
import { activeFormOf } from './sheet-effects';
import { FORM_CAST_CONTENT_KINDS, formCastOf } from './sheet-form-cast';
import type { FormCast, FormCastChoice, FormCaster } from './sheet-form-cast';
import { raisedEdit, shieldIds } from './sheet-shields';
import { sheetSources } from './sheet-sources';
import { SheetState } from './sheet-state';

/**
 * What a spend reads: the actions, the spells a sustained cast starts an active spell from, and the effects of a form
 * cast. They load when something is first used (#1834), so a sheet where nothing is used never fetches the spells.
 */
const SPENDER_CONTENT_KINDS: ReadonlyArray<ContentKind> = [...ACTION_CONTENT_KINDS, ...FORM_CAST_CONTENT_KINDS];

/** What a load of the spend's content came to: the registry, absent when it failed. */
interface LoadedRegistry {
  readonly registry: ContentRegistry | undefined;
}

/** The cost of Sustain and of the Dismiss action: one action. */
const ONE_ACTION: SpendCost = { kind: SpendKind.Actions, count: SpendCount.parse(1) };

/** The payment a spend records beside its cost, as the spend names it. */
type SpendPayment = Pick<SpendRequest, 'use' | 'slot' | 'focus' | 'staff'>;

/** What `payment` pays, as the keys and flag a spend records. */
function paymentOf(payment: UsePayment | undefined): SpendPayment {
  const used: SpendPayment = payment?.use === undefined ? {} : { use: UseCountKey.parse(payment.use) };

  const slotted: SpendPayment =
    payment?.slot === undefined ? used : { ...used, slot: SlotCountKey.parse(payment.slot) };

  const focused: SpendPayment = payment?.focus === true ? { ...slotted, focus: true } : slotted;

  if (payment?.staff === undefined) {
    return focused;
  }

  const staff = { item: InventoryItemId.parse(payment.staff.item), spell: ContentId.parse(payment.staff.spell) };

  return {
    ...focused,
    staff: payment.staff.slot === undefined ? staff : { ...staff, slot: SlotCountKey.parse(payment.staff.slot) },
  };
}

/** The frequency use an action with a frequency records, when the use did not name one. */
function frequencyOf(registry: ContentRegistry, { line }: ActionUse): SpendPayment {
  return abilityFrequencies(registry).has(line.id) ? { use: abilityUseKey(line.id) } : {};
}

/** The form a spend carries: the active effect it shifts to another form, or the form it puts on the character. */
export interface FormSpend {
  readonly shift?: FormShift;
  readonly apply?: FormApply;
}

/** The spend of an action, the one spend command that carries the attack and cast flags. */
type ActionSpend = Extract<SpendCommand, { field: typeof PlayCommandField.SpendAction }>;

/** `spend` with the attack and cast flags, each left off when it does not apply. */
function flagged(spend: ActionSpend, attacks: boolean, casts: boolean): ActionSpend {
  const attacking: ActionSpend = attacks ? { ...spend, attack: true } : spend;

  return casts ? { ...attacking, cast: true } : attacking;
}

/**
 * The spend using `request` records, or undefined when its cost is not known. Casting a sustained spell also records
 * the active spell it starts, which reads the spell from `registry`, and a form shift records the form it changes.
 */
export function spendOf(registry: ContentRegistry, request: ActionUse, form: FormSpend = {}): SpendCommand | undefined {
  const { line, actions } = request;
  const pays = line.payment !== undefined;
  const cost = spendCostOf(line.cost ?? (pays ? ActionCost.Free : undefined), actions);

  if (cost === undefined) {
    return undefined;
  }

  const recorded = pays ? paymentOf(line.payment) : frequencyOf(registry, request);
  const attacks = line.attack === true || makesAttack(registry, line.id);
  // A staff's spell is cast from the staff, which records it as a staff cast and not as a spell of the character's own.
  const casts = line.payment?.staff === undefined && spellEntries(registry).has(line.id);
  const cast = sustainedCast(registry, line.id, recorded.slot);

  const spend: ActionSpend = {
    field: PlayCommandField.SpendAction,
    id: SpendId.parse(newId()),
    action: line.id,
    cost,
    ...recorded,
  };

  const flaggedSpend = flagged(spend, attacks, casts);

  return { ...(cast === undefined ? flaggedSpend : { ...flaggedSpend, spell: cast }), ...form };
}

/** The form picked and the temporary Hit Points it gives, each left off when there is none. */
function formChosen(choice: FormCastChoice, tempHp: HitPoints | undefined): Pick<FormApply, 'form' | 'tempHp'> {
  const chosen: Pick<FormApply, 'form' | 'tempHp'> = {};

  if (choice.form !== undefined) {
    chosen.form = choice.form;
  }

  if (tempHp !== undefined) {
    chosen.tempHp = tempHp;
  }

  return chosen;
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
  readonly #wanted = signal(false);
  readonly #registry = injectContentRegistry(SPENDER_CONTENT_KINDS, () => this.#wanted());
  /** The registry once it has loaded, or empty-handed once it failed to; undefined while it loads. */
  readonly #loaded$ = toObservable(
    computed((): LoadedRegistry | undefined =>
      this.#registry.data() === undefined && !this.#registry.isError()
        ? undefined
        : { registry: this.#registry.data() },
    ),
  );
  readonly #sheet = inject(SheetState);
  readonly #consumables = inject(SheetConsumableUse);

  /** The turn as the play state has it; undefined while that loads. */
  public readonly turn = computed((): TurnState | undefined => this.#play.play.data()?.play.turn);

  /** The cast of a battle form spell waiting for its form to be picked; nothing is spent until it is. Another cast waits until it is done. */
  public readonly pendingForm = signal<FormCast | undefined>(undefined);

  public override async use(request: ActionUse): Promise<void> {
    const consumable = request.line.payment?.consumable;

    if (consumable !== undefined) {
      await this.#consumables.useHeld(consumable);

      return;
    }

    const registry = await this.#load();
    const cast = registry === undefined ? undefined : formCastOf(registry, request, this.#caster(registry));

    if (cast !== undefined) {
      // One form cast waits at a time: a second use is ignored until the first is confirmed or cancelled.
      this.pendingForm.update((pending) => pending ?? cast);

      return;
    }

    await this.#spend(request);
  }

  /** Starts loading what a spend reads and waits for it; undefined when it could not be loaded. */
  async #load(): Promise<ContentRegistry | undefined> {
    this.#wanted.set(true);
    const loaded = await firstValueFrom(this.#loaded$.pipe(filter((each) => each !== undefined)));

    return loaded.registry;
  }

  /** Whether the pending cast is being spent and applied, which can no longer be given up. */
  public readonly casting = signal(false);

  /** What a form cast reads of the open character; undefined while it loads. */
  #caster(registry: ContentRegistry): FormCaster | undefined {
    const character = this.#sheet.character();

    return character === undefined
      ? undefined
      : {
          facts: characterPredicateFacts(character.document, sheetSources(registry, character)),
          focusRank: cantripRank(character.level),
          form: activeFormOf(registry, character.document.play.effects)?.id,
        };
  }

  /** Gives up the pending form cast, which spent nothing; a cast being spent is left to finish. */
  public cancelForm(): void {
    if (!this.casting()) {
      this.pendingForm.set(undefined);
    }
  }

  /**
   * Casts the pending spell as one spend, which the server refuses when the turn, the slot or the Focus Points cannot
   * pay or the form is not one the spell offers, and which puts the form on the character with the temporary Hit Points it
   * gives, so a cast never spends without the form. A spell that shifts the form the character is in is one spend that changes it, so undoing the spend changes it back. The cast
   * stays pending when the spend is refused.
   */
  public async castForm(choice: FormCastChoice, tempHp: HitPoints | undefined, id: EffectInstanceId): Promise<void> {
    const cast = this.pendingForm();

    if (cast === undefined) {
      return;
    }

    this.casting.set(true);

    try {
      const chosen = formChosen(choice, tempHp);
      const applied: FormApply = { id, effect: choice.effect, ...chosen };

      await this.#spend(
        cast.request,
        cast.shift === undefined
          ? { apply: cast.rank === undefined ? applied : { ...applied, rank: cast.rank } }
          : { shift: { effect: cast.shift, to: choice.effect, ...chosen } },
      );
      this.pendingForm.set(undefined);
    } finally {
      this.casting.set(false);
    }
  }

  /** Spends `request`; with `shift` the same edit also changes the form of an active effect, so undoing the spend changes it back. */
  async #spend(request: ActionUse, form?: FormSpend): Promise<void> {
    const registry = this.#registry.data();
    const spend = registry === undefined ? undefined : spendOf(registry, request, form);

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
export const SHEET_PLAY_PROVIDERS: ReadonlyArray<Provider> = [
  PlayStore,
  SheetConsumableUse,
  SheetSpender,
  { provide: ActionUser, useExisting: SheetSpender },
];
