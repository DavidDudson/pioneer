import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Field, FieldError, FieldHint, Label, NumberInput, Select, Stack, TextArea } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { LEVEL_MAX, LEVEL_MIN } from '@pioneer/rules/sdk';

import { withPick } from '../grant-choices';
import { GrantsStatus } from '../grants-check';
import type { GrantsCheck } from '../grants-check';
import { LinesField } from '../lines-field/lines-field.component';
import { CheckStatus } from '../rules-check';
import type { JsonProblem } from '../rules-check';

const ENTRY_ROWS = 16;
const ROOT_ROWS = 4;
const PICK_ROWS = 3;
const TOGGLE_ROWS = 2;

/** What each line field says of lines that do not read; each message takes `count` and `lines`. */
const LINE_ERRORS = {
  roots: 'play.rules.badRoots',
  picks: 'play.rules.badPicks',
  toggles: 'play.rules.badToggles',
  facts: 'play.rules.badFacts',
} as const;
const FACT_ROWS = 4;

/** An open slot as the fields offer it: its slot as typed, what it asks, and its options. */
interface OpenSlot {
  readonly slot: string;
  readonly title: string;
  readonly options: readonly SelectOption<string>[];
}

/**
 * The grants tool's inputs, each with its own problem: the entries as JSON, the roots, the level, the picks, the
 * toggles and the roll options. Each open slot with something to pick gets a select that writes its pick; one with nothing on offer (a query
 * that matches nothing, or listed options whose predicates are all false) says so in the result instead.
 */
@Component({
  selector: 'pio-grants-fields',
  imports: [Field, FieldError, FieldHint, Label, LinesField, NumberInput, Select, Stack, TextArea, TranslocoPipe],
  templateUrl: './grants-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrantsFields {
  protected readonly CheckStatus = CheckStatus;
  protected readonly entryRows = ENTRY_ROWS;
  protected readonly rootRows = ROOT_ROWS;
  protected readonly pickRows = PICK_ROWS;
  protected readonly toggleRows = TOGGLE_ROWS;
  protected readonly lineErrors = LINE_ERRORS;
  protected readonly levelRange = { min: LEVEL_MIN, max: LEVEL_MAX };
  protected readonly factRows = FACT_ROWS;
  public readonly check = input.required<GrantsCheck>();
  public readonly entries = model.required<string>();
  public readonly roots = model.required<string>();
  public readonly picks = model.required<string>();
  public readonly toggles = model.required<string>();
  public readonly level = model.required<number>();
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

  protected readonly badToggles = computed((): readonly number[] => {
    const result = this.check();
    return result.status === GrantsStatus.Problems ? result.toggleLines : [];
  });

  protected readonly badLevel = computed((): boolean => {
    const result = this.check();
    return result.status === GrantsStatus.Problems && result.badLevel;
  });

  protected readonly openSlots = computed((): readonly OpenSlot[] => {
    const result = this.check();
    return result.status === GrantsStatus.Valid
      ? result.open
          .filter((open) => open.options.length > 0)
          .map(({ slot, title, options }) => ({ slot, title, options }))
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
}
