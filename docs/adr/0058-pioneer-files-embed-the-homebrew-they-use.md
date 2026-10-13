# 0058. A Pioneer file embeds the homebrew it uses and never overwrites on import

- Status: Accepted
- Date: 2026-10-14

## Context

A Pioneer character file ([0056](0056-pioneer-character-file-format.md)) names content by pack and slug. That is enough
for official content, which every server loads. A homebrew feat or item is not on the importer's server, so a file that
only named it would import as ids that resolve to nothing. Homebrew is also someone's work: the file must keep who made
it and under what licence ([0005](0005-mandatory-source-references.md)), and an import must not be a way to change or
read another user's pack ([0007](0007-oauth-required-public-content.md), [0055](0055-campaign-packs-and-the-enablement-port.md)).

An entry's id is a UUIDv5 of `<pack slug>/<entry slug>` ([0034](0034-entry-slugs-name-their-kind.md)) and a pack slug is
unique across every pack on a server. A pack therefore cannot be re-homed under another slug without changing the id of
every entry in it, and so every reference to them in the character.

## Decision

- **The file carries the homebrew the character uses.** An optional `homebrew` list sits beside `character`: for each
  pack its manifest (pack id, title, publisher and the `homebrew` licence) and the entries the character references, as
  the content tables hold them. Each entry keeps its `sources`, and the entry schema checks its id against its pack and
  slug, so a file cannot claim another entry's id. Only homebrew is embedded, never official content. The list is
  absent when the character uses none, so such files are unchanged and `formatVersion` stays 1: every file written
  before still reads as it did.
- **Export finds homebrew by id.** Content the loaded packs name is named as before. Any id left over is looked up among
  the homebrew packs the exporter may read (`PackAccessPolicy`); what is found is embedded. An id still unnamed fails
  the export, as before.
- **Import keeps pack and entry ids, and never overwrites.** For each embedded pack:
  - the pack id is free: a new pack of the importer's is made, private, holding the entries;
  - the importer owns the pack: entries it lacks are added; an identical one is reused; a different one is a clash;
  - another user's pack (or an official one): nothing is added; an identical entry is reused; the rest are clashes.
    A pack the importer may not read is compared as if empty, so a file cannot be used to test whether a private pack
    holds an entry.
- **A clash is reported, never written.** The character still imports; its reference is the same id, which resolves
  to what is already on the server, as an unmatched reference does today. Identical means equal canonical JSON.
- **The preview reports it.** `PioneerImportPreview.homebrew` lists each pack's status (`new`, `own`, `taken`) and each
  entry's outcome (`create`, `reuse`, `clash`). Embedded entries are not listed as unmatched content. The import reads
  the file again and plans again on the server, so the preview is advice, not input.
- **A port, not a dependency.** The character context reaches homebrew through `EmbeddedHomebrew`; the adapter
  (`PioneerEmbeddedHomebrew`) is in the composition root because neither context may import the other. Pioneer file
  use cases moved from `CharacterService` to `PioneerFileService` with it.
- **Writes are one change per pack.** Adding entries locks the pack row, inserts the entries beside the ones it has
  (existing ids are left alone), and moves the pack's version, hash and time on. A pack that stopped being the
  importer's between planning and writing gets nothing.

## Consequences

- The importer ends up with a private copy of any homebrew pack they did not have. Sharing it is their choice
  ([0055](0055-campaign-packs-and-the-enablement-port.md)).
- Dependencies between packs are not carried yet: an embedded pack is made with none, and the entries' references to
  other packs stay as ids. A story for them can add the pack's `extends` to the file and link what the importer has.
- Only the entries the character uses are embedded, so an imported pack may be a part of the original. The importer who
  later gets the whole pack finds the entries identical and reused.
- A character that uses homebrew from a pack its owner can no longer read cannot be exported until they can read it.
