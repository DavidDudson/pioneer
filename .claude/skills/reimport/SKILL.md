---
name: reimport
description: Re-run the Foundry content import on a pack that already has hand-made additions (descriptions, rules, dismiss flags, prerequisite predicates, hand-placed effects) without losing them. Use when the user says "reimport", "re-import <pack>", "run content-import again", or after a translator change that needs a pack regenerated.
argument-hint: '<pack> [book]'
---

# Re-import a pack and keep the hand additions

`just content-import` overwrites the entry files it writes in `content/packs/<pack>/` (ADR-0031) and leaves any other
file there, such as the hand-made `environment.json`. Everything done by hand since the last import in the files it
writes is gone from the working tree, and the importer cannot tell it was there. The committed JSON is the source
of truth, so a re-import is only done as: **import, restore hand additions from HEAD, review the diff, commit.**
Never commit the raw import.

## What the importer destroys (seen so far)

- `data.dismiss` / `data.dismissNote` on spells; `data.modes`, `skills`, `universal`, `minimumProficiency` on actions;
  `data.prerequisitePredicate` on feats.
- Descriptions: link text and names the enrichers drop (`Granted by  or .`), trailing `Effect: X` links, Foundry
  typos hand-fixed (`gladatorial`, `succeeded`, `Decease`), class/ancestry names appended to the text.
- Rules: hand-fixed rules (`access`, `rollOption`/`prompt` on a ChoiceSet, spelling in selectors), whole hand-built
  rule lists (Humanoid Form's sizes, senses and untrained bonus, Deity (Cleric)), rules moved out of the backlog.
- Whole entries the ticket added by hand (they are absent from the import).
- The vocabulary slug of a Foundry typo: `core-rules/imported/<pack>/statistic.json` re-mints ids and slugs from the
  misspelling (`statistic:gladatorial-lore`). Restore that file from HEAD.
- Rule order is reshuffled; that is noise, not a change.

## Steps

1. Clean tree on the branch (`ws status`). Run everything in `nix develop -c`, commit with `SKIP=oxfmt`.
2. Dry run: `just content-import --pack <pack> --book <book> --dry-run`. Read the counts.
3. Import: `just content-import --pack <pack> --book <book>`. It writes `content/packs/<pack>/`, the vocabulary
   under `core-rules/imported/<pack>/` and `content/import/<pack>.json`. A `typos` complaint about the backlog file
   is Paizo's spelling; allowlist it in `_typos.toml` only if the file is new.
4. Restore: `just content-restore --pack <pack>` (add `--dry-run` to look first). Per entry id against HEAD:
   description, rules (HEAD's list wins when it holds a rule the import lacks) and dropped `data` keys come back;
   keys the import now sets stay. Read the report. Entries marked `NOT IN THE IMPORT` were hand-added: copy them
   back by id from `git show HEAD:<file>`.
5. Review what is left: `git diff --stat`, then per entry compare with HEAD. A semantic diff ignores rule order;
   what should remain is only importer gains (new translated rules, `variants`, `damage`, `skillIncreaseLevels`,
   new entries). Anything else is a hand edit the restore missed: restore it by id, reverse-applying only the bad
   hunks. Never `git checkout` a whole file, because good importer changes are mixed in.
6. Revert the vocabulary typo ids: `git restore content/packs/core-rules/imported/<pack>/` where the diff only
   renames a hand-fixed slug.
7. New pack files (`creature.json`, `ritual.json`): register them in `libs/rules/catalog/src/*-packs.js`
   (the importer prints which).
8. Check: `bunx nx run rules-catalog:test`, `bun run lint:workspace`; DB tests need `just db-up`.
9. Commit `feat(content): ...` stating what the re-import brought in and that hand additions were restored.

## Adding hand data so the next re-import survives it

The restore only protects `description`, `rules`, traits the import lacks and keys under `data` (a value the import
left blank comes back too). A hand addition anywhere else (a new top-level field, a changed `level`, `sources`) is
lost. Put it under `data`, in a rule, or extend
`tools/content-import/restore-additions.ts` and say so here. Prefer teaching the importer the translation over a
hand edit when the data comes from Foundry.

## Limits

"HEAD wins" cannot tell a hand edit from the importer now translating the same field better. After a translator
change, check the restored descriptions and rules of the entries that translator touches.
