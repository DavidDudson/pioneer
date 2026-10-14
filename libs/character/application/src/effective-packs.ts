import type { Character } from '@pioneer/character/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';

/**
 * Port to the homebrew packs a character uses, which decide the content its sheet is worked out over: the attached
 * campaign's, else the owner's own that they may still read (ADR-0060). Official packs are always on and are not
 * listed. `CharacterPackService` is the adapter.
 */
export abstract class EffectivePacks {
  public abstract of(character: Character): Promise<readonly ContentPackId[]>;
}
