# 0049. A spell's duration may be left to its text, as `varies`

- Status: Proposed; amends [0021](0021-structured-spell-casting-fields.md)
- Date: 2026-10-12

## Context

ADR-0021 makes casting fields closed structures with no free-text arm, and reports a wording that doesn't map. The
Player Core import left 32 spells and 7 rituals without a duration because Foundry writes it as "varies" or "see
text" (#543). Most of them (Fear, Paralyze, Dizzying Colors) last as long as the degree of success says: 1 round on a
success, 1 minute on a failure, and nothing on a critical success. Modelling that would mean a duration per degree of
success, which the rest of the spell's outcome text (conditions, damage) doesn't have either. The rest describe a
condition in prose (Geas, Planar Servitor, Animal Messenger). Choices ("10 minutes or 8 hours"), "up to 10 minutes"
and rolled durations ("4d12 hours") are structured and get arms of their own.

## Decision

`duration` gains a `varies` arm with no fields: the spell has a duration and its text says what it is. The importer
maps "varies", "see text", "see below" and "1 or more rounds" to it. It is a marker, not a free-text fallback: it holds
no text, and a wording that states a duration with a condition ("1 minute or until used", "until full tribute is
paid") is still reported rather than mapped to `varies`.

An area's `details` is rich text beside its shape and size ("all squares in a 20-foot-radius burst that contain
plants"). It narrows a structured area, as `cost` and `requirements` sit beside the structured fields, and is not a
replacement for one.

## Consequences

- Those spells import with their whole casting block, and the duration facet can offer "Varies" as a value.
- Nothing reads how long a `varies` spell lasts. An effect a spell applies carries its own duration (#546), so the
  sheet tracks the outcome there, not on the spell.
- A later per-degree duration can replace `varies` entry by entry without a schema break.
