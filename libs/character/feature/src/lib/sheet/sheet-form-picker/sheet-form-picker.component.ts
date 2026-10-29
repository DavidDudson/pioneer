import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { EffectInstanceId, SELF } from '@pioneer/character/domain';
import type { ActiveEffect } from '@pioneer/character/domain';
import { ContentId } from '@pioneer/rules/sdk';
import { FormPicker } from '@pioneer/rules/ui';
import type { FormPickerOption, FormPreview } from '@pioneer/rules/ui';
import { newId } from '@pioneer/shared/kernel';

import { injectContentRegistry } from '../../data/content-registry-query';
import { EQUIPMENT_CONTENT_KINDS } from '../sheet-equipment';
import { describeSaveError } from '../sheet-field';
import type { FormCastChoice } from '../sheet-form-cast';
import { sheetFormPreview } from '../sheet-form-preview';
import { SheetSpender } from '../sheet-spender';
import { SheetState } from '../sheet-state';
import { sheetFormTempHp } from '../sheet-statistics';

/**
 * The picker a battle form spell opens when it is cast from the sheet (#525): the forms its effects offer at the rank
 * cast, and for the one picked what it changes against the character's numbers. Confirming spends the cast and puts
 * the form on the character; cancelling spends nothing. Empty when no such spell is being cast.
 */
@Component({
  selector: 'pio-sheet-form-picker',
  imports: [FormPicker],
  templateUrl: './sheet-form-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetFormPicker {
  protected readonly spender = inject(SheetSpender);
  readonly #sheet = inject(SheetState);
  readonly #i18n = inject(TranslocoService);
  readonly #registry = injectContentRegistry(EQUIPMENT_CONTENT_KINDS);

  protected readonly pending = this.spender.pendingForm;

  /** The value of the form picked, among the options. */
  protected readonly picked = signal<string | undefined>(undefined);

  public constructor() {
    // Another cast opened in the picker leaves nothing picked: the form picked for the last one is not among its choices.
    effect(() => {
      this.pending();
      this.picked.set(undefined);
    });
  }

  protected readonly options = computed((): readonly FormPickerOption[] =>
    (this.pending()?.choices ?? []).map(({ value, label }) => ({ value, label })),
  );

  readonly #choice = computed((): FormCastChoice | undefined =>
    this.pending()?.choices.find(({ value }) => value === this.picked()),
  );

  /** The effect the picked form would put on the character, as the sheet would apply it. */
  readonly #candidate = computed((): ActiveEffect | undefined => {
    const choice = this.#choice();
    const pending = this.pending();
    return choice === undefined || pending === undefined
      ? undefined
      : {
          id: EffectInstanceId.parse(newId()),
          effect: ContentId.parse(choice.effect),
          source: SELF,
          rank: pending.rank,
          ...(choice.form === undefined ? {} : { form: choice.form }),
        };
  });

  /** What the picked form changes; undefined until one is picked, or while the content loads. */
  protected readonly preview = computed((): FormPreview | undefined => {
    const registry = this.#registry.data();
    const character = this.#sheet.character();
    const candidate = this.#candidate();
    return registry === undefined || character === undefined || candidate === undefined
      ? undefined
      : sheetFormPreview({
          registry,
          character,
          candidate,
          translate: (key, params) => this.#i18n.translate(key, params),
        });
  });

  /** Spends the cast and puts the picked form on the character. */
  protected readonly confirm = async (): Promise<void> => {
    const choice = this.#choice();
    const registry = this.#registry.data();
    const character = this.#sheet.character();
    const candidate = this.#candidate();
    if (choice === undefined || registry === undefined || character === undefined || candidate === undefined) {
      return;
    }
    await this.spender.castForm(choice, sheetFormTempHp(registry, character, candidate));
    this.picked.set(undefined);
  };

  protected readonly cancel = (): void => {
    this.picked.set(undefined);
    this.spender.cancelForm();
  };

  /** The server's reason (a conflict or a refusal), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
