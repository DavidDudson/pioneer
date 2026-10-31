import * as z from 'zod';

import type { EntryReferences } from './entry-references';

/**
 * A cleric's doctrine, as Foundry wires it. The Warpriest and Cloistered Cleric features set `flags.system.cleric` with
 * an `ActiveEffectLike` to the names of their six doctrine features, and the generic First to Final Doctrine features
 * (granted by the class at their levels) grant whichever the flag names:
 * `GrantItem { uuid: "{actor|flags.system.cleric.firstDoctrine}" }`. Pioneer has no actor flags (ADR-0008), so each
 * generic feature grants its doctrine's feature for each doctrine, gated on the doctrine feature being on the
 * character. The `ActiveEffectLike` sets only that flag, so it is dropped when it names Player Core's doctrines; one that
 * names any other doctrine is left for the import report, as nothing replaces it.
 */

/** Player Core's two doctrines: the name Foundry gives them after a feature's name, and the option each one sets. */
const DOCTRINES = [
  { name: 'Warpriest', option: 'feature:warpriest' },
  { name: 'Cloistered Cleric', option: 'feature:cloistered-cleric' },
] as const;

const CLASS_FEATURES = 'Compendium.pf2e.classfeatures.Item.';

const FLAG_PATH = 'flags.system.cleric';

const DoctrineGrant = z.object({
  key: z.literal('GrantItem'),
  uuid: z.string().regex(/^\{actor\|flags\.system\.cleric\.[A-Za-z]+\}$/u),
});

const DoctrineFlag = z.object({
  key: z.literal('ActiveEffectLike'),
  path: z.literal(FLAG_PATH),
  value: z.record(z.string(), z.string()),
});

/** Whether `uuid` names a doctrine feature of one of the doctrines `withDoctrineGrants` grants for. */
function isKnownDoctrine(uuid: string): boolean {
  return DOCTRINES.some(({ name }) => uuid.endsWith(`(${name})`));
}

/**
 * Whether `raw` is the `ActiveEffectLike` a doctrine feature uses to set the flag the generic doctrine features read,
 * for doctrines whose grants are replaced: another doctrine's flag has no grant to stand for it.
 */
export function isDoctrineFlag(raw: unknown): boolean {
  const flag = DoctrineFlag.safeParse(raw);
  return flag.success && Object.values(flag.data.value).every((uuid) => isKnownDoctrine(uuid));
}

/** `firstDoctrine` as `First Doctrine`, the name of the generic feature that reads the flag. */
function featureName(flag: string): string {
  const words = flag.replaceAll(/(?<capital>[A-Z])/gu, ' $<capital>').trim();
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

/**
 * `raws` with each grant of the doctrine flag's feature replaced by one grant per doctrine, `First Doctrine
 * (Warpriest)` while the character has the warpriest feature. A doctrine whose feature the import does not know leaves
 * no grant.
 */
export function withDoctrineGrants(raws: readonly unknown[], references: EntryReferences): unknown[] {
  return raws.flatMap((raw): unknown[] => {
    const grant = DoctrineGrant.safeParse(raw);
    if (!grant.success) {
      return [raw];
    }
    const flag = grant.data.uuid.slice(grant.data.uuid.lastIndexOf('.') + 1, -1);
    return DOCTRINES.flatMap(({ name, option }): unknown[] => {
      const uuid = `${CLASS_FEATURES}${featureName(flag)} (${name})`;
      return references.byUuid.has(uuid) ? [{ key: 'GrantItem', uuid, predicate: [option] }] : [];
    });
  });
}
