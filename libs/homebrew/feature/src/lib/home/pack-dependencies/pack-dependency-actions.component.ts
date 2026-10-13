import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AsyncButton, Badge } from '@pioneer/frontier';
import type { PackSummary } from '@pioneer/homebrew/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { ApiError } from '@pioneer/shared/web';

import { HomebrewStore } from '../../data/homebrew-store';

/**
 * What sits beside a dependency in the list: that it is official, and for the pack's owner a button to remove it.
 * Removing acts on the first press, since adding the pack back is one pick; the server refuses a removal that
 * entries still rely on and its reason shows beside the button.
 */
@Component({
  selector: 'pio-pack-dependency-actions',
  imports: [AsyncButton, Badge, TranslocoPipe],
  templateUrl: './pack-dependency-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackDependencyActions {
  public readonly packId = input.required<ContentPackId>();
  public readonly dependency = input.required<PackSummary>();
  public readonly editable = input.required<boolean>();

  readonly #store = inject(HomebrewStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly remove = async (): Promise<void> => {
    await this.#store.removeDependency(this.packId(), this.dependency().id);
  };

  /** The server's own reason when it gave one the viewer can act on (a 409), else a general failure. */
  protected readonly describeRemoveError = (error: unknown): string => {
    if (ApiError.isConflict(error)) {
      const { key, params } = ApiError.describe(error);
      return this.#i18n.translate(key, params);
    }
    return this.#i18n.translate('homebrew.dependencies.removeFailed');
  };
}
