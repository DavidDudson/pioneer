import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Character } from '@pioneer/character/domain';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  DateDisplay,
  EmptyState,
  Link,
  Page,
  PageBody,
  PageHeader,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';
import { VirtualItem, VirtualList } from '@pioneer/frontier/data';
import { Users } from 'lucide';
import { from } from 'rxjs';

import { AncestryOptions } from '../../data/ancestry-options';
import { CHARACTER_LIST_EXTRAS } from '../../data/character-list-extras';
import { injectCharacterList } from '../../data/character-list-query';

/** Skeleton cards shown while the list loads. */
const PLACEHOLDERS = ['first', 'second', 'third'] as const;

const characterKey = (character: Character): string => character.id;

@Component({
  selector: 'pio-character-list-page',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    DateDisplay,
    EmptyState,
    Link,
    NgComponentOutlet,
    Page,
    PageBody,
    PageHeader,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
    VirtualItem,
    VirtualList,
  ],
  templateUrl: './character-list-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterListPage {
  protected readonly characters = injectCharacterList();
  protected readonly ancestries = inject(AncestryOptions);
  readonly #extraLoaders = inject(CHARACTER_LIST_EXTRAS);
  readonly #extrasLoaded = Promise.all(this.#extraLoaders.map(async (load) => load()));
  /** Loaded on demand: empty in production, the sample imports in development. */
  protected readonly extras = toSignal(from(this.#extrasLoaded), { initialValue: [] });

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly emptyIcon = Users;

  protected readonly characterKey = characterKey;
}
