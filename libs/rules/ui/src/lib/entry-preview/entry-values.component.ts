import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { List, ListItem, Stack, Text } from '@pioneer/frontier';
import type { ConditionStage, ConditionValue, ConditionValues, RichText } from '@pioneer/rules/sdk';

import { RichTextView } from '../rich-text/rich-text.component';
import { EntryPreviewMessage } from './entry-preview-messages';

/** A stage with how its label and list item mark whether it is the one held. */
interface StageRow {
  readonly stage: ConditionStage;
  readonly current: 'true' | undefined;
  readonly weight: 'bold' | 'medium';
}

/**
 * What each value of a valued condition means: a list of its stages with the one held marked, or, for a condition whose
 * effect scales with the value, the rule once. Presentational: the caller passes the condition's `values`.
 *
 * ```html
 * <pio-entry-values [values]="preview.values" [current]="preview.value" />
 * ```
 */
@Component({
  selector: 'pio-entry-values',
  imports: [List, ListItem, RichTextView, Stack, Text, TranslocoPipe],
  templateUrl: './entry-values.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[hidden]': 'none()' },
})
export class EntryValuesView {
  public readonly values = input<ConditionValues | undefined>();
  /** The value held or named; its stage is marked. */
  public readonly current = input<ConditionValue | undefined>();

  protected readonly none = computed((): boolean => this.values() === undefined);

  /** The stages of a staged condition, each marked when it is the value held; none for a formula. */
  protected readonly rows = computed((): readonly StageRow[] => {
    const values = this.values();
    const held = this.current();
    return values?.kind === 'staged'
      ? values.stages.map((stage) =>
          stage.value === held
            ? { stage, current: 'true', weight: 'bold' }
            : { stage, current: undefined, weight: 'medium' },
        )
      : [];
  });

  /** The rule of a formula condition; none for a staged one. */
  protected readonly rule = computed((): RichText | undefined => {
    const values = this.values();
    return values?.kind === 'formula' ? values.text : undefined;
  });

  protected readonly Message = EntryPreviewMessage;
}
