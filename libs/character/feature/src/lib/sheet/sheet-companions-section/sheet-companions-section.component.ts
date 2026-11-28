import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CompanionArchiveReason, CompanionName } from '@pioneer/character/domain';
import type { Companion } from '@pioneer/character/domain';
import { Button, Stack, Surface, Text } from '@pioneer/frontier';
import { companionTiersFromFeats } from '@pioneer/rules/engine';
import { ChoiceValue, CompanionKind, ContentId, ContentKind, Level } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';
import { CompanionPicker } from '@pioneer/rules/ui';
import type { CompanionPick, CompanionSpeciesOption } from '@pioneer/rules/ui';

import { CharacterCompanionStore } from '../../data/character-companion-store';
import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { companionFacts } from '../sheet-companion-facts';
import type { CompanionFact, Translate } from '../sheet-companion-facts';
import { companionSlots, speciesOf, speciesOfCompanion, statisticsOfCompanion } from '../sheet-companions';
import type { CompanionSlotView } from '../sheet-companions';

/** What a companion card shows: its name, species and the statistics derived for the master's level. */
interface CompanionCard {
  readonly companion: Companion;
  /** The lines under the name. */
  readonly facts: readonly CompanionFact[];
}

/** One species choice as the section shows it: the card of the companion it granted, and the form to name one. */
interface CompanionEntry {
  readonly view: CompanionSlotView;
  readonly card: CompanionCard | undefined;
  /** The species the form offers: all of them while the choice is open, the one picked once it is. */
  readonly options: readonly CompanionSpeciesOption[];
  /** The form shows when there is no companion for the species picked. */
  readonly naming: boolean;
  /** The companion is of another species than the choice now holds, so it can be replaced keeping its name. */
  readonly replaceable: boolean;
}

/**
 * The Companions section: the animal companion each Animal Companion feat grants. While the feat's species choice is
 * open the picker takes a species and a name and fills the choice and adds the companion in one go; once the choice is
 * filled elsewhere (in Choices) it takes the name. A companion shows its statistics, derived from the master's level
 * and never stored (ADR-0004, ADR-0080). Changing the species replaces the companion: the old one is archived as
 * replaced (ADR-0062). The tier is read from the upgrade feats the character picked (nimble and savage wait on their own choice).
 */
@Component({
  selector: 'pio-sheet-companions-section',
  imports: [Button, CompanionPicker, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './sheet-companions-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetCompanionsSection {
  readonly #characters = inject(CharacterStore);
  readonly #companions = inject(CharacterCompanionStore);
  readonly #transloco = inject(TranslocoService);
  readonly #translate: Translate = (key, params) => this.#transloco.translate(key, params);
  readonly #registry = injectContentRegistry([ContentKind.CompanionSpecies]);

  protected readonly Message = {
    None: 'character.sheet.companions.none',
    Replace: 'character.sheet.companions.replace',
    Release: 'character.sheet.companions.release',
    Source: 'character.sheet.companions.source',
  } as const;

  protected readonly entries = computed((): readonly CompanionEntry[] => {
    const registry = this.#registry.data();
    const slots = this.#characters.slots();
    const character = this.#characters.selected();
    const read = this.#companions.companions.data()?.companions;

    if (registry === undefined || slots === undefined || character === undefined || read === undefined) {
      return [];
    }

    const species = speciesOf(registry);
    const table = registry.proficiencyBonus();
    const level = Level.parse(character.level);
    const tiers = companionTiersFromFeats(Object.values(character.document.build.choices));

    return companionSlots(slots, species, read).map((view): CompanionEntry => {
      const { companion, picked } = view;
      const held = companion === undefined ? undefined : speciesOfCompanion(companion, species);
      const statistics =
        held === undefined || table === undefined ? undefined : statisticsOfCompanion(held, level, table, tiers);

      const facts =
        held === undefined || statistics === undefined ? [] : companionFacts(held.name, statistics, this.#translate);

      return {
        view,
        card: companion === undefined ? undefined : { companion, facts },
        options: (picked === undefined ? species : [picked]).map(({ id, name }) => ({ value: id, label: name })),
        naming: picked === undefined || held?.id !== picked.id,
        replaceable: companion !== undefined && picked !== undefined && held?.id !== picked.id,
      };
    });
  });

  protected readonly Archive = CompanionArchiveReason;

  /** Confirms a species and a name: fills the choice when it is open, replaces a companion of another species, and adds. */
  protected async confirm(entry: CompanionEntry, { species, name }: CompanionPick): Promise<void> {
    const { slot, picked, companion } = entry.view;
    const chosen = ContentId.parse(species);

    if (picked?.id !== chosen) {
      await this.#characters.selectSlot(slot, ChoiceValue.parse(chosen));
    }

    if (companion !== undefined) {
      await this.#companions.archive(companion.id, CompanionArchiveReason.Replaced);
    }

    await this.#companions.addAnimalCompanion({ name: CompanionName.parse(name), species: chosen, grantedBy: slot });
  }

  /** Replaces the companion with one of the species the choice now holds, under the same name. */
  protected async replace({ view }: CompanionEntry): Promise<void> {
    const { slot, picked, companion } = view;

    if (picked !== undefined && companion !== undefined) {
      await this.#companions.archive(companion.id, CompanionArchiveReason.Replaced);
      await this.#companions.addAnimalCompanion({ name: companion.name, species: picked.id, grantedBy: slot });
    }
  }

  protected async release({ companion }: CompanionCard): Promise<void> {
    await this.#companions.archive(companion.id, CompanionArchiveReason.Released);
  }

  protected isAnimalCompanion(companion: Companion): boolean {
    return companion.kind === CompanionKind.AnimalCompanion;
  }

  protected slotOf(entry: CompanionEntry): SlotKey {
    return entry.view.slot;
  }
}
