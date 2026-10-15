import { PackPublisher, PackTitle } from '@pioneer/character/domain';
import type {
  Character,
  CharacterId,
  UnenabledContent,
  UnenabledItem,
  UnenabledPack,
  VariantRuleOption,
} from '@pioneer/character/domain';
import { contentPackId } from '@pioneer/rules/sdk';
import type { ContentPackId, ContentRegistry, ContentSource, VariantRuleId } from '@pioneer/rules/sdk';
import { NotFoundError } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import type { AttachedCampaignPacks } from './attached-campaign-packs';
import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';

/** The packs and variant rules the owner chose for a character, which `CharacterPackService` and `CharacterVariantService` hold. */
export interface OwnChoices<Id> {
  readonly own: (character: Character) => Promise<readonly Id[]>;
}

/** The ports `CharacterUnenabledService` works through. */
export interface CharacterUnenabledPorts {
  readonly characters: CharacterRepository;
  readonly content: ContentSource;
  readonly packs: OwnChoices<ContentPackId>;
  readonly variants: OwnChoices<VariantRuleId>;
  readonly campaigns: AttachedCampaignPacks;
}

/** The empty answer, for a character no campaign decides for. */
const NOTHING: UnenabledContent = { variantRules: [], packs: [], items: [] };

function byName<Row extends { readonly name: string }>(left: Row, right: Row): number {
  return left.name.localeCompare(right.name);
}

function packOf(registry: ContentRegistry, id: ContentPackId): UnenabledPack | undefined {
  const pack = registry.packs.find((each) => contentPackId(each.id) === id);
  return pack === undefined
    ? undefined
    : {
        packId: id,
        title: PackTitle.parse(pack.manifest.title),
        publisher: PackPublisher.parse(pack.manifest.publisher),
      };
}

/** The items the character carries that a pack in `unenabled` defines, by name. */
function itemsFrom(
  registry: ContentRegistry,
  character: Character,
  unenabled: ReadonlySet<ContentPackId>,
): UnenabledItem[] {
  const seen = new Set<string>();
  return character.document.inventory.items.flatMap((carried): UnenabledItem[] => {
    if (seen.has(carried.item)) {
      return [];
    }
    for (const pack of registry.packs) {
      const entry = pack.otherEntries.find((each) => each.id === carried.item);
      if (entry !== undefined && unenabled.has(contentPackId(pack.id))) {
        seen.add(carried.item);
        return [{ item: entry.id, name: entry.name, packTitle: PackTitle.parse(pack.manifest.title) }];
      }
    }
    return [];
  });
}

/**
 * What a character uses that its campaign has not enabled (play-and-campaigns.md). A character in a campaign uses the
 * campaign's packs and variant rules and ignores its own, so the difference between its own and the campaign's is what
 * the player should raise with the GM. Nothing is blocked or removed: this only reports. Framework-free.
 */
export class CharacterUnenabledService {
  readonly #characters: CharacterRepository;
  readonly #content: ContentSource;
  readonly #packs: OwnChoices<ContentPackId>;
  readonly #variants: OwnChoices<VariantRuleId>;
  readonly #campaigns: AttachedCampaignPacks;

  public constructor({ characters, content, packs, variants, campaigns }: CharacterUnenabledPorts) {
    this.#characters = characters;
    this.#content = content;
    this.#packs = packs;
    this.#variants = variants;
    this.#campaigns = campaigns;
  }

  /** The character's unenabled content. Not the owner: 404. Empty when the character is in no campaign. */
  public async unenabled(actor: UserId, id: CharacterId): Promise<UnenabledContent> {
    const character = await this.#characters.findById(id);
    if (character === undefined || !mayAccessCharacter(actor, character)) {
      throw new NotFoundError('Character', id);
    }
    const campaign = await this.#campaigns.of(id);
    if (campaign === undefined) {
      return NOTHING;
    }
    const [packIds, variantIds] = await Promise.all([this.#packs.own(character), this.#variants.own(character)]);
    // The registry of the character's own packs: what its sheet shows once it leaves the campaign.
    const registry = await this.#content.registry(packIds);
    const enabledPacks = new Set(campaign.packs);
    const enabledVariants = new Set(campaign.variants);
    const unenabled = new Set(packIds.filter((packId) => !enabledPacks.has(packId)));
    return {
      campaign: campaign.name,
      variantRules: variantIds
        .filter((variantId) => !enabledVariants.has(variantId))
        .flatMap((variantId): VariantRuleOption[] => {
          const entry = registry.variantRule(variantId);
          return entry === undefined
            ? []
            : [{ variantId, name: entry.definition.name, packTitle: PackTitle.parse(entry.pack.manifest.title) }];
        })
        .toSorted(byName),
      packs: [...unenabled]
        .flatMap((packId): UnenabledPack[] => {
          const pack = packOf(registry, packId);
          return pack === undefined ? [] : [pack];
        })
        .toSorted((left, right) => left.title.localeCompare(right.title)),
      items: itemsFrom(registry, character, unenabled).toSorted(byName),
    };
  }
}
