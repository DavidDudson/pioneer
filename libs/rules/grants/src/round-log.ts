import type { PredicateFacts } from '@pioneer/rules/predicate';

import type { CharacterFacts } from './character-facts';
import type { GrantWalk } from './grant-walk';

/** One walk, the facts it read, and what its set derives. */
export interface Round {
  readonly walk: GrantWalk;
  readonly facts: PredicateFacts;
  readonly derived: CharacterFacts;
}

/** The rounds walked so far, and the round each state of the facts was first read in. */
export class RoundLog {
  readonly #rounds: Round[] = [];
  readonly #seen = new Map<string, number>();

  public get size(): number {
    return this.#rounds.length;
  }

  /** Records `round`, which read the facts named `fingerprint`. */
  public add(fingerprint: string, round: Round): void {
    this.#seen.set(fingerprint, this.#rounds.length);
    this.#rounds.push(round);
  }

  /** The rounds from the one that read `fingerprint` on; undefined when no round has read it. */
  public since(fingerprint: string): readonly Round[] | undefined {
    const start = this.#seen.get(fingerprint);
    return start === undefined ? undefined : this.#rounds.slice(start);
  }

  public latest(count: number): readonly Round[] {
    return this.#rounds.slice(-count);
  }
}
