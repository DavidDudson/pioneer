import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucidePackage } from '@lucide/angular';
import type { EnabledPackId } from '@pioneer/campaign/domain';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  EmptyState,
  Heading,
  List,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';

import { CampaignStore } from '../../data/campaign-store';
import { CampaignPackPicker } from '../campaign-pack-picker/campaign-pack-picker.component';
import { CampaignPackRow } from '../campaign-pack-row/campaign-pack-row.component';

/** Skeleton rows shown while the packs load. */
const PLACEHOLDERS = ['first', 'second'] as const;

/**
 * The packs the open campaign uses: the official ones, always on, and the homebrew ones its GM enabled. Every member
 * reads the list; the GM disables a pack from it and enables another with the picker. A pack an enabled pack extends
 * stays on, and says which pack needs it.
 */
@Component({
  selector: 'pio-campaign-packs',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    CampaignPackPicker,
    CampaignPackRow,
    EmptyState,
    Heading,
    List,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './campaign-packs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignPacksPanel {
  protected readonly store = inject(CampaignStore);

  protected readonly placeholders = PLACEHOLDERS;
  protected readonly emptyIcon = LucidePackage;
  /** Packs disabled since the list loaded. Their rows stay, marked, until it next loads. */
  protected readonly disabled = signal<ReadonlySet<EnabledPackId>>(new Set());

  /** A pack disabled from its row is marked there. */
  protected turnedOff(packId: EnabledPackId): void {
    this.disabled.update((disabled) => new Set([...disabled, packId]));
  }

  /** A pack enabled again is no longer disabled. */
  protected reenabled(packId: EnabledPackId): void {
    this.disabled.update((disabled) => new Set([...disabled].filter((id) => id !== packId)));
  }
}
