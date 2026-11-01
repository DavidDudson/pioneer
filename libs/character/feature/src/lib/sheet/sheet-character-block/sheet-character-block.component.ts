import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CharacterAvatar, Skeleton, Stack, Surface, Text } from '@pioneer/frontier';

import { SheetState } from '../sheet-state';

/**
 * The character at the top of the sheet: an empty circular portrait (the upload is its own story), the name, and the
 * "Level 11 Goloma Animist" line under it. The portrait carries no Hit Point arc: the Hit Points block shows those.
 */
@Component({
  selector: 'pio-sheet-character-block',
  imports: [CharacterAvatar, Skeleton, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './sheet-character-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetCharacterBlock {
  protected readonly sheet = inject(SheetState);
  protected readonly character = this.sheet.character;
  protected readonly identity = this.sheet.identity;
}
