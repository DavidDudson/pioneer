import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Field, FieldError, Heading, Label, LocaleFormat, NumberInput, Stack, Text } from '@pioneer/frontier';
import type { ReferencePath } from '@pioneer/rules/formula';

import { entryFor, REFERENCE_VALUE_MAX, REFERENCE_VALUE_MIN, usableValue } from '../reference-values';
import type { ReferenceEntries, ReferenceEntry } from '../reference-values';

interface ReferenceRow {
  readonly path: ReferencePath;
  readonly entry: ReferenceEntry;
  readonly invalid: boolean;
}

interface ValueRangeParams {
  readonly minimum: string;
  readonly maximum: string;
}

/** A number box for each reference in a formula, so the formula can be evaluated with those values. */
@Component({
  selector: 'pio-formula-references',
  imports: [Field, FieldError, Heading, Label, NumberInput, Stack, Text, TranslocoPipe],
  templateUrl: './formula-references.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaReferences {
  readonly #format = inject(LocaleFormat);
  /** Each reference path once, in the order first written. */
  public readonly references = input.required<readonly ReferencePath[]>();
  /** What has been typed per path; a path without an entry has its starting value. */
  public readonly entries = model.required<ReferenceEntries>();

  protected readonly valueMin = REFERENCE_VALUE_MIN;
  protected readonly valueMax = REFERENCE_VALUE_MAX;
  protected readonly valueRange = computed((): ValueRangeParams => ({
    minimum: this.#format.number(REFERENCE_VALUE_MIN),
    maximum: this.#format.number(REFERENCE_VALUE_MAX),
  }));
  protected readonly rows = computed((): readonly ReferenceRow[] => {
    const entries = this.entries();
    return this.references().map((path) => {
      const entry = entryFor(entries, path);
      return { path, entry, invalid: usableValue(entry) === undefined };
    });
  });

  protected setValue(path: ReferencePath, value: number): void {
    this.#update(path, { ...entryFor(this.entries(), path), value });
  }

  protected setComplete(path: ReferencePath, complete: boolean): void {
    this.#update(path, { ...entryFor(this.entries(), path), complete });
  }

  #update(path: ReferencePath, entry: ReferenceEntry): void {
    this.entries.update((entries) => new Map(entries).set(path, entry));
  }
}
