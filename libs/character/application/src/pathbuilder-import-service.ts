import {
  attributeModifiers,
  Character,
  CharacterCommand,
  CharacterId,
  CharacterVariantRuleId,
  inventoryViolations,
  itemContent,
  runeContent,
  slotContent,
  unplacedFeatBreaks,
} from '@pioneer/character/domain';
import type { Inventory } from '@pioneer/character/domain';
import {
  characterImportReport,
  entryLookup,
  ImportKind,
  modifierDifferences,
  registryLookup,
  RuleBreakingCount,
} from '@pioneer/interop/pathbuilder';
import type { ContentLookup, PathbuilderImport, PathbuilderImportResponse } from '@pioneer/interop/pathbuilder';
import type { AncestryId, ContentRegistry, ContentSource, VariantRuleEntry } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { CharacterRepository } from './character-repository';
import type { CharacterVariantRepository } from './character-variant-repository';
import { importDiscrepancies } from './pathbuilder-discrepancies';
import {
  dualClassVariant,
  freeArchetypeVariant,
  importedCharacter,
  noDedicationLockVariant,
  matchedAncestry,
  readExport,
} from './pathbuilder-import';
import type { Create } from './pathbuilder-import';
import { importedInventory } from './pathbuilder-inventory';
import type { InventoryContent } from './pathbuilder-inventory';

/** What a new character starts from beside the export's name and level. */
interface Start {
  readonly ancestry: AncestryId;
  readonly inventory: Inventory;
}

/** The items and property runes of `registry`, to match an export's gear against. */
function inventoryContent(registry: ContentRegistry, lookup: ContentLookup): InventoryContent {
  return {
    items: lookup,
    runes: entryLookup({
      [ImportKind.Item]: [...runeContent(registry).values()].map(({ id, name }) => ({ id, name })),
    }),
    entries: itemContent(registry),
  };
}

/** How many of `inventory`'s items break a rule: the imported lines kept past a limit. */
function ruleBreaking(inventory: Inventory, registry: ContentRegistry): RuleBreakingCount {
  const violations = inventoryViolations(inventory, { items: itemContent(registry), runes: runeContent(registry) });
  return RuleBreakingCount.parse(new Set(violations.map(({ item }) => item)).size);
}

/** The ports `PathbuilderImportService` works through. */
export interface PathbuilderImportPorts {
  readonly characters: CharacterRepository;
  /** The official content an export is matched against. */
  readonly content: ContentSource;
  readonly variants: CharacterVariantRepository;
}

/**
 * Makes characters from Pathbuilder exports. Framework-free, like `CharacterService`, whose policy it shares: the
 * character is the actor's.
 */
/**
 * The variant rules an export asks for: Dual Class for a second class, Free Archetype for its free feat slots, No
 * Dedication Lock for dedications that break the lock.
 */
interface ImportVariants {
  readonly dual: VariantRuleEntry | undefined;
  /** Those the loaded packs define, in force while the export is placed. */
  readonly wanted: readonly VariantRuleEntry[];
}

function importVariants(value: PathbuilderImport, content: ContentRegistry, lookup: ContentLookup): ImportVariants {
  const dual = dualClassVariant(value, content);
  const free = freeArchetypeVariant(value, content);
  const unlocked = noDedicationLockVariant(value, content, lookup);
  return { dual, wanted: [dual, free, unlocked].filter((each) => each !== undefined) };
}

export class PathbuilderImportService {
  readonly #characters: CharacterRepository;
  readonly #content: ContentSource;
  readonly #variants: CharacterVariantRepository;
  readonly #clock: Clock;

  public constructor({ characters, content, variants }: PathbuilderImportPorts, clock: Clock) {
    this.#characters = characters;
    this.#content = content;
    this.#variants = variants;
    this.#clock = clock;
  }

  /**
   * A new character from a Pathbuilder export: its name, level, ancestry, the background and class when loaded, the
   * heritage when its ancestry offers it (#555), each boost in its slot (#420) and the voluntary flaws (#550), written
   * in one insert. A second class that matches loaded content goes in its slot, and the Dual Class variant rule is
   * enabled for the character next (#549); with no pack that defines the rule, the report lists the class as not
   * offered. No modifier is stored; the report lists any the picks don't reproduce, and a loaded heritage left out as
   * not offered. The export is read again here, never taken from the client's preview. Refused, with nothing saved,
   * when it can't be read or its ancestry isn't loaded.
   */
  public async importPathbuilder(actor: UserId, raw: unknown): Promise<PathbuilderImportResponse> {
    const value = readExport(raw);
    const content = await this.#content.registry();
    const lookup = registryLookup(content);
    const create = this.#newCharacter(actor, value, {
      ancestry: matchedAncestry(value, lookup),
      inventory: importedInventory(value, inventoryContent(content, lookup)),
    });
    const variants = importVariants(value, content, lookup);
    const slots = slotContent(content, variants.wanted);
    const { character, unplaced, skillGaps, spellGaps, notOffered, dualClass } = importedCharacter(
      value,
      { lookup, slots },
      create,
    );
    const saved = await this.#characters.insert(character, { actor, command: CharacterCommand.ImportPathbuilder });
    const enabled = dualClass ? variants.wanted : variants.wanted.filter((each) => each !== variants.dual);
    await this.#enable(actor, saved, enabled);
    const report = characterImportReport(value, lookup, {
      notOffered,
      unplacedBoosts: unplaced,
      skillGaps,
      spellGaps,
      modifierDifferences: modifierDifferences(value.attributes, attributeModifiers(character.document, slots.boosts)),
      discrepancies: importDiscrepancies(value, character, {
        registry: content,
        slots,
        variants: enabled,
      }),
      ruleBreaking: ruleBreaking(character.document.inventory, content),
      ruleBreakingFeats: RuleBreakingCount.parse(unplacedFeatBreaks(character.document).length),
    });
    return { character: saved, report };
  }

  /** The character `value` makes, owned by `actor`, with the choices it is given picked. */
  #newCharacter(actor: UserId, value: PathbuilderImport, { ancestry, inventory }: Start): Create {
    const id = CharacterId.parse(newId());
    const now = this.#clock.now();
    return (choices, unplacedFeats) =>
      Character.create({
        id,
        ownerId: actor,
        name: value.name,
        ancestry,
        level: value.level,
        choices,
        inventory,
        unplacedFeats,
        now,
      });
  }

  /** The variant rules `character` needs, enabled for its owner; nothing when it needs none. */
  async #enable(actor: UserId, character: Character, variants: readonly VariantRuleEntry[]): Promise<void> {
    await Promise.all(
      variants.map(async (variant) =>
        this.#variants.enable(actor, character.id, {
          id: CharacterVariantRuleId.parse(newId()),
          variantId: variant.id,
          enabledBy: actor,
          enabledAt: this.#clock.now(),
        }),
      ),
    );
  }
}
