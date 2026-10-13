import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RestCommandField } from '@pioneer/character/domain';
import type { RestCommand } from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Button,
  ButtonVariant,
  Skeleton,
  Stack,
  Text,
} from '@pioneer/frontier';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';
import { describeSaveError } from '../sheet-field';
import { restLines } from '../sheet-rest';
import type { RestLine } from '../sheet-rest';
import { SheetState } from '../sheet-state';

/** One action the player can run, with the words that name it and its preview. */
interface RestAction {
  readonly command: RestCommand;
  readonly labelKey: string;
  readonly previewKey: string;
}

const ACTIONS: readonly RestAction[] = [
  {
    command: { field: RestCommandField.Rest },
    labelKey: 'character.sheet.rest.restAction',
    previewKey: 'character.sheet.rest.restPreview',
  },
  {
    command: { field: RestCommandField.DailyPreparations },
    labelKey: 'character.sheet.rest.dailyPreparationsAction',
    previewKey: 'character.sheet.rest.dailyPreparationsPreview',
  },
  {
    command: { field: RestCommandField.Refocus },
    labelKey: 'character.sheet.rest.refocusAction',
    previewKey: 'character.sheet.rest.refocusPreview',
  },
  {
    command: { field: RestCommandField.StartSession },
    labelKey: 'character.sheet.rest.startSessionAction',
    previewKey: 'character.sheet.rest.startSessionPreview',
  },
];

/** What an action chosen but not yet confirmed would do. */
interface RestPreview {
  readonly action: RestAction;
  readonly lines: readonly RestLine[];
}

/**
 * Rest, daily preparations, Refocus and start of session (#347). Each is its own optional action: choosing one shows
 * what it would restore, and confirming applies it as one command. Nothing runs on its own, such as when the app
 * opens or a new session of the app starts.
 */
@Component({
  selector: 'pio-sheet-rest',
  imports: [AsyncButton, AsyncData, AsyncPending, AsyncRegion, Button, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-rest.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetRest {
  readonly #i18n = inject(TranslocoService);
  readonly #play = inject(PlayStore);
  readonly #characters = inject(CharacterStore);
  readonly #sheet = inject(SheetState);

  protected readonly actions = ACTIONS;
  protected readonly cancelVariant = ButtonVariant.Ghost;
  protected readonly registry = injectContentRegistry(FEAT_CONTENT_KINDS);
  protected readonly playQuery = this.#play.play;

  /** The action chosen and waiting for its confirmation. */
  readonly #chosen = signal<RestAction | undefined>(undefined);

  /** Whether an edit is in flight: they share one revision, so a second would meet a conflict nothing caused. */
  protected readonly busy = signal(false);

  protected readonly preview = computed((): RestPreview | undefined => {
    const action = this.#chosen();
    const registry = this.registry.data();
    const character = this.#characters.selected();
    const read = this.#play.play.data();
    const hitPoints = this.#sheet.maxHitPoints();
    const resources = this.#sheet.resourceMaxima();
    if (
      action === undefined ||
      registry === undefined ||
      character === undefined ||
      read === undefined ||
      hitPoints === undefined ||
      resources === undefined
    ) {
      return undefined;
    }
    return {
      action,
      lines: restLines({ registry, character, play: read.play, maxima: { hitPoints, resources } }, action.command),
    };
  });

  protected readonly choose =
    (action: RestAction): (() => void) =>
    (): void => {
      this.#chosen.set(action);
    };

  protected readonly cancel = (): void => {
    this.#chosen.set(undefined);
  };

  protected readonly confirm = async (): Promise<void> => {
    const shown = this.preview();
    if (shown === undefined) {
      return;
    }
    this.busy.set(true);
    try {
      await this.#play.send(shown.action.command);
      this.#chosen.set(undefined);
    } finally {
      this.busy.set(false);
    }
  };

  /** The server's reason (a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
