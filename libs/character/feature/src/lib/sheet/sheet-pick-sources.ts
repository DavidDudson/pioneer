import { computed } from '@angular/core';
import type { Signal } from '@angular/core';
import type { Character, CharacterSlot, LoreName } from '@pioneer/character/domain';
import type { ChoiceValue, ContentId, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import type { NamedStatistic, NamedStrike, SpellcastingEntryLine, StrikesShield } from '@pioneer/rules/ui';

import { sheetEntryNames } from './sheet-entry-names';
import { withSituations } from './sheet-situations';
import type { SituationClaims } from './sheet-situations';
import { sheetSkills } from './sheet-skills';
import { sheetSpellcasting } from './sheet-spellcasting';
import { sheetStatistics } from './sheet-statistics';
import { sheetShields, sheetStrikes, suppressedStrikes } from './sheet-strikes';

/** What the build picks read and write through. */
export interface BuildPickSources {
  readonly registry: Signal<ContentRegistry | undefined>;
  /** The registry the engine derives from: with the item kinds once the character carries equipment. */
  readonly engineRegistry: Signal<ContentRegistry | undefined>;
  readonly character: Signal<Character | undefined>;
  /** The slots as the server read them. */
  readonly slots: Signal<readonly CharacterSlot[] | undefined>;
  readonly select: (slot: SlotKey, selection: ChoiceValue, loreName?: LoreName) => Promise<void>;
  readonly clear: (slot: SlotKey) => Promise<void>;
  readonly translate: (key: string, params?: object) => string;
  /** The situations claimed for the next roll of each statistic; the statistics are derived with them counted. */
  readonly claims: Signal<SituationClaims>;
}

/** What the sheet reads from the engine, over the registry with the item kinds once anything is carried. */
export interface EngineReads {
  /** AC, the saves and Perception from the engine; undefined while the character or the content loads. */
  readonly statistics: Signal<readonly NamedStatistic[] | undefined>;
  /** Every skill and Lore with what the engine derives for it; undefined while the character or the content loads. */
  readonly skills: Signal<readonly NamedStatistic[] | undefined>;
  /** Each Strike, held weapons' then a feature's fist; undefined while the character or the content loads. */
  readonly strikes: Signal<readonly NamedStrike[] | undefined>;
  /** The names of the weapon Strikes a form replaces, to say where they went (#530); none out of form. */
  readonly suppressedStrikes: Signal<readonly string[]>;
  /** The shields held, shown beside the Strikes; none while the character or the content loads. */
  readonly shields: Signal<readonly StrikesShield[]>;
  /** Each spellcasting entry with its spell attack and DC; undefined while the character or the content loads. */
  readonly spellcasting: Signal<readonly SpellcastingEntryLine[] | undefined>;
  /** Names for the entries the defences, statistics and spellcasting lines come from; none while the content loads. */
  readonly entryNames: Signal<ReadonlyMap<ContentId, string>>;
}

/** `read` over the loaded registry and character; undefined while either loads. */
export function loaded<TValue>(
  { registry, character }: BuildPickSources,
  read: (registry: ContentRegistry, character: Character) => TValue,
): Signal<TValue | undefined> {
  return computed(() => {
    const content = registry();
    const current = character();
    return content === undefined || current === undefined ? undefined : read(content, current);
  });
}

export function engineReads(sources: BuildPickSources): EngineReads {
  const engine = { ...sources, registry: sources.engineRegistry };
  const shields = loaded(engine, sheetShields);
  const strikes = loaded(engine, (registry, character) => sheetStrikes(registry, character, sources.claims()));
  return {
    statistics: loaded(engine, (registry, character) =>
      withSituations(registry, character, {
        statistics: sheetStatistics(registry, character),
        claims: sources.claims(),
      }),
    ),
    skills: loaded(engine, (registry, character) =>
      withSituations(registry, character, {
        statistics: sheetSkills(registry, character, sources.translate),
        claims: sources.claims(),
      }),
    ),
    strikes,
    suppressedStrikes: computed(() => {
      const registry = sources.engineRegistry();
      const character = sources.character();
      const inForm = strikes();
      return registry === undefined || character === undefined || inForm === undefined
        ? []
        : suppressedStrikes(registry, character, inForm).map(({ name, nameKey }) =>
            nameKey === undefined ? name : sources.translate(nameKey),
          );
    }),
    shields: computed(() => shields() ?? []),
    spellcasting: loaded(engine, sheetSpellcasting),
    entryNames: computed(() => {
      const registry = sources.engineRegistry() ?? sources.registry();
      return registry === undefined ? new Map<ContentId, string>() : sheetEntryNames(registry);
    }),
  };
}
