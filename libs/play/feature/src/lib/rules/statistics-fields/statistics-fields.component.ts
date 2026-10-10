import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Field, FieldError, FieldHint, Label, LocaleFormat, Stack, TextArea, ToggleButton } from '@pioneer/frontier';

import { JsonField } from '../json-field/json-field.component';
import type { JsonProblem } from '../rules-check';
import { StatisticsStatus } from '../statistics-check';
import type { StatisticsCheck } from '../statistics-check';

const DEFINITION_ROWS = 16;
const INPUT_ROWS = 8;
const FACT_ROWS = 4;

/** The problems of each JSON text, none while everything reads. */
type Problems = Readonly<Record<'definitions' | 'inputs' | 'rules' | 'overrides', JsonProblem | undefined>>;

const NO_PROBLEMS: Problems = { definitions: undefined, inputs: undefined, rules: undefined, overrides: undefined };

/**
 * The statistics tool's inputs, each with its own problem: the definitions, the character's inputs, the rule
 * elements and the overrides as JSON, the roll options their predicates read, and whether Proficiency Without Level
 * is on.
 */
@Component({
  selector: 'pio-statistics-fields',
  imports: [Field, FieldError, FieldHint, JsonField, Label, Stack, TextArea, ToggleButton, TranslocoPipe],
  templateUrl: './statistics-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsFields {
  readonly #format = inject(LocaleFormat);
  protected readonly definitionRows = DEFINITION_ROWS;
  protected readonly inputRows = INPUT_ROWS;
  protected readonly factRows = FACT_ROWS;
  public readonly check = input.required<StatisticsCheck>();
  public readonly definitions = model.required<string>();
  public readonly inputs = model.required<string>();
  public readonly rules = model.required<string>();
  public readonly overrides = model.required<string>();
  public readonly facts = model.required<string>();
  /** Whether Proficiency Without Level is on. */
  public readonly withoutLevel = model.required<boolean>();
  /** The proficiency rules failed to load, so nothing derives and the variant cannot be turned on. */
  public readonly proficiencyFailed = input(false);

  protected readonly problems = computed((): Problems => {
    const result = this.check();
    return result.status === StatisticsStatus.Problems ? result : NO_PROBLEMS;
  });

  /** The roll option lines that are not roll options; empty when there are none. */
  protected readonly badLines = computed((): readonly number[] => {
    const result = this.check();
    return result.status === StatisticsStatus.Problems ? result.factLines : [];
  });

  /** Those lines as a list in the UI locale ("2, 4 and 7"). */
  protected readonly badLineList = computed((): string => {
    this.#format.locale();
    return this.#format.list(this.badLines().map((line) => this.#format.number(line)));
  });
}
