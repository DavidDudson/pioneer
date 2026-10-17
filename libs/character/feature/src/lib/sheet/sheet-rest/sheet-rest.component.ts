import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { INVENTORY_KINDS, RestCommandField } from '@pioneer/character/domain';
import type { PreparedPick, RestCommand } from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Button,
  ButtonVariant,
  Select,
  Skeleton,
  Stack,
  Text,
} from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import type { ContentKind } from '@pioneer/rules/sdk';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { PlayStore } from '../../data/play-store';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';
import { describeSaveError } from '../sheet-field';
import { sheetPreparedSlots, SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';
import { restLines } from '../sheet-rest';
import type { RestLine } from '../sheet-rest';
import { preparedLines, preparedPicks, restPreparedEntries } from '../sheet-rest-prepared';
import type { RestPreparedEntry } from '../sheet-rest-prepared';
import { SheetRestPrepared } from '../sheet-rest-prepared/sheet-rest-prepared.component';
import type { StagedSpell } from '../sheet-rest-prepared/sheet-rest-prepared.component';
import { sheetSlotContent } from '../sheet-slot-content';
import { sheetStaffLimits, staffOptions, staffSlotOptions } from '../sheet-staff';
import type { StaffOption, StaffSlotOption } from '../sheet-staff';
import { SheetState } from '../sheet-state';

/** The kinds the actions read: the character's, so its slots resolve, and the items it carries, so its staves do. */
const REST_CONTENT_KINDS: readonly ContentKind[] = [...FEAT_CONTENT_KINDS, ...INVENTORY_KINDS];

/** The value of the option that picks nothing. */
const NONE = 'none';

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
  /** The command to run on confirm: the action's own, with the staff and slot chosen for daily preparations. */
  readonly command: RestCommand;
  readonly lines: readonly RestLine[];
}

/**
 * Rest, daily preparations, Refocus and start of session (#347). Each is its own optional action: choosing one shows
 * what it would restore, and confirming applies it as one command. Nothing runs on its own, such as when the app
 * opens or a new session of the app starts. Daily preparations also prepare one staff (#366), and a prepared caster
 * can expend a slot for more charges.
 */
@Component({
  selector: 'pio-sheet-rest',
  imports: [
    AsyncButton,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Button,
    Select,
    SheetRestPrepared,
    Skeleton,
    Stack,
    Text,
    TranslocoPipe,
  ],
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
  protected readonly registry = injectContentRegistry(REST_CONTENT_KINDS);
  protected readonly playQuery = this.#play.play;

  /** The action chosen and waiting for its confirmation. */
  readonly #chosen = signal<RestAction | undefined>(undefined);

  /** The staff and the slot picked for daily preparations: an option's value, or `NONE`. */
  protected readonly staffPicked = signal(NONE);
  protected readonly slotPicked = signal(NONE);

  /** Whether an edit is in flight: they share one revision, so a second would meet a conflict nothing caused. */
  protected readonly busy = signal(false);

  /** The staves daily preparations can prepare, and the slots a prepared caster can expend for charges. */
  readonly #staves = computed((): readonly StaffOption[] => {
    const registry = this.registry.data();
    const character = this.#characters.selected();
    return registry === undefined || character === undefined
      ? []
      : staffOptions(registry, character, sheetStaffLimits(registry, character));
  });
  readonly #slots = computed((): readonly StaffSlotOption[] => {
    const registry = this.registry.data();
    const character = this.#characters.selected();
    return registry === undefined || character === undefined ? [] : staffSlotOptions(registry, character);
  });

  /** Whether daily preparations is chosen and the character has a staff to prepare. */
  protected readonly choosingStaff = computed(
    (): boolean => this.#chosen()?.command.field === RestCommandField.DailyPreparations && this.#staves().length > 0,
  );
  protected readonly staffChoices = computed((): readonly SelectOption<string>[] => [
    { value: NONE, label: this.#i18n.translate('character.sheet.rest.staffNone') },
    ...this.#staves().map(({ id, name }) => ({ value: id, label: name })),
  ]);

  /** The slots on offer once a staff is picked; none for a character without a prepared entry. */
  protected readonly slotChoices = computed((): readonly SelectOption<string>[] =>
    this.staffPicked() === NONE || this.#slots().length === 0
      ? []
      : [
          { value: NONE, label: this.#i18n.translate('character.sheet.rest.slotNone') },
          ...this.#slots().map(({ key, source, rank }) => ({
            value: key,
            label: this.#i18n.translate('character.sheet.rest.slotOption', { source, rank }),
          })),
        ],
  );

  /** Whether daily preparations is chosen. */
  readonly #preparing = computed((): boolean => this.#chosen()?.command.field === RestCommandField.DailyPreparations);

  /** The spells, which load only once daily preparations is chosen. */
  readonly #spells = injectContentRegistry(SPELL_CONTENT_KINDS, () => this.#preparing());

  /** The spells picked in place of the build's, by slot. */
  protected readonly staged = signal<Readonly<Record<string, string>>>({});

  /** The prepared entries' ranks daily preparations can change: none while the spells load. */
  protected readonly preparedEntries = computed((): readonly RestPreparedEntry[] => {
    const registry = this.#spells.data();
    const character = this.#characters.selected();
    const slots = this.#characters.slots();
    return !this.#preparing() || registry === undefined || character === undefined || slots === undefined
      ? []
      : restPreparedEntries(sheetPreparedSlots(registry, character, slots), (key) => this.#i18n.translate(key));
  });

  /** The slots picked other than the spell they already hold, as the command carries them. */
  readonly #picks = computed((): PreparedPick[] => preparedPicks(this.preparedEntries(), this.staged()));

  /** The command the chosen action runs: daily preparations carry the staff and the slot picked, and the spells changed. */
  readonly #command = computed((): RestCommand | undefined => {
    const action = this.#chosen();
    if (action?.command.field !== RestCommandField.DailyPreparations) {
      return action?.command;
    }
    const staff = this.#staves().find(({ id }) => id === this.staffPicked());
    const slot = this.#slots().find(({ key }) => key === this.slotPicked());
    const prepared = this.#picks();
    return {
      field: RestCommandField.DailyPreparations,
      ...(staff === undefined ? {} : { staff: staff.id }),
      ...(staff === undefined || slot === undefined ? {} : { slot: slot.slot }),
      ...(prepared.length === 0 ? {} : { prepared }),
    };
  });

  /** What each spell changed would do, worded. */
  readonly #preparedLines = computed((): readonly RestLine[] => {
    const registry = this.#spells.data();
    return preparedLines(this.preparedEntries(), this.#picks(), {
      translate: (key, params) => this.#i18n.translate(key, params),
      spell: (id) => (registry === undefined ? undefined : sheetSlotContent(registry).spells.spell(id)?.name),
    });
  });

  protected readonly preview = computed((): RestPreview | undefined => {
    const action = this.#chosen();
    const command = this.#command();
    const registry = this.registry.data();
    const character = this.#characters.selected();
    const read = this.#play.play.data();
    const hitPoints = this.#sheet.maxHitPoints();
    const resources = this.#sheet.resourceMaxima();
    if (
      action === undefined ||
      command === undefined ||
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
      command,
      lines: [
        ...restLines({ registry, character, play: read.play, maxima: { hitPoints, resources } }, command),
        ...this.#preparedLines(),
      ],
    };
  });

  protected readonly choose =
    (action: RestAction): (() => void) =>
    (): void => {
      this.#chosen.set(action);
      this.#clearPicks();
    };

  protected readonly cancel = (): void => {
    this.#chosen.set(undefined);
    this.#clearPicks();
  };

  /** Another staff may take no slot the last one had picked, so a new pick starts the slot over. */
  protected readonly pickStaff = (value: string | undefined): void => {
    this.staffPicked.set(value ?? NONE);
    this.slotPicked.set(NONE);
  };

  /** Stages the spell picked for a slot, or takes back a pick cleared. */
  protected readonly stagePick = ({ slot, spell }: StagedSpell): void => {
    this.staged.update(({ [slot]: _replaced, ...rest }) => (spell === undefined ? rest : { ...rest, [slot]: spell }));
  };

  protected readonly pickSlot = (value: string | undefined): void => {
    this.slotPicked.set(value ?? NONE);
  };

  protected readonly confirm = async (): Promise<void> => {
    const shown = this.preview();
    if (shown === undefined) {
      return;
    }
    this.busy.set(true);
    try {
      await this.#play.send(shown.command);
      this.#chosen.set(undefined);
      this.#clearPicks();
    } finally {
      this.busy.set(false);
    }
  };

  /** The server's reason (a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };

  #clearPicks(): void {
    this.staffPicked.set(NONE);
    this.slotPicked.set(NONE);
    this.staged.set({});
  }
}
