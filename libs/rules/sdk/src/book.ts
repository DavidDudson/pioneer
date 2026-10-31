import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, PlainDateCodec } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentLicense, ContentLicenseSchema } from './license';
import { RulesMessage } from './messages';
import { BookId } from './source-ref';

/** Who published a book. Only Paizo for now; third-party books join as they are imported. */
export const Publisher = { Paizo: 'paizo' } as const;
export type Publisher = ValueOf<typeof Publisher>;

/** A message key naming a book, a publisher or a licence. */
export const BookLabel = z.string().brand<'BookLabel'>();
export type BookLabel = z.infer<typeof BookLabel>;

/**
 * Each registered book's title, as a message key (ADR-0009): titles are translated like any other text, so the
 * registry stores none. A book without an entry here fails registry validation.
 */
export const BOOK_TITLES: ReadonlyMap<BookId, BookLabel> = new Map([
  [BookId.parse('player-core'), BookLabel.parse('rules.book.title.playerCore')],
  [BookId.parse('player-core-2'), BookLabel.parse('rules.book.title.playerCore2')],
  [BookId.parse('gm-core'), BookLabel.parse('rules.book.title.gmCore')],
  [BookId.parse('monster-core'), BookLabel.parse('rules.book.title.monsterCore')],
  [BookId.parse('monster-core-2'), BookLabel.parse('rules.book.title.monsterCore2')],
  [BookId.parse('npc-core'), BookLabel.parse('rules.book.title.npcCore')],
  [BookId.parse('divine-mysteries'), BookLabel.parse('rules.book.title.divineMysteries')],
  [BookId.parse('treasure-vault'), BookLabel.parse('rules.book.title.treasureVault')],
  [BookId.parse('howl-of-the-wild'), BookLabel.parse('rules.book.title.howlOfTheWild')],
  [BookId.parse('war-of-immortals'), BookLabel.parse('rules.book.title.warOfImmortals')],
  [BookId.parse('mwangi-expanse'), BookLabel.parse('rules.book.title.mwangiExpanse')],
  [BookId.parse('secrets-of-magic'), BookLabel.parse('rules.book.title.secretsOfMagic')],
  [BookId.parse('rage-of-elements'), BookLabel.parse('rules.book.title.rageOfElements')],
  [BookId.parse('impossible-lands'), BookLabel.parse('rules.book.title.impossibleLands')],
  [BookId.parse('character-guide'), BookLabel.parse('rules.book.title.characterGuide')],
  [BookId.parse('core-rulebook'), BookLabel.parse('rules.book.title.coreRulebook')],
  [BookId.parse('advanced-players-guide'), BookLabel.parse('rules.book.title.advancedPlayersGuide')],
  [BookId.parse('the-show-must-go-on'), BookLabel.parse('rules.book.title.theShowMustGoOn')],
  [BookId.parse('dark-archive-remastered'), BookLabel.parse('rules.book.title.darkArchiveRemastered')],
  [BookId.parse('tian-xia-character-guide'), BookLabel.parse('rules.book.title.tianXiaCharacterGuide')],
  [BookId.parse('impossible-magic'), BookLabel.parse('rules.book.title.impossibleMagic')],
  [BookId.parse('guns-and-gears'), BookLabel.parse('rules.book.title.gunsAndGears')],
  [BookId.parse('battlecry'), BookLabel.parse('rules.book.title.battlecry')],
  [BookId.parse('cheliax-infernal-inheritance'), BookLabel.parse('rules.book.title.chelaxInfernalInheritance')],
  [BookId.parse('rival-academies'), BookLabel.parse('rules.book.title.rivalAcademies')],
  [BookId.parse('shining-kingdoms'), BookLabel.parse('rules.book.title.shiningKingdoms')],
  [BookId.parse('draconic-codex'), BookLabel.parse('rules.book.title.draconicCodex')],
  [BookId.parse('hellfire-dispatches'), BookLabel.parse('rules.book.title.hellfireDispatches')],
  [BookId.parse('high-seas'), BookLabel.parse('rules.book.title.highSeas')],
  [BookId.parse('season-of-ghosts'), BookLabel.parse('rules.book.title.seasonOfGhosts')],
  [BookId.parse('hellbreakers'), BookLabel.parse('rules.book.title.hellbreakers')],
  [BookId.parse('gatewalkers'), BookLabel.parse('rules.book.title.gatewalkers')],
  [BookId.parse('myth-speakers'), BookLabel.parse('rules.book.title.mythSpeakers')],
  [BookId.parse('revenge-of-the-runelords'), BookLabel.parse('rules.book.title.revengeOfTheRunelords')],
  [BookId.parse('secrets-of-the-unlit-star'), BookLabel.parse('rules.book.title.secretsOfTheUnlitStar')],
  [BookId.parse('troubles-in-grayce'), BookLabel.parse('rules.book.title.troublesInGrayce')],
  [BookId.parse('hells-destiny'), BookLabel.parse('rules.book.title.hellsDestiny')],
  [BookId.parse('bastion-of-blasphemies'), BookLabel.parse('rules.book.title.bastionOfBlasphemies')],
  [BookId.parse('the-dead-gods-hand'), BookLabel.parse('rules.book.title.theDeadGodsHand')],
  [BookId.parse('wardens-of-wildwood'), BookLabel.parse('rules.book.title.wardensOfWildwood')],
  [BookId.parse('curtain-call'), BookLabel.parse('rules.book.title.curtainCall')],
  [BookId.parse('triumph-of-the-tusk'), BookLabel.parse('rules.book.title.triumphOfTheTusk')],
  [BookId.parse('spore-war'), BookLabel.parse('rules.book.title.sporeWar')],
  [BookId.parse('shades-of-blood'), BookLabel.parse('rules.book.title.shadesOfBlood')],
  [BookId.parse('prey-for-death'), BookLabel.parse('rules.book.title.preyForDeath')],
  [BookId.parse('claws-of-the-tyrant'), BookLabel.parse('rules.book.title.clawsOfTheTyrant')],
  [BookId.parse('clockwork-mystery'), BookLabel.parse('rules.book.title.clockworkMystery')],
  [BookId.parse('tian-xia-world-guide'), BookLabel.parse('rules.book.title.tianXiaWorldGuide')],
  [BookId.parse('foolish-housekeeping'), BookLabel.parse('rules.book.title.foolishHousekeeping')],
]);

export const PUBLISHER_LABELS: Readonly<Record<Publisher, BookLabel>> = {
  [Publisher.Paizo]: BookLabel.parse('rules.book.publisher.paizo'),
};

export const LICENSE_LABELS: Readonly<Record<ContentLicense, BookLabel>> = {
  [ContentLicense.Orc]: BookLabel.parse('rules.book.license.orc'),
  [ContentLicense.Ogl]: BookLabel.parse('rules.book.license.ogl'),
  [ContentLicense.PaizoCommunityUse]: BookLabel.parse('rules.book.license.paizoCup'),
  [ContentLicense.Homebrew]: BookLabel.parse('rules.book.license.homebrew'),
};

/** A book's own page on AoN, under Sources: `https://2e.aonprd.com/Sources.aspx?ID=216`. */
const AON_SOURCE = /^https:\/\/2e\.aonprd\.com\/Sources\.aspx\?ID=\d+$/u;
const URL_LENGTH_MAX = 2048;

export const AonSourceUrl = z
  .string()
  .max(URL_LENGTH_MAX)
  .refine((value) => AON_SOURCE.test(value), issueParams(message(RulesMessage.BookAonSourceUrl)))
  .brand<'AonSourceUrl'>();
export type AonSourceUrl = z.infer<typeof AonSourceUrl>;

/** One published book in the registry (content-model.md, "Books and source references"; ADR-0024). */
export const Book = z.strictObject({
  id: BookId,
  publisher: z.enum(Publisher),
  license: ContentLicenseSchema,
  remaster: z.boolean(),
  released: PlainDateCodec.optional(),
  aonSourceUrl: AonSourceUrl.optional(),
});
export type Book = z.infer<typeof Book>;

const BOOKS_MAX = 512;

/** The whole registry: each book once, and each with a title key in `BOOK_TITLES`. */
export const Books = z
  .array(Book)
  .max(BOOKS_MAX)
  .readonly()
  .check((context) => {
    const seen = new Set<BookId>();
    for (const [index, { id }] of context.value.entries()) {
      if (seen.has(id)) {
        context.issues.push({
          code: 'custom',
          input: context.value,
          path: [index, 'id'],
          ...issueParams(message(RulesMessage.ListDuplicate, { value: id })),
        });
      }
      if (!BOOK_TITLES.has(id)) {
        context.issues.push({
          code: 'custom',
          input: context.value,
          path: [index, 'id'],
          ...issueParams(message(RulesMessage.BookUntitled, { book: id })),
        });
      }
      seen.add(id);
    }
  });
export type Books = z.infer<typeof Books>;

/** The title key of a book. Registry validation guarantees every registered book has one. */
export function bookTitle(id: BookId): BookLabel {
  const title = BOOK_TITLES.get(id);
  if (title === undefined) {
    throw new Error(`${id} has no title key`);
  }
  return title;
}
