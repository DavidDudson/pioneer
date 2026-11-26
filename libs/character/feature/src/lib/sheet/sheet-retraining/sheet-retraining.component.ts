import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { form, FormField, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField, RetrainDays } from '@pioneer/character/domain';
import { AsyncButton, Grid, NumberField, Stack, Text } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import { OptionPicker } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CharacterStore } from '../../data/character-store';
import { describeSaveError } from '../sheet-field';
import { sheetSlotContent } from '../sheet-slot-content';
import { SheetState } from '../sheet-state';
import { injectTranslationChanges } from '../sheet-translation-changes';
import { retrainableSlots, retrainTargets } from './sheet-retraining-options';

/** What the days field checks: the days the server takes for one edit. */
const WorkedSchema = z.object({ days: RetrainDays });

/** The days worked at once. */
interface WorkedModel {
  readonly days: number;
}

/**
 * Retraining: swap a feat, skill increase, spell or class choice for another, a week or a month of days at a time.
 * The pick changes on the last day, and only the slot's own rules decide what it can become.
 */
@Component({
  selector: 'pio-sheet-retraining',
  imports: [AsyncButton, FormField, Grid, NumberField, OptionPicker, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-retraining.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetRetraining {
  readonly #characters = inject(CharacterStore);
  readonly #sheet = inject(SheetState);
  readonly #i18n = inject(TranslocoService);
  readonly #messages = injectTranslationChanges();

  /** The pick to retrain and what to retrain it to, while no project is under way. */
  protected readonly slot = signal<string | undefined>(undefined);
  protected readonly target = signal<string | undefined>(undefined);

  protected readonly worked = signal<WorkedModel>({ days: 1 });
  protected readonly workedForm = form(this.worked, (path) => {
    validateStandardSchema(path, WorkedSchema);
  });

  /** The project under way. */
  protected readonly project = computed(() => this.#sheet.character()?.document.build.retraining);

  readonly #content = computed(() => {
    const registry = this.#sheet.registry.data();

    return registry === undefined ? undefined : sheetSlotContent(registry);
  });

  readonly #retrainable = computed(() => {
    const content = this.#content();
    const slots = this.#characters.slots();

    return content === undefined || slots === undefined ? [] : retrainableSlots(slots, content);
  });

  protected readonly slotOptions: Signal<readonly SelectOption<string>[]> = computed(() => {
    this.#messages();

    return this.#retrainable().map(({ key, label, holds }) => ({
      value: key,
      label: `${this.#words(label)}: ${holds}`,
    }));
  });

  protected readonly targetOptions: Signal<readonly SelectOption<string>[]> = computed(() => {
    const character = this.#sheet.character();
    const content = this.#content();
    const slot = this.#characters.slots()?.find(({ key }) => key === this.slot());

    return character === undefined || content === undefined || slot === undefined
      ? []
      : retrainTargets({ character, content, slot });
  });

  /** What the project retrains, in words: the slot, the pick it holds and the pick it becomes. */
  protected readonly projectLine: Signal<string | undefined> = computed(() => {
    this.#messages();
    const project = this.project();
    const held = this.#retrainable().find(({ key }) => key === project?.slot);

    return project === undefined
      ? undefined
      : this.#i18n.translate('character.sheet.retraining.project', {
          slot: held === undefined ? project.slot : this.#words(held.label),
          from: held?.holds ?? '',
          to: project.to,
          done: project.daysDone,
          needed: project.daysNeeded,
        });
  });

  #words({ key, params }: MessageDescriptor): string {
    const words: string = this.#i18n.translate(key, params);

    return words;
  }

  protected pickSlot(slot: string | undefined): void {
    this.slot.set(slot);
    this.target.set(undefined);
  }

  protected readonly start = async (): Promise<void> => {
    const slot = this.slot();
    const to = this.target();

    if (slot === undefined || to === undefined) {
      return;
    }

    await this.#characters.patch({
      field: CharacterPatchField.StartRetraining,
      slot: SlotKey.parse(slot),
      to: ChoiceValue.parse(to),
    });
    this.slot.set(undefined);
    this.target.set(undefined);
  };

  protected readonly work = async (): Promise<void> => {
    const { days } = WorkedSchema.parse(this.worked());

    await this.#characters.patch({ field: CharacterPatchField.WorkRetraining, days });
  };

  protected readonly cancel = async (): Promise<void> => {
    await this.#characters.patch({ field: CharacterPatchField.CancelRetraining });
  };

  /** The server's reason (a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: Error): string => {
    const { key, params } = describeSaveError(error);

    return this.#i18n.translate(key, params);
  };
}
