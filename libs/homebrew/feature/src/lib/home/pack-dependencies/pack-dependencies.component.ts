import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucidePackage } from '@lucide/angular';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  EmptyState,
  Heading,
  List,
  ListItem,
  Skeleton,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';
import type { ContentPackId } from '@pioneer/rules/sdk';

import { HomebrewStore } from '../../data/homebrew-store';
import { PackDependencyActions } from './pack-dependency-actions.component';
import { PackDependencyAdder } from './pack-dependency-adder.component';

/** Skeleton rows shown while the dependencies load. */
const PLACEHOLDERS = ['first', 'second'] as const;

/**
 * The packs the open pack extends, and for its owner a picker to add more. A pack may reference anything in the
 * packs it extends and nothing else.
 */
@Component({
  selector: 'pio-pack-dependencies',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    EmptyState,
    Heading,
    List,
    ListItem,
    PackDependencyActions,
    PackDependencyAdder,
    Skeleton,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './pack-dependencies.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackDependenciesPanel {
  /** The open pack. */
  public readonly packId = input.required<ContentPackId>();

  protected readonly store = inject(HomebrewStore);
  protected readonly placeholders = PLACEHOLDERS;
  protected readonly emptyIcon = LucidePackage;
}
