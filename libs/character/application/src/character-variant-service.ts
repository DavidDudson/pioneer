import { CharacterVariantRuleId, PackAuthority, PackTitle } from '@pioneer/character/domain';
import type {
  Character,
  CharacterId,
  CharacterVariantRules,
  EnableVariantRuleBody,
  VariantRuleOption,
} from '@pioneer/character/domain';
import type { ContentRegistry, ContentSource, VariantRuleEntry, VariantRuleId } from '@pioneer/rules/sdk';
import { ConflictError, message, newId, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { AttachedCampaign, AttachedCampaignPacks } from './attached-campaign-packs';
import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';
import { CharacterVariantMessage } from './character-variant-message';
import type { CharacterVariantRepository } from './character-variant-repository';
import type { EffectivePacks } from './effective-packs';
import { EffectiveVariants } from './effective-variants';

/** The ports `CharacterVariantService` works through. */
export interface CharacterVariantPorts {
  readonly characters: CharacterRepository;
  readonly variants: CharacterVariantRepository;
  /** The official content, which `packs` extends with the homebrew a character uses. */
  readonly content: ContentSource;
  readonly packs: EffectivePacks;
  readonly campaigns: AttachedCampaignPacks;
}

function optionOf({ id, definition, pack }: VariantRuleEntry): VariantRuleOption {
  return { variantId: id, name: definition.name, packTitle: PackTitle.parse(pack.manifest.title) };
}

function byName(left: VariantRuleOption, right: VariantRuleOption): number {
  return left.name.localeCompare(right.name) || left.variantId.localeCompare(right.variantId);
}

/**
 * The variant rules a character uses. A character outside campaigns has its owner choose them; one attached to a
 * campaign uses the campaign's and ignores its own rows, so attaching switches the set and detaching switches it back
 * (ADR-0061). Only the owner reads or changes the list, and a variant rule can be enabled only while a pack the
 * character uses defines it. Framework-free, like `CharacterPackService`.
 */
export class CharacterVariantService extends EffectiveVariants {
  readonly #characters: CharacterRepository;
  readonly #variants: CharacterVariantRepository;
  readonly #content: ContentSource;
  readonly #packs: EffectivePacks;
  readonly #campaigns: AttachedCampaignPacks;
  readonly #clock: Clock;

  public constructor({ characters, variants, content, packs, campaigns }: CharacterVariantPorts, clock: Clock) {
    super();
    this.#characters = characters;
    this.#variants = variants;
    this.#content = content;
    this.#packs = packs;
    this.#campaigns = campaigns;
    this.#clock = clock;
  }

  /**
   * The variant rules enabled for the character: the attached campaign's, else the owner's own, whether or not a pack
   * in force still defines them. No access check; the caller has one.
   */
  public override async of(character: Character): Promise<readonly VariantRuleId[]> {
    return this.#enabledIds(character, await this.#campaigns.of(character.id));
  }

  /**
   * The variant rules the owner has enabled for the character, whether or not a campaign decides instead, and whether
   * or not a pack it uses still defines them. No access check; the caller has one.
   */
  public async own(character: Character): Promise<readonly VariantRuleId[]> {
    return this.#enabledIds(character, undefined);
  }

  /** The character's variant rules, and for its owner the ones they could enable. Not the owner: 404. */
  public async variantRules(actor: UserId, id: CharacterId): Promise<CharacterVariantRules> {
    return this.#view(await this.#owned(actor, id));
  }

  /**
   * The owner enables a variant rule. One no pack the character uses defines is a 404, and any change while a campaign
   * decides is a 409. Enabling it twice is no change.
   */
  public async enable(
    actor: UserId,
    id: CharacterId,
    { variantId }: EnableVariantRuleBody,
  ): Promise<CharacterVariantRules> {
    const character = await this.#owned(actor, id);
    await this.#refuseIfCampaignDecides(id);
    const registry = await this.#registryOf(character);
    if (registry.variantRule(variantId) === undefined) {
      throw new NotFoundError('VariantRule', variantId);
    }
    await this.#variants.enable(actor, id, {
      id: CharacterVariantRuleId.parse(newId()),
      variantId,
      enabledBy: actor,
      enabledAt: this.#clock.now(),
    });
    return this.#view(character);
  }

  /** The owner stops the character using a variant rule; a campaign's are not theirs to change: 409. */
  public async disable(actor: UserId, id: CharacterId, variantId: VariantRuleId): Promise<CharacterVariantRules> {
    const character = await this.#owned(actor, id);
    await this.#refuseIfCampaignDecides(id);
    await this.#variants.disable(actor, id, variantId);
    return this.#view(character);
  }

  /** One of the actor's characters. Another user's is a 404, the same as a missing one (ADR-0007). */
  async #owned(actor: UserId, id: CharacterId): Promise<Character> {
    const character = await this.#characters.findById(id);
    if (character === undefined || !mayAccessCharacter(actor, character)) {
      throw new NotFoundError('Character', id);
    }
    return character;
  }

  async #refuseIfCampaignDecides(id: CharacterId): Promise<void> {
    const campaign = await this.#campaigns.of(id);
    if (campaign !== undefined) {
      throw new ConflictError(
        `Character ${id} uses the variant rules of its campaign`,
        message(CharacterVariantMessage.CampaignDecides, { campaign: campaign.name }),
      );
    }
  }

  /** The registry of the packs the character uses now. */
  async #registryOf(character: Character): Promise<ContentRegistry> {
    return this.#content.registry(await this.#packs.of(character));
  }

  async #enabledIds(character: Character, campaign: AttachedCampaign | undefined): Promise<readonly VariantRuleId[]> {
    if (campaign !== undefined) {
      return campaign.variants;
    }
    const rows = await this.#variants.listForCharacter(character.id);
    return rows.map((row) => row.variantId);
  }

  /** The variant rules in force, and for the owner while no campaign decides the ones they could enable. */
  async #view(character: Character): Promise<CharacterVariantRules> {
    const campaign = await this.#campaigns.of(character.id);
    const manageable = campaign === undefined;
    const [registry, ids] = await Promise.all([this.#registryOf(character), this.#enabledIds(character, campaign)]);
    // A variant rule whose pack is not in force has no entry; it comes back with its pack.
    const inForce = ids.flatMap((variantId): VariantRuleEntry[] => {
      const entry = registry.variantRule(variantId);
      return entry === undefined ? [] : [entry];
    });
    const used = new Set(inForce.map((entry) => entry.id));
    return {
      decidedBy: manageable ? PackAuthority.Character : PackAuthority.Campaign,
      ...(campaign === undefined ? {} : { campaign: campaign.name }),
      manageable,
      enabled: inForce.map((entry) => optionOf(entry)).toSorted(byName),
      available: manageable
        ? registry
            .variantRules()
            .filter((entry) => !used.has(entry.id))
            .map((entry) => optionOf(entry))
            .toSorted(byName)
        : [],
    };
  }
}
