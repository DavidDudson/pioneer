import { currentHitPoints, Dying } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { slugName } from '@pioneer/rules/sdk';
import type { HitPoints } from '@pioneer/rules/sdk';

import { contentOfCharacter } from './character-content';
import type { CharacterContentSource } from './character-content';
import { maxHitPointsOf } from './play-hit-points';

/** A character's Hit Points as the table has them. */
export interface VitalHitPoints {
  readonly current: HitPoints;
  readonly max: HitPoints;
  readonly temp: HitPoints;
}

/** How a character stands, for a party panel: Hit Points, how close to death, and the conditions on it. */
export interface Vitals {
  /** Undefined while no maximum can be worked out: the build has no ancestry or class yet. */
  readonly hp: VitalHitPoints | undefined;
  /** The dying value, 0 when not dying; a dead character is at the highest. */
  readonly dying: Dying;
  /** The name parts of the slugs of its conditions, the death track's first (`dying`, `wounded`, `doomed`), each once. */
  readonly conditions: readonly string[];
}

const DEAD = Dying.parse(4);

/**
 * What a party panel shows of a character, worked out on every read from its play state and the content it uses
 * (ADR-0064). Nothing derived is stored. Framework-free.
 */
export class CharacterVitals {
  readonly #content: CharacterContentSource;

  public constructor(content: CharacterContentSource) {
    this.#content = content;
  }

  public async of(character: Character): Promise<Vitals> {
    const { play } = character.document;
    const max = await maxHitPointsOf(this.#content, character, play);
    const registry = await contentOfCharacter(this.#content, character).registry();
    const slugs = new Map(registry.packs.flatMap((pack) => pack.otherEntries.map((entry) => [entry.id, entry.slug])));
    const track = [
      play.dying > 0 ? 'dying' : undefined,
      play.wounded > 0 ? 'wounded' : undefined,
      play.doomed > 0 ? 'doomed' : undefined,
    ];
    const active = play.conditions.map((each) => {
      const slug = slugs.get(each.condition);
      return slug === undefined ? undefined : slugName(slug);
    });
    const conditions = [...track, ...active].filter((name) => name !== undefined);
    return {
      hp: max === undefined ? undefined : { current: currentHitPoints(play.hp, max), max, temp: play.hp.temp },
      dying: play.dead ? DEAD : play.dying,
      conditions: [...new Set(conditions)],
    };
  }
}
