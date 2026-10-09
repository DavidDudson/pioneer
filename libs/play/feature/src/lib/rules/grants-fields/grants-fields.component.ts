import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Field, FieldError, FieldHint, Label, LocaleFormat, Stack, TextArea } from '@pioneer/frontier';

import { GrantsStatus } from '../grants-check';
import type { GrantsCheck } from '../grants-check';
import { CheckStatus } from '../rules-check';
import type { JsonProblem } from '../rules-check';

const ENTRY_ROWS = 16;
const ROOT_ROWS = 4;
const FACT_ROWS = 4;

/** The grants tool's inputs, each with its own problem: the entries as JSON, the roots and the roll options. */
@Component({
  selector: 'pio-grants-fields',
  imports: [Field, FieldError, FieldHint, Label, Stack, TextArea, TranslocoPipe],
  templateUrl: './grants-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrantsFields {
  readonly #format = inject(LocaleFormat);
  protected readonly CheckStatus = CheckStatus;
  protected readonly entryRows = ENTRY_ROWS;
  protected readonly rootRows = ROOT_ROWS;
  protected readonly factRows = FACT_ROWS;
  public readonly check = input.required<GrantsCheck>();
  public readonly entries = model.required<string>();
  public readonly roots = model.required<string>();
  public readonly facts = model.required<string>();

  protected readonly entriesProblem = computed((): JsonProblem | undefined => {
    const result = this.check();
    return result.status === GrantsStatus.Problems ? result.entries : undefined;
  });

  protected readonly badRoots = computed((): readonly number[] => {
    const result = this.check();
    return result.status === GrantsStatus.Problems ? result.rootLines : [];
  });

  protected readonly badFacts = computed((): readonly number[] => {
    const result = this.check();
    return result.status === GrantsStatus.Problems ? result.factLines : [];
  });

  /** Line numbers as a list in the UI locale ("2, 4 and 7"). */
  protected lineList(lines: readonly number[]): string {
    this.#format.locale();
    return this.#format.list(lines.map((line) => this.#format.number(line)));
  }
}
