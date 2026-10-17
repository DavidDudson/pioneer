# 0068. Creatures are GM-only, and players are granted sight of them

- Status: Proposed
- Date: 2026-10-17

## Context

Creature stat blocks (Monster Core, NPC Core and the adventure books) are the GM's secret: a player who can browse
the bestiary can read every monster's defences, weaknesses and abilities before meeting it. They still belong in
the global content system, with the browser, pages, search and rich-text links that every other kind has. A
player does need some creatures: a familiar, an animal companion, an eidolon, or the creature a spell turns them
into or summons (Plant Form, Animal Form, Summon Animal and the like).

Alternatives:

- **Audience per entry or per pack.** A flag on each entry is one more thing every import and every homebrew author
  must get right, and one missed flag leaks a stat block. A pack mixes kinds (an adventure book holds creatures
  and the feats a player may take), so a pack flag cannot do it either.
- **Creatures in their own GM-only pack.** Splits one book across packs and breaks the source reference of
  ADR-0005.
- **A separate store the GM unlocks per creature.** Adds a reveal workflow Pioneer does not need, since live play
  is in Foundry (ADR-0018).
- **Audience is a property of the kind, with reveals from grants** (chosen).

## Decision

- **Audience belongs to the content kind.** Each kind has an audience, `public` or `gm`. `creature` is `gm`, and
  `hazard` joins it when it arrives. Every player-facing kind stays `public`. A new kind states its audience when
  it is added, so a creature can't be public by omission, and an entry or a pack can't change it.
- **Who is a GM.** A viewer is a GM when they hold `campaign_members.role = gm` in any campaign. The check does not
  look at the campaign that enables the pack, and it does not give a pack's owner extra sight. A request with no
  campaign (the global browser, search, a deep link) is checked the same way, as "any campaign the viewer is GM
  of". A signed-out viewer is never a GM. We chose this over "a campaign that enables the entry's pack" because
  the audience check is a gate on the kind and not a permission model: it needs no campaign on the request, and
  official packs, which are enabled everywhere, would make it the same rule for official content anyway. The
  cost is for homebrew: a GM of any table can read a creature in a homebrew pack they have no part in, if they can
  read the pack (ADR-0055). Reading the pack stays the first check, so a private pack's creatures remain private.
- **The refusal.** A creature the viewer may not see is a 404 on its entry route, absent from bundles, lists,
  facets and search (counts included), and nothing about its id or name appears elsewhere. This is the stance of
  ADR-0055: a refusal and a missing entry look the same.
- **Reveal by grant.** A character's resolved grants (ADR-0004: stored inputs, resolved by the engine) may add
  creature ids to the set its owner can see. The sources are a familiar, an animal companion, an eidolon, and a
  spell or feature that makes or summons a creature. The reveal is exactly the granted ids, for as long as the
  grant holds: remove the familiar, change the spell prepared, or delete the character, and the creature is
  refused again. A grant reveals to the character's owner only, not to the party. A GM sees every creature
  already, so a grant adds nothing for them.
- **Rich text and refs.** Where a description, spell or adventure links a creature the viewer cannot see, the link
  renders as its plain label, with no anchor, no id and no hover. The label is the author's text, so it can name
  the creature; that is the author's choice, not a leak from the store. A viewer with sight sees the link as any
  other. The text is the same for every viewer and the resolution is client-side, so shared description bundles
  need no per-user variants.
- **Offline and cache.** The public bundles and manifest never contain a `gm` kind, so they stay shared and
  immutable. Creature bundles are served the way homebrew bundles are (ADR-0055 and the delivery section of
  `content-model.md`): per viewer, `private`, and kept in memory for the session, never in IndexedDB. A creature
  therefore leaves the browser when the session ends, when the viewer stops being a GM, or when the grant goes,
  and the viewer's next manifest drops it. The cost is that creatures are not available offline; a familiar's
  stat block on the sheet needs the network until the character stores what it needs.

## Consequences

- The serve-to-GMs story ([#1014 feat(content): serve creature entries to GMs only](https://github.com/DavidDudson/pioneer/issues/1014))
  gives each kind an audience, a `CreatureAudience` check in the content services, and the private bundle route.
- The grant story ([#1015 feat(rules): a character's grants reveal creatures to its player](https://github.com/DavidDudson/pioneer/issues/1015))
  computes the granted ids from the engine's output.
- The schema stories ([#1016 feat(rules): creature stat blocks hold skills, senses, strikes, abilities and spellcasting](https://github.com/DavidDudson/pioneer/issues/1016)
  and [#1017 feat(rules): creatures are monsters or NPCs](https://github.com/DavidDudson/pioneer/issues/1017))
  and the importer stories (#1018 to #1020) add no access rules.
- The UI stories ([#1021 feat(content): creature stat block in the content browser](https://github.com/DavidDudson/pioneer/issues/1021),
  [#1022 feat(content): bestiary in the content browser and global search, GM-only](https://github.com/DavidDudson/pioneer/issues/1022)
  and [#1023 feat(content): links to creatures a viewer cannot see stay hidden](https://github.com/DavidDudson/pioneer/issues/1023))
  follow the refusal and link rules above.
- Playing a GM in one throwaway campaign unlocks the bestiary for the account. Revisit the GM rule if homebrew
  creatures need to stay out of sight of GMs outside the pack's campaigns.
- Offline use of a granted creature waits on a way to store it with the character.
