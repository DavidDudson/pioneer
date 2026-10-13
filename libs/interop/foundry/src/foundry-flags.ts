/** A Foundry camel-case flag as a Pioneer slug: `druidicOrder` to `druidic-order`. */
export function kebab(flag: string): string {
  return flag.replaceAll(/(?<lower>[a-z0-9])(?<upper>[A-Z])/gu, '$<lower>-$<upper>').toLowerCase();
}
