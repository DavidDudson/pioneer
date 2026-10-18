import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { List, ListItem, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { EffectChange, EffectStatusKind } from '@pioneer/rules/engine';
import type { DamageAdjustmentEffect, EffectStatus, ImmunityEffect } from '@pioneer/rules/engine';
import { DamageGroupSchema, DamageTypeSchema } from '@pioneer/rules/sdk';
import type { DamageAdjustmentTarget } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { modifierValue } from '../breakdown/line-words';
import { ACUITY_MESSAGES } from '../creature-stat-block/creature-stat-block-messages';
import { DAMAGE_GROUP_MESSAGES, DefencesMessage } from '../defences/defences-messages';
import { DAMAGE_TYPE_MESSAGES } from '../rich-text/rich-text-messages';
import type { PreviewEffect } from './entry-preview';
import { EFFECT_STATUS_MESSAGES, EntryPreviewMessage } from './entry-preview-messages';

/**
 * The lines an entry adds to a character's statistics, worded ("Perception -2 status"), or that it adds none. A line
 * that does not count says why. Presentational: the caller finds the lines.
 *
 * ```html
 * <pio-entry-effects [effects]="preview.effects" />
 * ```
 */
@Component({
  selector: 'pio-entry-effects',
  imports: [List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './entry-effects.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryEffectsView {
  public readonly effects = input.required<readonly PreviewEffect[]>();

  protected readonly Message = EntryPreviewMessage;

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly worded = computed((): readonly string[] => {
    this.#messages();
    this.#format.locale();
    return this.effects().map((effect) => this.#effect(effect));
  });

  /** "Perception -2 status", with the reason it doesn't count when it doesn't. */
  #effect({ statistic, line, sense, exceptions }: PreviewEffect): string {
    switch (line.change) {
      case EffectChange.Bonus:
      case EffectChange.Penalty: {
        const value = modifierValue(line, this.#i18n, this.#format);
        return this.#marked(line.status, EntryPreviewMessage.Effect, { statistic: statistic ?? '', value });
      }
      case EffectChange.Set: {
        const value = line.value === undefined ? '' : this.#format.number(line.value);
        return this.#marked(line.status, EntryPreviewMessage.EffectSet, { statistic: statistic ?? '', value });
      }
      case EffectChange.Weakness:
      case EffectChange.Resistance:
      case EffectChange.Immunity: {
        return this.#defence(line, exceptions);
      }
      case EffectChange.Sense: {
        return this.#marked(line.status, EntryPreviewMessage.EffectSense, {
          sense: sense ?? line.sense,
          acuity: this.#i18n.translate(ACUITY_MESSAGES[line.acuity]),
          hasRange: line.range === undefined ? 'no' : 'yes',
          range: line.range === undefined ? '' : this.#format.distance(line.range),
        });
      }
      case EffectChange.NotSummarised: {
        return this.#i18n.translate(EntryPreviewMessage.EffectNotSummarised, { element: line.element });
      }
      default: {
        return line satisfies never;
      }
    }
  }

  /** "Weakness 5 fire", "Resistance 5 physical", "Immunity fire". */
  #defence(line: DamageAdjustmentEffect | ImmunityEffect, exceptionNames: readonly string[] | undefined): string {
    if (line.change === EffectChange.Immunity) {
      const damageType = DamageTypeSchema.safeParse(line.immunity);
      const target = damageType.success
        ? this.#i18n.translate(DAMAGE_TYPE_MESSAGES[damageType.data])
        : String(line.immunity);
      return this.#marked(line.status, DefencesMessage.Immunity, { target });
    }
    const key = line.change === EffectChange.Weakness ? DefencesMessage.Weakness : DefencesMessage.Resistance;
    return this.#marked(line.status, key, {
      hasValue: line.value === undefined ? 'no' : 'yes',
      value: line.value === undefined ? '' : this.#format.number(line.value),
      target: this.#target(line.damage),
      hasExceptions: line.exceptions.length === 0 ? 'no' : 'yes',
      exceptions: this.#format.list(exceptionNames ?? line.exceptions, 'disjunction'),
    });
  }

  /** The line's words, then the status that keeps it from counting when it doesn't. */
  #marked(status: EffectStatus, key: string, params: Readonly<Record<string, string>>): string {
    const words: string = this.#i18n.translate(key, params);
    if (status.kind === EffectStatusKind.Applied) {
      return words;
    }
    const mark: string = this.#i18n.translate(EFFECT_STATUS_MESSAGES[status.kind]);
    return this.#i18n.translate(EntryPreviewMessage.EffectMarked, { words, status: mark });
  }

  /** A damage type's name, or a group's; `all` reads as "all damage". */
  #target(target: DamageAdjustmentTarget): string {
    const group = DamageGroupSchema.safeParse(target);
    if (group.success) {
      return this.#i18n.translate(DAMAGE_GROUP_MESSAGES[group.data]);
    }
    return this.#i18n.translate(DAMAGE_TYPE_MESSAGES[DamageTypeSchema.parse(target)]);
  }
}
