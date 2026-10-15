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

export const FOUNDRY_IMPORTS: readonly FoundryImport[] = [
  { pack: PackId.parse('player-core'), book: BookId.parse('player-core'), release: 'pf2e-8.6.0' },
  { pack: PackId.parse('player-core-2'), book: BookId.parse('player-core-2'), release: 'pf2e-8.6.0' },
  { pack: PackId.parse('divine-mysteries'), book: BookId.parse('divine-mysteries'), release: 'pf2e-8.6.0' },
  { pack: PackId.parse('treasure-vault'), book: BookId.parse('treasure-vault'), release: 'pf2e-8.6.0' },
  { pack: PackId.parse('gm-core'), book: BookId.parse('gm-core'), release: 'pf2e-8.6.0' },
  { pack: PackId.parse('howl-of-the-wild'), book: BookId.parse('howl-of-the-wild'), release: 'pf2e-8.6.0' },
  { pack: PackId.parse('war-of-immortals'), book: BookId.parse('war-of-immortals'), release: 'pf2e-8.6.0' },
];

/** The release's page on GitHub. */
export function foundryReleaseUrl({ release }: FoundryImport): string {
  return `https://github.com/foundryvtt/pf2e/releases/tag/${release}`;
}
