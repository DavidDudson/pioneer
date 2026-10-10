import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Field, FieldError, FieldHint, Label, Stack, TextArea, TextInput } from '@pioneer/frontier';

import { FiltersStatus } from '../filters-check';
import type { FiltersCheck } from '../filters-check';
import { CheckStatus } from '../rules-check';
import type { JsonProblem } from '../rules-check';

const ENTRY_ROWS = 16;

/** The filters tool's inputs: the entries as a JSON array and the query, as it would follow `?` in a URL. */
@Component({
  selector: 'pio-filters-fields',
  imports: [Field, FieldError, FieldHint, Label, Stack, TextArea, TextInput, TranslocoPipe],
  templateUrl: './filters-fields.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersFields {
  protected readonly CheckStatus = CheckStatus;
  protected readonly entryRows = ENTRY_ROWS;
  public readonly check = input.required<FiltersCheck>();
  public readonly entries = model.required<string>();
  public readonly query = model.required<string>();

  protected readonly entriesProblem = computed((): JsonProblem | undefined => {
    const result = this.check();
    return result.status === FiltersStatus.Problems ? result.entries : undefined;
  });
}
