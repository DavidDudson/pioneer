import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import type { SheetMode } from '@pioneer/character/domain';
import { Skeleton, Stack } from '@pioneer/frontier';
import { filter, switchMap, take } from 'rxjs';

import { CharacterStore } from '../../data/character-store';

/**
 * The character's own address, with no tab named: shows the shape of a tab while the tab the user last had open is
 * read, then replaces the address with that tab's, so Back skips this step. Not a route resolver: the header renders
 * meanwhile.
 */
@Component({
  selector: 'pio-sheet-mode-redirect',
  imports: [Skeleton, Stack],
  templateUrl: './sheet-mode-redirect.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetModeRedirect {
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  public constructor() {
    toObservable(inject(CharacterStore).rememberedSheetMode)
      .pipe(
        filter((mode): mode is SheetMode => mode !== undefined),
        take(1),
        switchMap(async (mode) => this.#router.navigate([mode], { relativeTo: this.#route, replaceUrl: true })),
        takeUntilDestroyed(),
      )
      .subscribe();
  }
}
