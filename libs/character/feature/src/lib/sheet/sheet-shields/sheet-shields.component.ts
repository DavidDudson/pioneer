import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  HIT_POINTS_EDIT_MAX,
  InventoryItemId,
  PlayCommandField,
  ShieldCondition,
  ShieldLayers,
  untypedDamage,
} from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncPending,
  AsyncRegion,
  NumberInput,
  Skeleton,
  Stack,
  Text,
} from '@pioneer/frontier';
import { HitPoints } from '@pioneer/rules/sdk';
import type { ContentKind, ShardDamage } from '@pioneer/rules/sdk';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { ACTION_CONTENT_KINDS } from '../sheet-actions';
import { describeSaveError } from '../sheet-field';
import { blockSpend, SHIELD_CONDITION_MESSAGES, shieldIds, shieldLines, shieldRaised } from '../sheet-shields';
import type { ShieldIds, ShieldLine } from '../sheet-shields';

/** A shield as shown: the numbers beside the state it is in, and whether it can block now. */
interface ShownShield {
  readonly line: ShieldLine;
  readonly summary: string;
  readonly canBlock: boolean;
}

const SHIELD_KINDS: readonly ContentKind[] = ACTION_CONTENT_KINDS;

/**
 * The shields the open character holds (#505), each with the Hit Points it has left, its Hardness and whether it is
 * whole, broken or destroyed. While the shield is raised and the reaction is free, Shield Block takes the damage
 * coming in: the reaction is spent, Hardness prevents its share, and the character and the shield take the rest.
 * Raising a shield is the Raise a Shield action in the actions list, which applies the raised shield's effect.
 */
@Component({
  selector: 'pio-sheet-shields',
  imports: [AsyncButton, AsyncData, AsyncPending, AsyncRegion, NumberInput, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-shields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetShields {
  readonly #i18n = inject(TranslocoService);
  readonly #characters = inject(CharacterStore);
  readonly #play = inject(PlayStore);

  protected readonly registry = injectContentRegistry(SHIELD_KINDS);
  protected readonly playQuery = this.#play.play;
  protected readonly amountMax = HIT_POINTS_EDIT_MAX;
  /** The damage coming in, as typed. */
  protected readonly amount = signal(0);
  protected readonly complete = signal(true);
  protected readonly busy = signal(false);
  /** The layers a layered shield breaks with the next block, as typed. */
  protected readonly layers = signal(1);
  /** What the shards of the shield that was just broken deal, until the next block; empty when none broke. */
  protected readonly shardsDue = signal('');

  protected readonly shields = computed((): readonly ShownShield[] => {
    const registry = this.registry.data();
    const character = this.#characters.selected();
    const read = this.#play.play.data();
    if (registry === undefined || character === undefined || read === undefined) {
      return [];
    }
    const ids = shieldIds(registry);
    const reactionFree = ids !== undefined && !read.play.turn.reactionUsed;
    const raised = ids !== undefined && shieldRaised(read.play, ids);
    return shieldLines(registry, character, read.play).map((line): ShownShield => ({
      line,
      summary: this.#say(
        line.undamageable ? 'character.sheet.shields.summaryUndamageable' : 'character.sheet.shields.summary',
        {
          name: line.name,
          state: this.#say(SHIELD_CONDITION_MESSAGES[line.condition]),
          left: line.left,
          hitPoints: line.hitPoints,
          hardness: line.hardness,
        },
      ),
      canBlock: reactionFree && (raised || line.raised) && line.condition === ShieldCondition.Whole,
    }));
  });

  protected readonly ready = computed(() => this.complete() && this.amount() > 0 && !this.busy());

  /** Shield Block with `key`: the reaction spent, then the damage blocked. A broken or destroyed shield changes the inventory, so read it again. */
  protected readonly block = (key: string) => async (): Promise<void> => {
    const registry = this.registry.data();
    const line = this.shields().find((shown) => shown.line.key === key)?.line;
    const shards = line?.shards;
    const ids = registry === undefined ? undefined : shieldIds(registry);
    if (ids === undefined) {
      return;
    }
    this.busy.set(true);
    try {
      await this.#blockWith(key, ids, this.#layersFor(line));
      await this.#characters.reload();
      this.shardsDue.set(this.#shardsNotice(shards));
    } finally {
      this.busy.set(false);
    }
  };

  /** The reaction spent, then the damage coming in blocked by the shield `key`. */
  async #blockWith(key: string, ids: ShieldIds, layers: ShieldLayers | undefined): Promise<void> {
    await this.#play.send(blockSpend(ids));
    const damage = untypedDamage(HitPoints.parse(this.amount()));
    const item = InventoryItemId.parse(key);
    await this.#play.send({
      field: PlayCommandField.BlockWithShield,
      item,
      damage,
      ...(layers === undefined ? {} : { layers }),
    });
  }

  /** The layers the block breaks: those typed, never more than the shield has left; none for a shield without layers. */
  #layersFor(line: ShieldLine | undefined): ShieldLayers | undefined {
    return line?.layersLeft === undefined ? undefined : ShieldLayers.parse(Math.min(this.layers(), line.layersLeft));
  }

  /** What the shards deal, in words; empty for a shield without any. */
  #shardsNotice(shards: ShardDamage | undefined): string {
    return shards === undefined
      ? ''
      : this.#say('character.sheet.shields.shards', { damage: shards.damage, type: shards.damageType });
  }

  #say(key: string, params?: Readonly<Record<string, string | number>>): string {
    return this.#i18n.translate(key, params);
  }

  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
