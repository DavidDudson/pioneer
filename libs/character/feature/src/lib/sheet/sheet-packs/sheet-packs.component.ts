import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucidePackage } from '@lucide/angular';
import { AsyncData, AsyncPending, AsyncRegion, EmptyState, List, Message, Skeleton, Stack } from '@pioneer/frontier';
import type { ContentPackId } from '@pioneer/rules/sdk';

import { CharacterPackStore } from '../../data/character-pack-store';
import { SheetPackPicker } from './sheet-pack-picker.component';
import { SheetPackRow } from './sheet-pack-row.component';

/** Skeleton rows shown while the packs load. */
const PLACEHOLDERS = ['first', 'second'] as const;

/**
 * The packs the open character uses: the official ones, always on, and the homebrew ones in force. A character outside
 * campaigns has its owner choose them, here; one in a campaign uses the campaign's, so the list is read-only and says
 * which campaign decides. A pack an enabled pack extends stays on, and says which pack needs it.
 */
@Component({
  selector: 'pio-sheet-packs',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    EmptyState,
    List,
    Message,
    SheetPackPicker,
    SheetPackRow,
    Skeleton,
    Stack,
    TranslocoPipe,
  ],
  templateUrl: './sheet-packs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetPacks {
  protected readonly store = inject(CharacterPackStore);

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly emptyIcon = LucidePackage;
  /** Packs disabled since the list loaded. Their rows stay, marked, until it next loads. */
  protected readonly disabled = signal<ReadonlySet<ContentPackId>>(new Set());

  /** A pack disabled from its row is marked there. */
  protected turnedOff(packId: ContentPackId): void {
    this.disabled.update((disabled) => new Set([...disabled, packId]));
  }

  /** A pack enabled again is no longer disabled. */
  protected reenabled(packId: ContentPackId): void {
    this.disabled.update((disabled) => new Set([...disabled].filter((id) => id !== packId)));
  }
}
