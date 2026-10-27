import {
  ANCESTRY_SLOT,
  Character,
  CharacterCommand,
  CharacterId,
  CharacterPatchField,
  generateCharacter,
  itemContent,
  rollPersona,
  Seed,
  slotContent,
} from '@pioneer/character/domain';
import type {
  CharacterName,
  GenerateCharacterBody,
  GeneratedCharacter,
  Persona,
  SlotContent,
} from '@pioneer/character/domain';
import { AncestryId, ContentKind } from '@pioneer/rules/sdk';
import type { ContentSource } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';
import type { Clock, Temporal, UserId } from '@pioneer/shared/kernel';

import type { CharacterRepository } from './character-repository';

/** How many seeds a draw can give: every `Seed` below the largest. */
const SEED_COUNT = Seed.parse(2_147_483_647);

/** A seed nobody chose: the server's own draw, handed back so the character can be made again. */
function drawSeed(): Seed {
  const [drawn = 0] = crypto.getRandomValues(new Uint32Array(1));
  return Seed.parse(drawn % SEED_COUNT);
}

/** Any ancestry the content has: a character is made with one, then the slot is cleared for the generator to pick. */
function anyAncestry(content: SlotContent): AncestryId {
  const [ancestry] = content.lookup.ofKind(ContentKind.Ancestry);
  if (ancestry === undefined) {
    throw new Error('No ancestry is loaded, so no character can be generated');
  }
  return AncestryId.parse(ancestry.id);
}

/** What `startingCharacter` needs. */
interface StartInput {
  readonly actor: UserId;
  readonly name: CharacterName;
  /** Any ancestry: the character is made with one, then the slot is cleared for the generator to pick. */
  readonly ancestry: AncestryId;
  readonly persona: Persona;
  readonly now: Temporal.Instant;
}

/** The character generation starts from: named and written up, with no ancestry and nothing else picked. */
function startingCharacter(input: StartInput): Character {
  const { actor, name, ancestry, persona, now } = input;
  const created = Character.create({ id: CharacterId.parse(newId()), ownerId: actor, name, ancestry, now });
  return created
    .apply({ field: CharacterPatchField.ClearSlot, slot: ANCESTRY_SLOT }, now)
    .apply({ field: CharacterPatchField.SetPersonality, value: persona.personality }, now);
}

/** Makes characters at random. Framework-free: the HTTP adapter calls it with the signed-in user as `actor`. */
export class GenerateCharacterService {
  readonly #repository: CharacterRepository;
  readonly #content: ContentSource;
  readonly #clock: Clock;

  public constructor(repository: CharacterRepository, content: ContentSource, clock: Clock) {
    this.#repository = repository;
    this.#content = content;
    this.#clock = clock;
  }

  /**
   * A new character for `actor`, made at random: a name, a personality, every slot and the gear of its level, all
   * from `body.seed` (drawn when absent) so the same seed and level give the same character. It starts from
   * nothing, so no other character is read or touched, archived ones included. The seed is not stored: it is
   * answered once.
   */
  public async generate(actor: UserId, body: GenerateCharacterBody): Promise<GeneratedCharacter> {
    const registry = await this.#content.registry();
    const content = slotContent(registry);
    const ancestry = anyAncestry(content);
    const seed = body.seed ?? drawSeed();
    const persona = rollPersona(seed);
    const now = this.#clock.now();
    const start = startingCharacter({
      actor,
      name: body.name ?? persona.name,
      ancestry,
      persona,
      now,
    });
    const items = itemContent(registry);
    const { character } = generateCharacter({ start, seed, level: body.level, content, items, now });
    const saved = await this.#repository.insert(character, { actor, command: CharacterCommand.GenerateCharacter });
    return { character: saved, seed };
  }
}
