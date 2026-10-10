import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Field, FieldError, FieldHint, Label, LocaleFormat, Select, Stack, TextArea } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';

import { withPick } from '../grant-choices';
import { GrantsStatus } from '../grants-check';
import type { GrantsCheck } from '../grants-check';
import { CheckStatus } from '../rules-check';
import type { JsonProblem } from '../rules-check';

const ENTRY_ROWS = 16;
const ROOT_ROWS = 4;
const PICK_ROWS = 3;
const FACT_ROWS = 4;

/** An open slot as the fields offer it: its slot as typed, what it asks, and its options. */
interface OpenSlot {
  readonly slot: string;
  readonly title: string;
  readonly options: readonly SelectOption<string>[];
}

/**
 * The grants tool's inputs, each with its own problem: the entries as JSON, the roots, the picks and the roll
 * options. Each open slot gets a select that writes its pick.
 */
@Component({
  selector: 'pio-grants-fields',
  imports: [Field, FieldError, FieldHint, Label, Select, Stack, TextArea, TranslocoPipe],
  templateUrl: './grants-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrantsFields {
  readonly #format = inject(LocaleFormat);
  protected readonly CheckStatus = CheckStatus;
  protected readonly entryRows = ENTRY_ROWS;
  protected readonly rootRows = ROOT_ROWS;
  protected readonly pickRows = PICK_ROWS;
  protected readonly factRows = FACT_ROWS;
  public readonly check = input.required<GrantsCheck>();
  public readonly entries = model.required<string>();
  public readonly roots = model.required<string>();
  public readonly picks = model.required<string>();
  public readonly facts = model.required<string>();

  protected readonly entriesProblem = computed((): JsonProblem | undefined => {
    const result = this.check();
    return result.status === GrantsStatus.Problems ? result.entries : undefined;
  });

  protected readonly badRoots = computed((): readonly number[] => {
    const result = this.check();
    return result.status === GrantsStatus.Problems ? result.rootLines : [];
  });

  protected readonly badPicks = computed((): readonly number[] => {
    const result = this.check();
    return result.status === GrantsStatus.Problems ? result.pickLines : [];
  });

  protected readonly openSlots = computed((): readonly OpenSlot[] => {
    const result = this.check();
    return result.status === GrantsStatus.Valid
      ? result.open.map(({ slot, title, options }) => ({ slot, title, options }))
      : [];
  });

  protected readonly badFacts = computed((): readonly number[] => {
    const result = this.check();
    return result.status === GrantsStatus.Problems ? result.factLines : [];
  });

  /** Picks `value` for `slot`, replacing any earlier pick for it. */
  protected answer(slot: string, value: string | undefined): void {
    if (value !== undefined) {
      this.picks.update((text) => withPick(text, slot, value));
    }
  }

  /** Line numbers as a list in the UI locale ("2, 4 and 7"). */
  protected lineList(lines: readonly number[]): string {
    this.#format.locale();
    return this.#format.list(lines.map((line) => this.#format.number(line)));
  }
}
