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

Turn tracking (actions spent, reaction used, start/end of turn effects such as frightened decreasing) is local in
solo play and driven by the encounter tracker in a campaign.

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

RNG: browser `crypto.getRandomValues` for solo play; in a campaign, rolls are made **on the server** with a
CSPRNG and broadcast, so every player sees the same, untampered result. GM secret rolls are visible only to the GM.

## Campaigns

```text
campaigns             id, name, gm_id, settings jsonb (visibility, variant rules), packs
campaign_members      campaign_id, user_id, role (gm | player | observer)
campaign_characters   campaign_id, character_id, visibility overrides
encounters            id, campaign_id, status, round, turn_index, combatants jsonb
campaign_events       id, campaign_id, seq bigint, at, actor_id, character_id?, kind, payload jsonb
```

- **Events are the source of truth for live play.** Rolls, damage, healing, condition and effect changes,
  resource spending, initiative, turn changes, chat notes. `campaign_events` is append-only with a per-campaign
  sequence. Applying a command writes the event and updates the character's `play` projection in one transaction.
- **Live sync.** Clients hold a Server-Sent Events stream per open campaign; commands are plain `POST`s. After
  commit the API sends `NOTIFY` on the campaign's channel with the sequence; each open stream listens and sends
  the new events. Each event's SSE `id` is its sequence, so the browser resumes with `Last-Event-ID` and the
  server replays the gap: delivery is at-least-once and ordered. Streams end after 5 minutes and resume, which
  also re-checks the session. See [ADR-0017](../adr/0017-live-sync-over-server-sent-events.md).
- **Introspection.** Every member can open any party character's sheet with the same breakdowns (read-only). The
  GM controls what players see of each other (full sheet, summary, HP band only) in campaign settings; GMs see
  everything. The party view shows HP, conditions, AC, saves, Perception and the current turn at a glance.
- **Combat log.** A rendered view of the event stream: who did what, rolls with expandable breakdowns, damage with
  IWR applied, conditions with their sources. Filterable by character and round.
- **Encounter tracker.** Initiative order (players roll from their sheets; GM adds creatures from Monster Core
  or ad hoc stat lines), round and turn, delay and ready. Deliberately no map, tokens or measurement.
- **Permissions.** Each context's policies live in its own application layer and are checked in application
  services, with the acting user from identity's `RequestAuthenticator` (ADR-0007): owner edits build; GM can
  apply damage, conditions, effects and overrides to campaign characters; players act on their own.

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
