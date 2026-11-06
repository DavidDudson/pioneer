import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  CHARACTER_LEVEL_MAX,
  CHARACTER_LEVEL_MIN,
  CharacterLevel,
  CharacterPatchField,
  DEATH_VALUE_MAX,
} from '@pioneer/character/domain';
import {
  Badge,
  Button,
  CharacterAvatar,
  InlineField,
  Modal,
  NumberInput,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';
import { ConditionBadge } from '@pioneer/rules/ui';

import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { CONDITION_CONTENT_KINDS, conditionSlugs } from '../sheet-conditions';
import { sheetField } from '../sheet-field';
import { hitPointsView } from '../sheet-hit-points/hit-points-view';
import { SheetHitPoints } from '../sheet-hit-points/sheet-hit-points.component';
import { SheetState } from '../sheet-state';

/**
 * The character at the left of the sheet's header: the same avatar the party shows (#1743), with its Hit Point arc,
 * wounds, death track and the worst of its conditions, and the "Level 11 Goloma Animist" line below it. Pressing the
 * avatar opens the Hit Points modal, which also holds the level editor; the level shows as a badge at the avatar's
 * top right. The name is
 * the avatar's own; the page header keeps it as the page's heading for screen readers.
 */
@Component({
  selector: 'pio-sheet-character-block',
  imports: [
    Badge,
    Button,
    CharacterAvatar,
    ConditionBadge,
    InlineField,
    Modal,
    NumberInput,
    SheetHitPoints,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './sheet-character-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SheetCharacterBlock {
  readonly #play = inject(PlayStore);
  readonly #registry = injectContentRegistry(CONDITION_CONTENT_KINDS);

  protected readonly sheet = inject(SheetState);
  protected readonly character = this.sheet.character;
  protected readonly identity = this.sheet.identity;
  protected readonly levelMin = CHARACTER_LEVEL_MIN;
  protected readonly levelMax = CHARACTER_LEVEL_MAX;
  protected readonly level = sheetField<number>(this.sheet.character, {
    read: (character) => character.level,
    empty: CHARACTER_LEVEL_MIN,
    schema: CharacterLevel,
    save: async (value) =>
      this.sheet.store.patch({ field: CharacterPatchField.Level, value: CharacterLevel.parse(value) }),
  });
  /** Whether the Hit Points modal is open. */
  protected readonly open = signal(false);

  protected readonly hp = computed(() => hitPointsView(this.sheet.maxHitPoints(), this.#play.play.data()?.play.hp));
  /** The dying value, a dead character at the highest; undefined while not dying. */
  protected readonly failedSaves = computed(() => {
    const play = this.#play.play.data()?.play;
    if (play === undefined) {
      return undefined;
    }
    if (play.dead) {
      return DEATH_VALUE_MAX;
    }
    return play.dying > 0 ? play.dying : undefined;
  });
  protected readonly conditions = computed((): readonly string[] => {
    const registry = this.#registry.data();
    const play = this.#play.play.data()?.play;
    return registry === undefined || play === undefined ? [] : conditionSlugs(registry, play);
  });
}
