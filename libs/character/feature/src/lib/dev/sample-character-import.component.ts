import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SheetMode } from '@pioneer/character/domain';
import { AsyncButton } from '@pioneer/frontier';
import { loadSampleExport, SampleCharacter } from '@pioneer/interop/pathbuilder';

import { CharacterStore } from '../data/character-store';

/**
 * One-click imports of the bundled sample characters, shown on the character list in development builds only
 * (`CHARACTER_LIST_EXTRAS`). A click imports the export and opens the new character on Plan, where its import
 * report shows.
 */
@Component({
  selector: 'pio-sample-character-import',
  imports: [AsyncButton, TranslocoPipe],
  templateUrl: './sample-character-import.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleCharacterImport {
  readonly #store = inject(CharacterStore);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #i18n = inject(TranslocoService);

  protected readonly importMordred = async (): Promise<void> => this.#import(SampleCharacter.Mordred);
  protected readonly importBriarRose = async (): Promise<void> => this.#import(SampleCharacter.BriarRose);
  protected readonly describeError = (): string => this.#i18n.translate('character.list.importSampleFailed');

  readonly #import = async (sample: SampleCharacter): Promise<void> => {
    const raw = await loadSampleExport(sample);
    const character = await this.#store.importPathbuilder(raw);
    await this.#router.navigate([character.id, SheetMode.Plan], { relativeTo: this.#route });
  };
}
