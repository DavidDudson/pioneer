# Familiar spells

Output of the spike [#2045 spike(rules): familiar spell repository, formulas and learning](https://github.com/DavidDudson/pioneer/issues/2045).
Rule text was read from the Archives of Nethys search index on 2026-11-28 (ADR-0073): the Witch class (Player Core 2),
Learn a Spell (Player Core pg. 230), Cantrip Connection (Player Core pg. 214) and Spell Battery (Player Core pg. 214).
Rows marked **assumption** have no quotable rule. Supersedes the caveat at the end of
[ADR-0044](../adr/0044-prepared-spells-are-choice-slots.md): a witch prepares from what the familiar knows, and from this
design on the build records what it knows.

## The rules

| Rule               | Text                                                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repository         | The familiar is the witch's "repository of the spells your patron has bestowed". The witch prepares each morning from the spells it knows. She cannot prepare from another witch's familiar.                             |
| Starting spells    | 10 cantrips, five 1st-rank spells and one more from the patron's initial lesson, chosen from the common spells of the patron's tradition or other spells of that tradition she has access to.                            |
| Each level         | The patron teaches the familiar two new spells of any rank the witch can cast, from common spells of the tradition or others she has access to. Feats can grant more.                                                    |
| Scroll or copy     | The familiar learns any spell on the tradition's list by physically consuming a written version of it over 1 hour: a scroll, or a copy the witch prepared with the Learn a Spell activity.                               |
| Teaching           | The witch and her familiar use Learn a Spell to teach the familiar a spell from another witch's familiar. Both familiars stay present the whole time, the spell is on her tradition's list, and she pays the usual cost. |
| Learn a Spell      | 1 hour per spell rank, in conversation with someone who knows it or holding magical writing; materials of the table's Price; a skill check for the tradition. Critical success spends half the materials.                |
| Death              | The patron replaces a dead familiar during the next daily preparations. It "knows the same spells your former familiar knew regardless". Spells already prepared are unaffected.                                         |
| Cantrip Connection | A master ability: the master prepares one more cantrip, or designates one to add to a repertoire; it can be retrained.                                                                                                   |
| Spell Battery      | A master ability: one more spell slot at least 3 ranks below the highest slot; needs 4th-rank slots.                                                                                                                     |

## Decisions

1. **The spell list belongs to the character, in `build.choices`, keyed to the witch and not to the companion row.**
   Slots are `familiar:cantrip:<n>` and `familiar:rank:<rank>:<n>` (the same shape as `prepared:` in ADR-0044), plus one
   `familiar:lesson` slot for the patron's spell. ADR-0079 sketched `companion:<id>:spell:<n>`; that key dies with the
   row, and the rule says the replacement knows the same spells. **Reason.** A key that does not change on replacement
   makes the carry-over free: nothing is copied, so a dead familiar, a replaced one and a resurrected one all read the
   same list. [#2065](https://github.com/DavidDudson/pioneer/issues/2065) is corrected to say so (its "stored with the
   familiar" means the list lives with the witch's familiar line, not in the creature's row).
2. **A repository is a build concept with two owners today: a wizard's spellbook and a witch's familiar.** Both are
   "the spells I may prepare from". Prepared slots offer the repository's spells and no longer the tradition's whole
   list (`preparedSlots` reads the repository for an entry that has one). **Reason.** This ends the caveat in ADR-0044
   without a second picker: preparation is still a choice slot, with its statuses and refusals.
3. **Starting spells are slots opened by the witch class at level 1; each level opens two more.** The starting count
   (10, 5, 1) and the level-up count (2) are `ChoiceSlots` elements on the class, as ADR-0041 does for spell slots.
   A level-up slot takes a spell of any rank the character can cast at that level. Feat grants add slots the same way.
   **Reason.** Content owns the numbers, the engine owns the machinery.
4. **Learning in play adds a pick.** Consuming a scroll or a copy, or being taught, appends a known spell. The scroll
   is consumed from the inventory, so the edit is one command: remove the item, add the pick. The hour is not timed
   (nothing times downtime yet; [Epic 5.13: Downtime activities](https://github.com/DavidDudson/pioneer/issues/461)
   will). The check and price of Learn a Spell are the player's to record, as access is in ADR-0044. **Assumption:** a
   spell already known is refused rather than learned twice.
5. **Teaching from another witch's familiar needs no new state.** It is the same add, with a note of whose familiar
   taught it in the audit log. Both familiars being present is a table rule. **Reason.** Nothing in play state can prove
   the other familiar was there.
6. **A familiar stores no formulas.** The index has no familiar ability that stores formulas, and no witch text says
   so. Formulas stay in the character's formula book
   ([#514](https://github.com/DavidDudson/pioneer/issues/514)). [#2069](https://github.com/DavidDudson/pioneer/issues/2069)
   has no rule behind it: close it unless a source turns up. **Reason.** An invented rule would give the familiar a
   second repository the rules never describe.
7. **Replacement keeps the list, and so do death and resurrection.** A dead familiar's spells stay readable in the build
   (a witch with a dead familiar cannot prepare, which is table play: she needs her familiar to prepare, and the sheet
   only warns). Prepared spells are play state and a death touches nothing in them.
8. **Master abilities that add a prepared cantrip add a slot to the entry, not a known spell.** Cantrip Connection adds
   one prepared cantrip to any caster with the ability; a witch still prepares it from what the familiar knows.
   Spell Battery adds one slot of the entry. Both are master abilities on the master's sheet (familiars.md section 5).
   **Reason.** The prepared count and the known list are different numbers; only the first changes.

## Stories

| Story                                                                                                       | Verdict                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [#2065 a familiar knows spells](https://github.com/DavidDudson/pioneer/issues/2065)                         | **Correct.** Slots are keyed to the witch's familiar line (decision 1), not to the companion row.                                  |
| [#2066 a witch's familiar learns spells at each level](https://github.com/DavidDudson/pioneer/issues/2066)  | Confirmed. Two slots per level and the 10, 5, 1 start are `ChoiceSlots` on the class (decision 3). Blocked by #2065.               |
| [#2068 a familiar learns a spell from a scroll or copy](https://github.com/DavidDudson/pioneer/issues/2068) | Confirmed. One command removes the scroll and adds the pick; teaching joins it (decisions 4, 5).                                   |
| [#2069 the familiar stores formulas for a formula book](https://github.com/DavidDudson/pioneer/issues/2069) | **Close.** No source gives a familiar formulas (decision 6).                                                                       |
| [#2070 the Spells tab marks what the familiar holds](https://github.com/DavidDudson/pioneer/issues/2070)    | Confirmed. The mark reads the repository (decision 2).                                                                             |
| [#2073 a witch's patron replaces a dead familiar daily](https://github.com/DavidDudson/pioneer/issues/2073) | Corrected: it copies nothing, because the list is keyed to the line. The replacement is a new row and the picks stay (decision 7). |
