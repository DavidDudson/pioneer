import {
  CharacterRuleLimitId,
  CORE_RULE_LIMITS,
  LIMIT_CEILINGS,
  PackAuthority,
  RULE_LIMIT_FIELDS,
  RuleLimitOverridesSchema,
  RuleLimitSettingValue,
  RuleLimitSource,
  sourceOf,
  withOverrides,
} from '@pioneer/character/domain';
import type {
  Character,
  CharacterId,
  CharacterItemApprovals,
  CharacterRuleLimitSettings,
  RuleLimitField,
  RuleLimitOverrides,
  RuleLimits,
  RuleLimitSettingChange,
} from '@pioneer/character/domain';
import { ConflictError, message, newId, NotFoundError, ValidationError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { AttachedCampaign, AttachedCampaignPacks } from './attached-campaign-packs';
import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';
import { CharacterRuleLimitMessage } from './character-rule-limit-message';
import type { CharacterRuleLimitRepository } from './character-rule-limit-repository';
import { EffectiveRuleLimits } from './effective-rule-limits';
import type { VariantLimits } from './variant-limits';

/** The ports `CharacterRuleLimitService` works through. */
export interface CharacterRuleLimitPorts {
  readonly characters: CharacterRepository;
  readonly limits: CharacterRuleLimitRepository;
  readonly campaigns: AttachedCampaignPacks;
  readonly variantLimits: VariantLimits;
}

/**
 * The table limits a character is held to. A character outside campaigns has its owner set them; one attached to a
 * campaign is held to the campaign's and ignores its own rows, so attaching switches the set and detaching brings the
 * owner's back untouched (ADR-0064, as for packs and variant rules in ADR-0061). Only the owner reads or changes them.
 * Framework-free, like `CharacterVariantService`.
 */
export class CharacterRuleLimitService extends EffectiveRuleLimits {
  readonly #characters: CharacterRepository;
  readonly #limits: CharacterRuleLimitRepository;
  readonly #campaigns: AttachedCampaignPacks;
  readonly #variantLimits: VariantLimits;
  readonly #clock: Clock;

  public constructor({ characters, limits, campaigns, variantLimits }: CharacterRuleLimitPorts, clock: Clock) {
    super();
    this.#characters = characters;
    this.#limits = limits;
    this.#campaigns = campaigns;
    this.#variantLimits = variantLimits;
    this.#clock = clock;
  }

  /**
   * The limits in force for the character, lowest first: the core rules', the variant rules in force (the more
   * permissive where two change one limit), then the attached campaign's number for each limit its GM set, else the
   * owner's. No access check; the caller has one.
   */
  public override async of(character: Character): Promise<RuleLimits> {
    const campaign = await this.#campaigns.of(character.id);
    const [variant, set] = await Promise.all([this.#variantLimits.of(character), this.#setBy(character.id, campaign)]);
    return withOverrides({ ...variant, ...set });
  }

  /**
   * The rule-breaking lines the character's campaign approved; none outside a campaign, whose warnings stay (ADR-0064).
   * Not the owner: 404.
   */
  public async itemApprovals(actor: UserId, id: CharacterId): Promise<CharacterItemApprovals> {
    await this.#owned(actor, id);
    const campaign = await this.#campaigns.of(id);
    return { campaign: campaign?.id, approvals: campaign?.approvals ?? [] };
  }

  /** The character's limits, and who decides them. Not the owner: 404. */
  public async ruleLimitSettings(actor: UserId, id: CharacterId): Promise<CharacterRuleLimitSettings> {
    return this.#view(await this.#owned(actor, id));
  }

  /**
   * The owner sets a limit. A number past the limit's ceiling is a 422 and a campaign deciding is a 409. Setting it
   * again replaces the number. Setting the core number stores it, so a later change to the core rules leaves the table
   * as the owner left it.
   */
  public async set(
    actor: UserId,
    id: CharacterId,
    { limit, value }: RuleLimitSettingChange,
  ): Promise<CharacterRuleLimitSettings> {
    const character = await this.#owned(actor, id);
    await this.#refuseIfCampaignDecides(id);
    if (value > LIMIT_CEILINGS[limit]) {
      throw new ValidationError([
        { path: ['value'], message: message(CharacterRuleLimitMessage.Ceiling, { maximum: LIMIT_CEILINGS[limit] }) },
      ]);
    }
    await this.#limits.set(actor, id, {
      id: CharacterRuleLimitId.parse(newId()),
      limit,
      value,
      setBy: actor,
      setAt: this.#clock.now(),
    });
    return this.#view(character);
  }

  /** The owner returns a limit to the core rules' number; a campaign's are not theirs to change: 409. */
  public async reset(actor: UserId, id: CharacterId, limit: RuleLimitField): Promise<CharacterRuleLimitSettings> {
    const character = await this.#owned(actor, id);
    await this.#refuseIfCampaignDecides(id);
    await this.#limits.reset(actor, id, limit);
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
        `Character ${id} is held to the table limits of its campaign`,
        message(CharacterRuleLimitMessage.CampaignDecides, { campaign: campaign.name }),
      );
    }
  }

  /** The limits that were set for the character: the campaign's, else the owner's. */
  async #setBy(id: CharacterId, campaign: AttachedCampaign | undefined): Promise<RuleLimitOverrides> {
    if (campaign !== undefined) {
      return campaign.limits ?? {};
    }
    const rows = await this.#limits.listForCharacter(id);
    return RuleLimitOverridesSchema.parse(Object.fromEntries(rows.map((row) => [row.limit, row.value])));
  }

  async #view(character: Character): Promise<CharacterRuleLimitSettings> {
    const campaign = await this.#campaigns.of(character.id);
    const manageable = campaign === undefined;
    const [variant, set] = await Promise.all([this.#variantLimits.of(character), this.#setBy(character.id, campaign)]);
    const inForce = withOverrides({ ...variant, ...set });
    const setter = manageable ? RuleLimitSource.Character : RuleLimitSource.Campaign;
    return {
      decidedBy: manageable ? PackAuthority.Character : PackAuthority.Campaign,
      ...(campaign === undefined ? {} : { campaign: campaign.name }),
      manageable,
      limits: RULE_LIMIT_FIELDS.map((limit) => ({
        limit,
        value: RuleLimitSettingValue.parse(inForce[limit]),
        core: RuleLimitSettingValue.parse(CORE_RULE_LIMITS[limit]),
        ceiling: LIMIT_CEILINGS[limit],
        custom: set[limit] !== undefined,
        source: sourceOf(limit, { set, variant, setter }),
      })),
    };
  }
}
