import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, Stack, Surface, Text, TextInput } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';

import { OptionPicker } from '../option-picker/option-picker.component';

/** One species the granting feature allows, as the picker lists it. */
export interface CompanionSpeciesOption {
  readonly value: string;
  readonly label: string;
}

/** What the picker hands back: the species picked, by its value, and the name the player gave the companion. */
export interface CompanionPick {
  readonly species: string;
  readonly name: string;
}

/** Message keys the picker renders with, spelled out so the key check sees them. */
const CompanionPickerMessage = {
  Title: 'rules.companion.pickerTitle',
  Species: 'rules.companion.species',
  Name: 'rules.companion.name',
  Confirm: 'rules.companion.confirm',
  Cancel: 'rules.companion.cancel',
} as const;

/**
 * The picker for a companion a feature grants (the druid's Animal order, the ranger's Animal Companion): which species
 * it is, from those the feature allows, and what it is called. Confirming raises the pick; the caller saves it as a
 * build pick (ADR-0080). It cannot be confirmed until a species is picked and the name is not blank.
 *
 * Presentational (ADR-0028): the caller passes the allowed species and saves the pick.
 *
 * ```html
 * <pio-companion-picker [source]="'Animal Companion'" [options]="species()" (confirmed)="save($event)" (cancelled)="close()" />
 * ```
 */
@Component({
  selector: 'pio-companion-picker',
  imports: [Button, OptionPicker, Stack, Surface, Text, TextInput, TranslocoPipe],
  templateUrl: './companion-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanionPicker {
  /** The feature that grants the companion, by name. */
  public readonly source = input.required<string>();
  public readonly options = input.required<readonly CompanionSpeciesOption[]>();
  /** The species picked, by its value; undefined until one is. */
  public readonly picked = model<string | undefined>(undefined);
  public readonly name = model('');
  /** Raised when the pick is confirmed. */
  public readonly confirmed = output<CompanionPick>();
  /** Raised when the choice is given up. */
  public readonly cancelled = output();

  protected readonly Message = CompanionPickerMessage;

  protected readonly selectOptions = computed((): readonly SelectOption<string>[] =>
    this.options().map(({ value, label }) => ({ value, label })),
  );

  protected readonly pick = computed((): CompanionPick | undefined => {
    const species = this.picked();
    const name = this.name().trim();

    return species === undefined || name === '' ? undefined : { species, name };
  });

  protected confirm(): void {
    const pick = this.pick();

    if (pick !== undefined) {
      this.confirmed.emit(pick);
    }
  }
}
