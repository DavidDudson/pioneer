import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  untracked,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  EmptyState,
  Field,
  FieldError,
  FieldHint,
  Heading,
  Label,
  LocaleFormat,
  NumberInput,
  Stack,
  Text,
} from '@pioneer/frontier';
import type { ReferencePath } from '@pioneer/rules/formula';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { FormulaCheck } from '../formula-check';
import { referenceMeaning } from '../reference-meaning';
import { entryFor, REFERENCE_VALUE_MAX, REFERENCE_VALUE_MIN, usableValue } from '../reference-values';
import type { ReferenceEntries, ReferenceEntry } from '../reference-values';
import { CheckStatus } from '../rules-check';

interface ReferenceRow {
  readonly path: ReferencePath;
  readonly entry: ReferenceEntry;
  readonly invalid: boolean;
  /** What the reference reads, or that stored formulas cannot use it. */
  readonly meaning: MessageDescriptor;
}

interface ValueRangeParams {
  readonly minimum: string;
  readonly maximum: string;
}

/** A number box for each reference in a formula, so the formula can be evaluated with those values. */
@Component({
  selector: 'pio-formula-references',
  imports: [EmptyState, Field, FieldError, FieldHint, Heading, Label, NumberInput, Stack, Text, TranslocoPipe],
  templateUrl: './formula-references.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormulaReferences {
  readonly #format = inject(LocaleFormat);
  /** The formula check whose references get a box each. */
  public readonly check = input.required<FormulaCheck>();
  /** What has been typed per path; a path without an entry has its starting value. */
  public readonly entries = model.required<ReferenceEntries>();

  /**
   * Each reference path once, in the order first written. While the formula does not parse (mid-typing), the
   * last parsed list is kept, so the boxes stay put and keep what they hold.
   */
  protected readonly references = linkedSignal<FormulaCheck, readonly ReferencePath[]>({
    source: this.check,
    computation: (check, previous) => (check.status === CheckStatus.Valid ? check.references : (previous?.value ?? [])),
  });

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
      return { path, entry, invalid: usableValue(entry) === undefined, meaning: referenceMeaning(path) };
    });
  });

  public constructor() {
    /*
     * A box made again for a path shows its last whole number, so an emptied box's entry must not outlive
     * its row. Incomplete entries for paths that leave the formula are dropped.
     */
    effect(() => {
      const shown = new Set(this.references());
      const entries = untracked(this.entries);
      const kept = [...entries].filter(([path, entry]) => entry.complete || shown.has(path));
      if (kept.length !== entries.size) {
        this.entries.set(new Map(kept));
      }
    });
  }

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
