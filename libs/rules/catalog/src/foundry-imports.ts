import { BookId, PackId } from '@pioneer/rules/sdk';

/**
 * The official packs imported once from the Foundry pf2e system and the release each came from (ADR-0031), for the
 * Legal page and NOTICE.md. The pin itself lives in `content/import/<pack>.json` beside the import's backlog, which is
 * never bundled, so the release is repeated here; a test keeps the two in step.
 */
export interface FoundryImport {
  readonly pack: PackId;
  /** The book the pack holds, whose title names it. */
  readonly book: BookId;
  /** The foundryvtt/pf2e release tag the pack was imported from. */
  readonly release: string;
}

/**
 * A pack that holds one book of the same id, imported at the one pinned release. Built by a function rather than as
 * a literal per pack: the Angular compiler gave up (TS2859) reducing a union of this many branded object literals.
 */
function imported(id: string): FoundryImport {
  return { pack: PackId.parse(id), book: BookId.parse(id), release: 'pf2e-8.6.0' };
}

export const FOUNDRY_IMPORTS: readonly FoundryImport[] = [
  imported('player-core'),
  imported('player-core-2'),
  imported('divine-mysteries'),
  imported('treasure-vault'),
  imported('gm-core'),
  imported('monster-core'),
  imported('monster-core-2'),
  imported('howl-of-the-wild'),
  imported('war-of-immortals'),
  imported('mwangi-expanse'),
  imported('secrets-of-magic'),
  imported('rage-of-elements'),
  imported('tian-xia-character-guide'),
  imported('dark-archive-remastered'),
  imported('character-guide'),
  imported('impossible-lands'),
  imported('impossible-magic'),
  imported('guns-and-gears'),
  imported('battlecry'),
  imported('cheliax-infernal-inheritance'),
  imported('rival-academies'),
  imported('shining-kingdoms'),
  imported('draconic-codex'),
  imported('hellfire-dispatches'),
  imported('high-seas'),
  imported('season-of-ghosts'),
  imported('hellbreakers'),
  imported('gatewalkers'),
  imported('myth-speakers'),
  imported('revenge-of-the-runelords'),
  imported('secrets-of-the-unlit-star'),
  imported('troubles-in-grayce'),
  imported('hells-destiny'),
  imported('bastion-of-blasphemies'),
  imported('the-dead-gods-hand'),
];

/** The release's page on GitHub. */
export function foundryReleaseUrl({ release }: FoundryImport): string {
  return `https://github.com/foundryvtt/pf2e/releases/tag/${release}`;
}
