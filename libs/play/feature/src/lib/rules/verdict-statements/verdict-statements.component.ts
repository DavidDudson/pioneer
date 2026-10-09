import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, List, ListItem, Stack, Text } from '@pioneer/frontier';

import { TRUTH_KEYS, TRUTH_TONES } from '../predicate-verdict';
import type { VerdictNode } from '../predicate-verdict';

/** Statements with their verdicts, each followed by the statements inside it, nested to any depth. */
@Component({
  selector: 'pio-verdict-statements',
  imports: [Badge, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './verdict-statements.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerdictStatements {
  protected readonly TRUTH_KEYS = TRUTH_KEYS;
  protected readonly TRUTH_TONES = TRUTH_TONES;
  public readonly nodes = input.required<readonly VerdictNode[]>();
}
