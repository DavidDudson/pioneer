import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';
import { EntryHover } from '@pioneer/rules/ui';

import { FEAT_DISPLAY_MESSAGES, FEAT_GROUP_MESSAGES } from '../sheet-feat-groups';
import type { SheetFeatGroup } from '../sheet-feat-groups';

/** The feats of one slot type (#487): each with the level it was taken at, its display category and a note. */
@Component({
  selector: 'pio-sheet-feat-group',
  imports: [Badge, EntryHover, Heading, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-feat-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetFeatGroupList {
  public readonly group = input.required<SheetFeatGroup>();

  protected readonly displayMessages = FEAT_DISPLAY_MESSAGES;
  protected readonly heading = computed(() => FEAT_GROUP_MESSAGES[this.group().category]);
}
