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

/** A condition on a character: the name part of its slug, and its value when it is valued. */
export interface VitalCondition {
  readonly name: string;
  readonly value?: number | undefined;
}

/** How a character stands, for a party panel: Hit Points, how close to death, and the conditions on it. */
export interface Vitals {
  /** Undefined while no maximum can be worked out: the build has no ancestry or class yet. */
  readonly hp: VitalHitPoints | undefined;
  /** The dying value, 0 when not dying; a dead character is at the highest. */
  readonly dying: Dying;
  /** Its conditions, the death track's first (`dying`, `wounded`, `doomed`), each once at its highest value. */
  readonly conditions: readonly VitalCondition[];
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
    const track: readonly (VitalCondition | undefined)[] = [
      dying > 0 ? { name: 'dying', value: dying } : undefined,
      play.wounded > 0 ? { name: 'wounded', value: play.wounded } : undefined,
      play.doomed > 0 ? { name: 'doomed', value: play.doomed } : undefined,
    ];
    return {
      hp: max === undefined ? undefined : { current: currentHitPoints(play.hp, max), max, temp: play.hp.temp },
      dying,
      conditions: onceEach([...track, ...activeConditions(registry, play.conditions)]),
    };
  }
}

/** The conditions in `listed` in the order first seen, each once at its highest value; the unnamed are left out. */
function onceEach(listed: readonly (VitalCondition | undefined)[]): readonly VitalCondition[] {
  const byName = new Map<string, VitalCondition>();
  for (const each of listed) {
    if (each !== undefined) {
      const seen = byName.get(each.name);
      byName.set(each.name, seen === undefined ? each : { name: each.name, value: highest(seen.value, each.value) });
    }
  }
  return [...byName.values()];
}

/** The higher of two values; none when neither condition is valued. */
function highest(left: number | undefined, right: number | undefined): number | undefined {
  return left === undefined || right === undefined ? (left ?? right) : Math.max(left, right);
}

/** The name part of the slug of each of `active`, with its value; none when nothing is active, so the slug map is not built for nothing. */
function activeConditions(
  registry: ContentRegistry,
  active: PlayState['conditions'],
): readonly (VitalCondition | undefined)[] {
  if (active.length === 0) {
    return [];
  }
  const slugs = new Map(registry.packs.flatMap((pack) => pack.otherEntries.map((entry) => [entry.id, entry.slug])));
  return active.map((each): VitalCondition | undefined => {
    const slug = slugs.get(each.condition);
    return slug === undefined ? undefined : { name: slugName(slug), value: each.value };
  });
}
