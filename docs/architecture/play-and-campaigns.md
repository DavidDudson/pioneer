# Play, campaigns and interop

## Actions and the action economy

Actions are content (`action` kind): basic actions, skill actions, exploration and downtime activities, and
actions granted by feats, class features, items and spells.

```ts
interface ActionData {
  cost:
    | { kind: 'actions'; count: 1 | 2 | 3 }
    | { kind: 'reaction' }
    | { kind: 'free' }
    | { kind: 'activity'; duration: Duration }
    | { kind: 'variable'; min: 1; max: 3 };
  modes: readonly ('encounter' | 'exploration' | 'downtime')[];
  requirements?: Predicate; // e.g. wielding a shield, not prone
  trigger?: RichText; // reactions and free actions
  frequency?: Frequency; // once per round, once per day, ...
  minimumProficiency?: { selector: Selector; rank: Proficiency }; // trained-only skill actions
  roll?: { statistic: Selector; against?: DcRef }; // Demoralize: Intimidation vs Will DC
  outcomes?: Partial<Record<DegreeOfSuccess, RichText>>;
}
```

The engine produces an **available actions** list for the current state:

```ts
interface AvailableAction {
  action: ContentId;
  origin: Origin; // basic, skill, or granted by feat X
  cost: ActionCost;
  status: 'available' | 'conditional' | 'unavailable';
  reasons: readonly string[]; // "requires a raised shield", "used this round", "untrained in Arcana"
  roll?: Breakdown; // the modifier you would roll, already explained
}
```

UI behaviour:

- **Now view** (default in encounter mode): only actions available or conditional right now, grouped by cost,
  with the actions remaining this turn and whether the reaction is spent. Context changes the list: prone puts
  Stand and Crawl first, grabbed puts Escape first, a raised shield enables Shield Block.
- **All view:** everything the character can ever do, filterable by mode, trait, cost and source.
- Actions with rolls are one click to roll, and conditional modifiers for that roll are offered as toggles.

Turn tracking (actions spent, reaction used, start/end of turn effects such as frightened decreasing) is local to the
sheet. Campaign play runs in Foundry VTT, which tracks turns itself (ADR-0018).

### Turn cycle

The sheet plays a turn as three phases: **turn** (between Start turn and End turn), **off-turn** (after End turn,
until the next Start turn) and **out of encounter** (no turn running). The phase, actions remaining, reaction used
and the turn's spend log are play state.

- **Start turn** (button): runs start-of-turn bookkeeping (fast healing and regeneration, effects that end at the
  start of the turn, start-of-turn triggers), then refills the economy: 3 actions, adjusted by quickened (+1, with
  its restriction), slowed and stunned (minus their value, stunned counting down as actions are lost), and one
  reaction.
- **Spending**: Strike, Cast a Spell, activating an item or any other action deducts its cost when used. A
  variable-cost spell asks for the count (1 to 3) and spends that; free actions spend nothing; a reaction spends the
  reaction. Each spend is in the turn's log and can be undone, refunding the cost.
- **Filtering**: the Now view, Strikes, spells and items show only what fits the economy left. Actions costing more
  than remain are hidden from the Now view and shown as unavailable ("needs 2 actions, 1 left") in the All view.
  Off-turn, only reactions (while the reaction is unspent) and free actions with a trigger are offered.
- **End turn** (button): runs end-of-turn bookkeeping, then drops remaining actions to 0 and moves to off-turn, so
  only reactions are offered until the next Start turn. Persistent damage happens here: each persistent damage
  condition rolls its damage, applied through IWR, then its DC 15 flat check (lower with assisted recovery) to end
  it. Then frightened decreases and effects ending at the end of the turn expire.

#### Durations, sustaining and dismissing

- **Countdown**: Start turn counts down every active effect with a `time` duration by one round (a minute is 10
  rounds) and removes those that reach 0 with a `turn-start` expiry; End turn removes those with a `turn-end`
  expiry. An effect from another creature counts down on this character's Start turn, since the sheet does not
  know the other creature's turns; its remaining rounds can be edited.
- **Sustain**: casting a sustained spell adds it to the active list, lasting until the end of the next turn. During
  a turn each sustained spell offers Sustain (1 action, spent like any other); sustaining extends it to the end of
  the following turn, up to its maximum (10 minutes unless the spell says otherwise). End turn lists the sustained
  spells not sustained this turn and ends them on confirm, so none lapses unnoticed.
- **Dismiss**: any active spell or effect can be dismissed from the list at any time, which removes it and its
  effects. A spell that needs the Dismiss action spends 1 action when dismissed during the turn; elsewhere removal
  is free.

The **active list** shows every active spell and effect: name, source (cast by this character, applied by an ally,
a GM's boon), remaining duration or "sustained", and its Sustain and Dismiss buttons. It sits on the Encounter tab
beside the turn bar, and the shared header shows a count that opens it.

The Encounter tab carries the turn bar: phase, action pips (spent, left, quickened-only), reaction pip, Start turn
and End turn buttons, and the spend log with undo. Outside a turn the Encounter tab still lists actions, unfiltered
by cost.

### Triggered abilities

An ability that fires on an event ("after you cast a focus spell", "when you Strike", "at the start of your turn")
needs a structured trigger, since `trigger` is rich text. Actions and effects gain an optional `triggerEvent`
(`turn-start`, `turn-end`, `cast-spell` with a predicate such as `trait:focus`, `strike`, `damage-taken`, ...) that
the engine matches against turn events; the rich text stays as the displayed wording. Foundry has no such field, so
the importer enriches it, like sources: mapping files plus a matcher over the trigger text, with unmatched triggers
in the coverage report. An ability without a `triggerEvent` is never prompted or applied; it stays in the action
lists for the player to use by hand.

When an event fires, the matching abilities are collected:

- **Auto-apply** when the ability costs nothing (no action, no reaction, no resource) and only grants beneficial
  effects (temporary HP, a status bonus, healing). It applies at once with a toast naming the source, undoable from
  the spend log.
- **Prompt** otherwise: a reaction, a free action with a cost or frequency, anything with a choice, roll or
  drawback. The prompt lists each triggered ability with its cost; accepting spends it like any other action.

Whether an effect is beneficial is derived from its rule elements (temporary HP, healing, positive modifiers) and
overridable in content with `autoApply: false`.

## Sheet modes

The sheet is four tabs over the same character, with the header (name, level, HP, conditions, last roll) shared
by all four:

- **Plan**: who the character is mechanically. Build (ancestry, heritage, background, class), attributes, feats
  grouped by display category, and the level planner: one row per level from 1 to 20, what each level opens, what
  is picked or planned, and the archetype progress (see character-model.md, Archetype dedications).
- **Encounter**: the Now view, Strikes, items usable with the actions left, spells, actions and skills, with
  defences and conditions.
- **Exploration**: who the character is at the table. Appearance, personality, deity edicts and anathema,
  exploration activities, Perception, social and Recall Knowledge skills, languages and lore, inventory and notes.
- **Downtime**: daily preparations, rituals, crafting, earn income, retraining and the shop.

Encounter, Exploration and Downtime filter actions by the content's `modes`, so no list is hand-maintained. The
last tab is remembered per character, as a display preference (ADR-0013). On a narrow screen the tabs stay one
row and each tab's sections stack.

## Feat display

Many feats exist only to grant something else (a class feature that grants an action, a dedication that grants a
spell). Each effective feat gets a display category, derived from its rule elements and overridable with
`display.category` in content:

| Category     | Rule                                                        | Default view                    |
| ------------ | ----------------------------------------------------------- | ------------------------------- |
| `active`     | grants an action, reaction or activity                      | shown                           |
| `modifier`   | has numeric effects or roll notes                           | shown                           |
| `grant-only` | only `GrantItem`/`ChoiceSet`; its products appear elsewhere | hidden, folded under its grants |
| `narrative`  | no rule elements                                            | shown, collapsed                |

Granted things show "from Feat X" through their origin, so hiding the feat loses nothing. The filter is per user
and per sheet section.

## Conditions and effects

Conditions are content with values (frightened 2), implied conditions as `GrantItem` (unconscious grants
blinded and off-guard), overrides (_off-guard_ is one condition no matter how many sources), and durations:
rounds, until start or end of a turn, until removed, sustained. The engine treats active conditions and effects as
items in the effective set, so they show in breakdowns like anything else ("−2 status, frightened 2, from
Demoralize by Goblin Warrior, round 3").

End-of-turn bookkeeping (frightened decreasing, persistent damage flat checks, effect expiry) is a pure function
over play state and the turn event, so it can run in the browser and on the server identically.

### Boons

A boon is an effect with a source and a lifetime: a duration, permanent, or a number of uses that counts down as
the player spends them. A GM's boon (a god's blessing, a one-off favour) is an `effect` entry in the campaign's pack
(M7), which the player applies to their character. Buffs from allies (Aid, Bless, a feat that grants +1 to a roll)
are applied the same way by the player receiving them, with the giver recorded as the source; nothing writes to
another player's sheet (ADR-0018). Permanent boons are part of the build (`build.boons`), so Pioneer keeps them in
every sync mode; temporary ones are play state.

### Rest and daily preparations

Tables don't always get both, so they are separate actions, each optional and each previewing its changes before it
applies:

| Action             | Restores                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| Rest               | HP (Constitution modifier, at least 1, times level); removes fatigued; drained and doomed down 1  |
| Daily preparations | spell slots, prepared spells, focus points, staff charges, investment, per-day item and feat uses |
| Refocus            | one focus point                                                                                   |
| Start of session   | hero points to 1                                                                                  |

Each resource names the boundary it resets on (`round`, `turn`, `rest`, `day`, `session`), taken from the content's
`frequency`, so new resources join the right action without code.

### Staves and charged items

A staff is a spell source with its own list and a charge cost per spell. Daily preparations set its charges to the
holder's highest spell rank; a prepared caster can expend a slot to add charges, and a spontaneous caster can pay part
of a cast with a slot. A wand has one cast per day and an overcharge with its flat check and broken state. Charges and
uses are play state resources.

## Dice

`libs/rules/dice` is pure apart from an injected RNG port.

- Expressions: `1d20+7`, `2d6+1d4[fire]+4`, `4d6kh3`, persistent and splash damage, damage types per term.
- Fortune and misfortune: roll twice keep higher or lower; both cancel per the rules.
- Degree of success: compare to DC, ±10 for critical, natural 20 and natural 1 step the result, then
  `AdjustDegreeOfSuccess` effects.
- Damage application: critical doubling, immunity, weakness and resistance with the applied lines shown.
  Terms pool into one instance per damage type; untagged terms are untyped. Persistent damage stays apart, and
  splash joins the immediate damage of its type without doubling. Precision takes the attack's type: it joins the
  first immediate instance, and immunity to precision removes only that share. A critical doubles nothing against
  a target immune to `critical-hits`. Only the highest applicable weakness and resistance count per instance. A
  weakness or resistance names a damage type or a group: `physical` (bleed, bludgeoning, piercing, slashing, as
  in Foundry), `energy` (acid, cold, electricity, fire, force, sonic, vitality, void) or
  `all`, which also covers untyped damage. Importers map Foundry's all-damage key onto `all`.
- Every roll result keeps the full breakdown it was rolled with and the conditional toggles chosen, so the log can
  always answer "why 23?".

RNG: browser `crypto.getRandomValues`. Pioneer rolls are for solo play; shared and secret rolls in a campaign are
Foundry's.

## Campaigns

Live play runs in Foundry VTT ([ADR-0018](../adr/0018-foundry-is-the-live-play-surface.md)). Pioneer does not
build an event log, combat log, encounter tracker or GM tools; a campaign groups a party and links it to a Foundry
world.

```text
campaigns             id, version, name, gm_id, play_sync (foundry | pioneer | disconnected), created_at
campaign_members      id, campaign_id, user_id, role (gm | player), joined_at
                      (campaign_id, user_id) unique; one gm per campaign
campaign_invites      id, campaign_id, token_hash (unique), created_by, created_at, expires_at, revoked_at
campaign_characters   id, campaign_id, member_id, character_id (unique), attached_at
                      (a character is in one campaign at most and leaves with its member)
campaign_links        id, campaign_id, token_hash (unique), created_at, last_used_at, revoked_at
                      (one live link per campaign; a new one revokes the last)
```

- **Ownership of data.** Pioneer always owns the build (choices, inventory, spells). Play state (HP, temporary
  HP, dying, wounded, conditions, effects, resources) follows the campaign's `play_sync` mode, set by the GM:
  `foundry` (Foundry is the source of truth; Pioneer mirrors it read-only), `pioneer` (players manage it in
  Pioneer; the actor follows and Foundry edits are overwritten by the next push) or `disconnected` (the default;
  each side tracks its own).
- **Foundry module** ([ADR-0023](../adr/0022-foundry-module-and-sync-model.md)). A Pioneer module for Foundry,
  installed from the manifest Pioneer serves at `/foundry/module.json`, pulls the campaign's characters as pf2e
  actors (see [Foundry export](#foundry-export)) and flags each actor with its character id and revisions.
  Foundry servers are often behind NAT, so the module always calls Pioneer, never the reverse. It sends the
  campaign's link token in a `Pioneer-Link-Token` header to CORS-enabled routes under `/api/foundry/v1`, and keeps
  the token in the GM's user setting, out of players' browsers.
- **Change detection.** While a player is connected to the world, the client of the GM who holds the token polls
  `GET /api/foundry/v1/campaign` every 10 seconds (the server sets the interval) with `If-None-Match`. With only
  the GM connected it polls once when the world loads and when the GM presses "Sync now", and otherwise not at
  all. The `ETag` comes from the sync mode, the export generation (exporter version and content release) and each character's
  `version` and `play_revision`, so an unchanged party is a `304`.
- **Build changes** reach Foundry when the module sees a new character `version` or export generation. The re-sync
  updates the items it exported in place, matched by their `itemKey` flag, and leaves play-state fields and every
  other item alone.
- **Play state** lives in its own `character_play` record with its own `play_revision`, so build saves and
  play-state writes never conflict. It syncs per mode: in `foundry` mode the module sends a full snapshot on each
  actor change, ordered by a per-actor sequence; in `pioneer` mode the module writes Pioneer's play state to the
  actor on entering the mode and on each new `play_revision`. Conditions map by slug and effects by
  compendium source; ones Pioneer does not know are kept as foreign entries and reported.
- **Players and Foundry users.** The GM maps each character's player to a Foundry user in the module, which sets
  the actor's ownership. Pioneer never stores Foundry user ids.
- **Invites.** The GM makes invite links that work for 7 days unless revoked. The token (256 random bits) is
  shown once and only its SHA-256 is stored. A signed-in user who opens a working link joins as a player;
  opening it again as a member is harmless. An unknown token is a 404 and an expired or revoked one a 410, each
  with its own message. Member names come from identity through the `MemberDirectory` port, adapted in the
  API's composition root. The link is `/campaigns/join#<token>`: browsers never send a
  fragment, so the token stays out of request logs. The join page moves it to session storage and out of the
  address bar before calling the API, so a signed-out visitor goes to sign in with a return path that holds no
  token and joins when they come back.
- **Members.** The GM removes players and hands the GM role to another member, staying on as a player; a player
  leaves. The GM can't be removed or leave until they hand the role over, so a campaign always has one. A removed
  member's next request for the campaign is a 404, and removing them revokes the campaign's open invites first, so
  an old link can't bring them back (a join holds its invite's lock, so none slips in between). Concurrent changes
  to one campaign's members run one at a time: each writes only if the campaign is still at the version the
  request read, and is a 409 otherwise. Requests name members by id, so a stale page removing someone already
  gone is no change and handing the role to them is a 404. Each button asks first with a second press (frontier
  rule 4).
- **Party.** A member attaches a character they own; its owner or the GM detaches it. Another user's character
  is a 404 (as for characters themselves) and one already in another campaign a 409. Each attachment belongs to
  its owner's membership, so removing or leaving takes their characters out, and the attach checks the
  membership under a key share lock so a removal that commits first stops it. Character names and levels come
  from the character context through the `CharacterDirectory` port, adapted in the API's composition root.
- **Item transfer.** A member offers an item (with its runes, custom name and contents) or coins from one of their
  campaign characters to another; the recipient's owner accepts or declines, and the giver can withdraw until then.
  Accepting moves it in one transaction that checks both characters' versions, so neither side re-adds it by hand.
  Inventory is build data, so transfers work in every sync mode.
- **Permissions.** Policies live in the campaign context's application layer, with the acting user from identity's
  `RequestAuthenticator` (ADR-0007), or the campaign from a link token for module routes. Owners edit builds;
  members see the party overview.

## Accounts

OAuth sign-in (Discord, Google, GitHub) is required to save characters, use homebrew and join campaigns. The
content browser, rules reference and the public Legal page (footer link: Paizo notices, Foundry pf2e derivation,
downloadable content caches) need no account, so no Paizo material sits behind sign-in. See
[ADR-0007](../adr/0007-oauth-required-public-content.md).

## Foundry export

Export a character as a Foundry pf2e actor JSON for a pinned Foundry pf2e system version:

- Official items are embedded with their compendium source (`externalIds.foundry`), so Foundry links them back to
  its compendium and its own rule elements do the maths.
- Choices map to Foundry's flags (`ChoiceSet` selections, boosts, skill ranks); inventory maps to item state.
- Homebrew entries are embedded as items with our rule elements translated back (the translator in
  `libs/interop/foundry` is shared with the importer, run in reverse).
- Verification: export the golden pregens, import them into Foundry and compare its computed numbers with ours.
  Manual checklist first; automated if a headless Foundry harness proves practical.
