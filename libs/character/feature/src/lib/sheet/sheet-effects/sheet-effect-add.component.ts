import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  canRollBadge,
  EffectAllyName,
  EffectBadgeValue,
  EffectCommandField,
  EffectInstanceId,
  EffectSourceKind,
  rollBadge,
  SELF,
} from '@pioneer/character/domain';
import type { CampaignAlly, EffectSource, PlayCommand } from '@pioneer/character/domain';
import { AsyncButton, Select, Stack, TextInput } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { RANDOM_SOURCE } from '@pioneer/play/ui';
import { ContentId } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';

import { injectCharacterAllies } from '../../data/character-allies-query';
import type { EffectOption } from '../sheet-effects';

/** The message each source of an effect is worded with. */
const SOURCE_LABELS = {
  [EffectSourceKind.Self]: 'character.sheet.effects.sourceSelf',
  [EffectSourceKind.Ally]: 'character.sheet.effects.sourceAlly',
  [EffectSourceKind.Gm]: 'character.sheet.effects.sourceGm',
} as const satisfies Record<EffectSourceKind, string>;

/** The ally choice that means a name typed in, for someone outside the campaign. */
const ALLY_OTHER = 'other';

/**
 * The picker that puts an effect on the character (#349, #509): the effect and who it comes from (the character, an
 * ally, or the GM). An ally is one of the campaign's party when the character is in one, else a name typed in. An effect with a rolled badge is rolled as it is applied. The edit itself is the
 * sheet's,
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
  /** The party member picked as the ally, or `ALLY_OTHER` for a typed name. */
  protected readonly allyChoice = signal<string | undefined>(undefined);
  protected readonly isAlly = computed((): boolean => this.sourceKind() === EffectSourceKind.Ally);
  readonly #allies = injectCharacterAllies(() => this.isAlly());
  readonly #party = computed(() => this.#allies.data()?.allies ?? []);
  protected readonly allyOptions = computed((): readonly SelectOption<string>[] => [
    ...this.#party().map(({ characterId, name }) => ({ value: characterId, label: name })),
    { value: ALLY_OTHER, label: this.#i18n.translate('character.sheet.effects.allyOther') },
  ]);
  /** Whether the party has anyone to pick; a character outside a campaign types the name. */
  protected readonly hasParty = computed((): boolean => this.#party().length > 0);
  /** Whether the ally's name is typed in: nobody to pick, or the choice of someone else. */
  protected readonly typesAlly = computed(
    (): boolean => this.isAlly() && (!this.hasParty() || this.allyChoice() === ALLY_OTHER),
  );
  protected readonly pickedOption = computed((): EffectOption | undefined =>
    this.options().find(({ id }) => id === this.picked()),
  );
  protected readonly canAdd = computed((): boolean => {
    const option = this.pickedOption();
    const rollable = option?.formula === undefined || canRollBadge(option.formula);
    return option !== undefined && rollable && (!this.isAlly() || this.#allyKnown());
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
    this.allyChoice.set(undefined);
  };

  #source(): EffectSource {
    const kind = this.sourceKind();
    if (kind === EffectSourceKind.Ally) {
      const member = this.#member();
      return member === undefined
        ? { kind, name: EffectAllyName.parse(this.allyName()) }
        : { kind, name: EffectAllyName.parse(member.name), characterId: member.characterId };
    }
    return kind === EffectSourceKind.Gm ? { kind } : SELF;
  }

  /** The party member picked, unless the name is typed. */
  #member(): CampaignAlly | undefined {
    return this.typesAlly() ? undefined : this.#party().find(({ characterId }) => characterId === this.allyChoice());
  }

  /** Whether the ally is named: a party member picked, or a name typed. */
  #allyKnown(): boolean {
    return this.typesAlly() ? this.allyName().trim() !== '' : this.#member() !== undefined;
  }
}
