/** A Foundry camel-case flag as a Pioneer slug: `druidicOrder` to `druidic-order`. */
export function kebab(flag: string): string {
  return flag.replaceAll(/(?<lower>[a-z0-9])(?<upper>[A-Z])/gu, '$<lower>-$<upper>').toLowerCase();
}

/** An item's name as a slug, the flag Foundry gives a `ChoiceSet` that names none: `Align the Stars` is `align-the-stars`. */
export function slugOf(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z\d]+/gu, '-')
    .replaceAll(/^-|-$/gu, '');
}
