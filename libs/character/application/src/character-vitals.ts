import { currentHitPoints, DEATH_VALUE_MAX, Dying } from '@pioneer/character/domain';
import type { Character, PlayState } from '@pioneer/character/domain';
import { slugName } from '@pioneer/rules/sdk';
import type { ContentRegistry, HitPoints } from '@pioneer/rules/sdk';

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

const DEAD = Dying.parse(DEATH_VALUE_MAX);

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
    const registry = await contentOfCharacter(this.#content, character).registry();
    const max = await maxHitPointsOf(this.#content, { character, play, registry });
    const dying = play.dead ? DEAD : play.dying;
    const track = [
      dying > 0 ? 'dying' : undefined,
      play.wounded > 0 ? 'wounded' : undefined,
      play.doomed > 0 ? 'doomed' : undefined,
    ];
    const conditions = [...track, ...conditionNames(registry, play.conditions)].filter((name) => name !== undefined);
    return {
      hp: max === undefined ? undefined : { current: currentHitPoints(play.hp, max), max, temp: play.hp.temp },
      dying,
      conditions: [...new Set(conditions)],
    };
  }
}

/** The name parts of the slugs of `active`; none when nothing is active, so the slug map is not built for nothing. */
function conditionNames(registry: ContentRegistry, active: PlayState['conditions']): readonly (string | undefined)[] {
  if (active.length === 0) {
    return [];
  }
  const slugs = new Map(registry.packs.flatMap((pack) => pack.otherEntries.map((entry) => [entry.id, entry.slug])));
  return active.map((each) => {
    const slug = slugs.get(each.condition);
    return slug === undefined ? undefined : slugName(slug);
  });
}
