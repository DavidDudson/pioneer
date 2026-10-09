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
campaigns             id, name, gm_id, created_at
campaign_members      campaign_id, user_id, role (gm | player)
campaign_invites      id, campaign_id, token hash, expires_at, revoked_at
campaign_characters   campaign_id, character_id (a character is in one campaign at most)
campaign_links        id, campaign_id, token hash, last_used_at, revoked_at
```

- **Ownership of data.** Pioneer owns the build (choices, inventory, spells). Foundry owns play state during a
  session: HP, temporary HP, dying, wounded, conditions, effects and resources. Each side only writes what it owns.
- **Foundry module.** A Pioneer module for Foundry, configured with the Pioneer URL and a per-campaign link token,
  pulls the campaign's characters as pf2e actors (see [Foundry export](#foundry-export)) and flags each actor
  with its character id and revision. Foundry servers are often behind NAT, so the module always calls Pioneer,
  never the reverse.
- **Build changes** reach Foundry when the module sees a new character revision; a re-sync replaces build items
  and keeps Foundry's play state.
- **Play state** flows back: the module posts actor changes to Pioneer, which stores them in the character's
  `document.play`, so the sheet and the campaign's party overview show the current state.
- **Permissions.** Policies live in the campaign context's application layer, with the acting user from identity's
  `RequestAuthenticator` (ADR-0007), or the campaign from a link token for module routes. Owners edit builds;
  members see the party overview.
- The module's distribution, change detection and condition mapping are settled by the spike #216.

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
