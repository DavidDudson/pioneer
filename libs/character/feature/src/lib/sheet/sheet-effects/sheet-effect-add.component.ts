import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  EffectAllyName,
  EffectBadgeValue,
  EffectCommandField,
  EffectInstanceId,
  EffectSourceKind,
  SELF,
} from '@pioneer/character/domain';
import type { EffectSource, PlayCommand } from '@pioneer/character/domain';
import { AsyncButton, Select, Stack, TextInput } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { RANDOM_SOURCE } from '@pioneer/play/ui';
import { ContentId } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';

import { canRollBadge, rollBadge } from '../sheet-effects';
import type { EffectOption } from '../sheet-effects';

/** The message each source of an effect is worded with. */
const SOURCE_LABELS = {
  [EffectSourceKind.Self]: 'character.sheet.effects.sourceSelf',
  [EffectSourceKind.Ally]: 'character.sheet.effects.sourceAlly',
  [EffectSourceKind.Gm]: 'character.sheet.effects.sourceGm',
} as const satisfies Record<EffectSourceKind, string>;

/**
 * The picker that puts an effect on the character (#349): the effect and who it comes from (the character, an ally
 * by name, or the GM). An effect with a rolled badge is rolled as it is applied. The edit itself is the sheet's,
 * handed in as `send`, so every effect edit shares one revision.
 */
@Component({
  selector: 'pio-sheet-effect-add',
  imports: [AsyncButton, Select, Stack, TextInput, TranslocoPipe],
  templateUrl: './sheet-effect-add.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetEffectAdd {
  readonly #random = inject(RANDOM_SOURCE);
  readonly #i18n = inject(TranslocoService);

  public readonly options = input.required<readonly EffectOption[]>();
  public readonly busy = input.required<boolean>();
  public readonly send = input.required<(command: PlayCommand) => Promise<void>>();
  public readonly describeError = input.required<(error: unknown) => string>();

  protected readonly choices = computed((): readonly SelectOption<string>[] =>
    this.options().map(({ id, name }) => ({ value: id, label: name })),
  );
  protected readonly sources = computed((): readonly SelectOption<EffectSourceKind>[] =>
    Object.values(EffectSourceKind).map((kind) => ({ value: kind, label: this.#i18n.translate(SOURCE_LABELS[kind]) })),
  );

  /** The effect picked to apply, who it comes from and, for an ally, their name. */
  protected readonly picked = signal<string | undefined>(undefined);
  protected readonly sourceKind = signal<EffectSourceKind>(EffectSourceKind.Self);
  protected readonly allyName = signal('');
  protected readonly isAlly = computed((): boolean => this.sourceKind() === EffectSourceKind.Ally);
  protected readonly pickedOption = computed((): EffectOption | undefined =>
    this.options().find(({ id }) => id === this.picked()),
  );
  protected readonly canAdd = computed((): boolean => {
    const option = this.pickedOption();
    const rollable = option?.formula === undefined || canRollBadge(option.formula);
    return option !== undefined && rollable && (!this.isAlly() || this.allyName().trim() !== '');
  });

  protected readonly setSource = (kind: EffectSourceKind | undefined): void => {
    this.sourceKind.set(kind ?? EffectSourceKind.Self);
  };

  protected readonly add = async (): Promise<void> => {
    const option = this.pickedOption();
    if (option === undefined) {
      return;
    }
    const rolled = option.formula === undefined ? undefined : rollBadge(option.formula, this.#random);
    await this.send()({
      field: EffectCommandField.ApplyEffect,
      id: EffectInstanceId.parse(newId()),
      effect: ContentId.parse(option.id),
      source: this.#source(),
      ...(rolled === undefined ? {} : { rolled: EffectBadgeValue.parse(rolled) }),
    });
    this.picked.set(undefined);
    this.allyName.set('');
  };

  #source(): EffectSource {
    const kind = this.sourceKind();
    if (kind === EffectSourceKind.Ally) {
      return { kind, name: EffectAllyName.parse(this.allyName()) };
    }
    return kind === EffectSourceKind.Gm ? { kind } : SELF;
  }
}
