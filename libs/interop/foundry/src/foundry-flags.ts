/** A Foundry camel-case flag as a Pioneer slug: `druidicOrder` to `druidic-order`. */
export function kebab(flag: string): string {
  return flag.replaceAll(/(?<lower>[a-z0-9])(?<upper>[A-Z])/gu, '$<lower>-$<upper>').toLowerCase();
}

/**
 * An item's name as the flag Foundry gives a `ChoiceSet` that names none: `Align the Stars` is `align-the-stars`. Not
 * `slugify`: any run of characters outside `a-z` and digits becomes one hyphen, so `Champion's Reaction` is
 * `champion-s-reaction`, which the pinned Foundry flags and the roll options built on them already use.
 */
export function defaultFlag(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z\d]+/gu, '-')
    .replaceAll(/^-|-$/gu, '');
}
