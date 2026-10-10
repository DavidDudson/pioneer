import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { Domain, RuleElementKey, RuleIndex, ToggleKey } from '@pioneer/rules/sdk';
import type {
  ContentId,
  Origin,
  Predicate,
  RollOption,
  RollOptionElement,
  RuleElement,
  Slug,
} from '@pioneer/rules/sdk';

import type { GrantEntry } from './grant-entry';
import { optionOf } from './option-of';

/** How the player left a toggle: on or off, and the suboption picked, for one that has them. */
export interface ToggleState {
  readonly on: boolean;
  readonly suboption: Slug | undefined;
}

/** The character's toggles, by key. A toggle left out keeps the `value` its element starts with. */
export type ToggleStates = ReadonlyMap<ToggleKey, ToggleState>;

/** A toggleable `RollOption` on the character: where it is, what it sets, and its state this derivation. */
export interface ToggleSlot {
  readonly key: ToggleKey;
  /** Hops down to the entry holding the `RollOption`. */
  readonly origin: Origin;
  readonly rule: RuleIndex;
  readonly option: RollOption;
  readonly on: boolean;
  /** The suboptions whose predicates hold, in rule order. */
  readonly suboptions: readonly Slug[];
  /** The suboption in force: the one picked if it is offered, else the first offered. */
  readonly suboption: Slug | undefined;
}

/** The roll options one entry's `RollOption` elements set, and its toggles. */
export interface EntryOptions {
  readonly options: readonly RollOption[];
  readonly toggles: readonly ToggleSlot[];
}

/** The domain every roll sees; options in any other domain only reach rolls in it, never grant predicates. */
const ALL_DOMAIN = Domain.parse('all');

/**
 * The toggle of rule `rule` on entry `entry`. The entry is on the character once, so the pair names one toggle
 * however the entry got there.
 */
export function toggleKeyOf(entry: ContentId, rule: RuleIndex): ToggleKey {
  return ToggleKey.parse(`${entry}:${rule}`);
}

function isRollOption(element: RuleElement): element is RollOptionElement {
  return element.key === RuleElementKey.RollOption;
}

const holds = (predicate: Predicate | undefined, facts: PredicateFacts): boolean =>
  predicate === undefined || evaluatePredicate(predicate, facts) === Truth.True;

/** One entry's `RollOption` elements, read against one round's facts. */
class OptionReader {
  readonly #origin: Origin;
  readonly #facts: PredicateFacts;
  readonly #states: ToggleStates;
  readonly #options: RollOption[] = [];
  readonly #toggles: ToggleSlot[] = [];

  public constructor(origin: Origin, facts: PredicateFacts, states: ToggleStates) {
    this.#origin = origin;
    this.#facts = facts;
    this.#states = states;
  }

  public get read(): EntryOptions {
    return { options: this.#options, toggles: this.#toggles };
  }

  /** Sets the element's option if it reaches every roll and its predicate holds; a toggle only while it is on. */
  public element(element: RollOptionElement, rule: RuleIndex): void {
    const domain = element.domain ?? ALL_DOMAIN;
    if (domain !== ALL_DOMAIN || !holds(element.predicate, this.#facts)) {
      return;
    }
    if (element.toggleable === true) {
      this.#toggle(element, rule);
    } else if (element.value !== false) {
      this.#options.push(element.option);
    }
  }

  /** A toggle sets its option while on, and `<option>:<suboption>` for the suboption in force. */
  #toggle(element: RollOptionElement, rule: RuleIndex): void {
    const key = toggleKeyOf(this.#origin.entry, rule);
    const state = this.#states.get(key);
    const on = state?.on ?? element.value === true;
    const suboptions = (element.suboptions ?? [])
      .filter((suboption) => holds(suboption.predicate, this.#facts))
      .map((suboption) => suboption.value);
    const suboption = suboptions.find((offered) => offered === state?.suboption) ?? suboptions[0];
    this.#toggles.push({ key, origin: this.#origin, rule, option: element.option, on, suboptions, suboption });
    if (!on) {
      return;
    }
    this.#options.push(element.option);
    const withSuboption = suboption === undefined ? undefined : optionOf(element.option, suboption);
    if (withSuboption !== undefined) {
      this.#options.push(withSuboption);
    }
  }
}

/** An entry on the character and the origin that put it there. */
export interface PlacedEntry {
  readonly entry: GrantEntry;
  readonly origin: Origin;
}

/**
 * The roll options `entry`'s `RollOption` elements set, against `facts`: each in the `all` domain whose predicate
 * holds, a static one unless its `value` is false, a toggle while it is on (from `states`, else its `value`). Every
 * toggle whose predicate holds is listed, on or off.
 */
export function entryOptions(
  { entry, origin }: PlacedEntry,
  facts: PredicateFacts,
  states: ToggleStates,
): EntryOptions {
  const reader = new OptionReader(origin, facts, states);
  for (const [index, element] of entry.rules.entries()) {
    if (isRollOption(element)) {
      reader.element(element, RuleIndex.parse(index));
    }
  }
  return reader.read;
}
