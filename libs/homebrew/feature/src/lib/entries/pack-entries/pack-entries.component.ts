import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  EmptyState,
  EmptyStateMedia,
  EmptyStateTitle,
  Heading,
  List,
  ListItem,
  Skeleton,
  Stack,
  Surface,
  Text,
  ToggleButton,
} from '@pioneer/frontier';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { BookOpen } from 'lucide';

import { KIND_MESSAGES, RARITY_MESSAGES } from '../../data/entry-messages';
import { HomebrewStore } from '../../data/homebrew-store';
import { PackEntryActions } from './pack-entry-actions.component';
import { PackEntryCreate } from './pack-entry-create.component';

/** Skeleton rows shown while the entries load. */
const PLACEHOLDERS = ['first', 'second'] as const;

/**
 * The open pack's entries, with the author's tools: start one, edit one, archive or restore one. Entries are never
 * deleted (ADR-0062); an archived one is kept, hidden from the list unless asked for, and in force nowhere.
 */
@Component({
  selector: 'pio-pack-entries',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    EmptyState,
    EmptyStateMedia,
    EmptyStateTitle,
    Heading,
    List,
    ListItem,
    PackEntryActions,
    PackEntryCreate,
    Skeleton,
    Stack,
    Surface,
    Text,
    ToggleButton,
    TranslocoPipe,
  ],
  templateUrl: './pack-entries.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackEntries {
  /** The open pack. */
  public readonly packId = input.required<ContentPackId>();

  protected readonly store = inject(HomebrewStore);
  protected readonly placeholders = PLACEHOLDERS;
  protected readonly emptyIcon = BookOpen;
  protected readonly kindMessages = KIND_MESSAGES;
  protected readonly rarityMessages = RARITY_MESSAGES;
}
