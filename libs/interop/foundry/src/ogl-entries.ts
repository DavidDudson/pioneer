import { BookId, ContentLicense } from '@pioneer/rules/sdk';

import type { FoundryPublication } from './foundry-document';

/**
 * Open Game Content items that Foundry marks `OGL`, by Foundry slug and the book they are in: reprinted in an ORC
 * book, or printed only in a pre-remaster book (a `Book.legacy` of `listed`). They are taken whole and are legacy; an item in
 * an ORC book is marked `license: OGL`, and the book's Section 15 notice is on the Legal page (NOTICE.md). Adding one is a licensing decision like flagging a book `legacy` in the registry.
 */
const OGL_ENTRIES: ReadonlyMap<string, BookId> = new Map([
  ...[
    'alghollthu-lash',
    'atlatl',
    'authorized',
    'beginners-luck',
    'bound-guardian',
    'bravery-baldric-restoration',
    'bravery-baldric-restoration-greater',
    'buckle-armor',
    'catching',
    'dragon-throat-scale',
    'dragonscale-staff',
    'dragontooth-club',
    'effect-dragon-throat-scale',
    'effect-tacticians-helm-charges',
    'effect-wyrm-claw-armor',
    'fearcracker',
    'ghast-stiletto',
    'purloining-cloak',
    'retaliation-greater',
    'retaliation-lesser',
    'retaliation-major',
    'retaliation-moderate',
    'spraysling',
    'steal-luck',
    'taw-launcher',
    'three-section-naginata',
    'wand-of-shattering-images',
    'wyrm-claw',
    'wyrm-claw-greater',
    'wyrm-claw-major',
  ].map((slug): [string, BookId] => [slug, BookId.parse('treasure-vault')]),
  ...[
    'backpack-catapult-stones',
    'chain-reaction',
    'clockwork-disguise',
    'clockwork-goggles-major',
    'conjure-bullet',
    'construct-innovation',
    'cryomister-greater',
    'cryomister-major',
    'cutlery',
    'effect-arboreals-revenge-speed-penalty',
    'effect-blast-boots-major',
    'effect-exsanguinating-ammunition',
    'effect-hyldarfs-fang',
    'effect-immolation-clan-pistol',
    'effect-offensive-boost',
    'effect-overdrive-ally',
    'effect-protective-barrier',
    'effect-rowan-rifle-cold',
    'effect-rowan-rifle-electricity',
    'effect-rowan-rifle-sonic',
    'effect-unstable-check-failure',
    'energy-barrier',
    'evasion',
    'explode',
    'immolation-clan-pistol',
    'lucky-draw-bandolier-greater',
    'magnetite-scope',
    'magnetite-scope-greater',
    'repeating-crossbow',
    'repeating-crossbow-magazine',
    'repeating-heavy-crossbow',
    'repeating-heavy-crossbow-magazine',
    'rounds-fire-lance',
    'rounds-harmona-gun',
    'rounds-spike-launcher',
    'spell-effect-oaken-resilience-arboreals-revenge',
    'stubborn',
    'sunken-pistol',
    'unbelievable-luck',
    'unexpected-sharpshooter-dedication',
  ].map((slug): [string, BookId] => [slug, BookId.parse('guns-and-gears')]),
  ...['vital-luminance', 'brawling-focus'].map((slug): [string, BookId] => [slug, BookId.parse('core-rulebook')]),
  ...[
    'eye-for-numbers',
    'quick-change',
    'gorilla-stance',
    'gorilla-pound',
    'shadow-magic',
    'additional-shadow-magic',
    'shadow-illusion',
    'shadow-power',
  ].map((slug): [string, BookId] => [slug, BookId.parse('advanced-players-guide')]),
  ['verdant-sprout', BookId.parse('the-show-must-go-on')],
]);

/** The licence field an entry carries when it is not its pack's. */
export interface LicenseField {
  readonly license?: ContentLicense;
}

/** Whether the document is one of `OGL_ENTRIES` in its book and Foundry marks it Open Game License. */
export function isOglEntry(
  publication: FoundryPublication,
  book: BookId | undefined,
  slug: string | undefined,
): boolean {
  return (
    slug !== undefined &&
    book !== undefined &&
    publication.license === ContentLicense.Ogl &&
    OGL_ENTRIES.get(slug) === book
  );
}
