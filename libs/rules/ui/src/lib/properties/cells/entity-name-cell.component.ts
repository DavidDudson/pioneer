import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ContentId } from '@pioneer/rules/sdk';

import { EntryNameCell } from '../../picker-cells/entry-name-cell/entry-name-cell.component';
import type { CommonFacts } from '../common-facts';

/** What the name cell reads, so any row with an id, a name and a place to link to can use it. */
export type NamedEntity = Pick<CommonFacts, 'id' | 'name' | 'entry' | 'to'>;

/**
 * The name column of any entry: its name as a link to its page when it has one, previewing the entry its id names.
 *
 * ```html
 * <pio-entity-name-cell [entity]="row" />
 * ```
 */
@Component({
  selector: 'pio-entity-name-cell',
  imports: [EntryNameCell],
  templateUrl: './entity-name-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityNameCell {
  public readonly entity = input.required<NamedEntity>();

  protected readonly entry = computed((): ContentId | undefined => {
    const { entry, id } = this.entity();

    return entry ?? ContentId.safeParse(id).data;
  });
}
