# 0019. Rich text is a document AST, rendered by `rules/ui`

- Status: Proposed
- Date: 2026-10-10

## Context

Content descriptions arrive from Foundry pf2e as HTML with enrichers (`@UUID`, `@Check`, `@Damage`, `@Template`).
[content-model.md](../architecture/content-model.md) already says they are stored as a safe AST, not HTML, so that
references, checks and damage stay live and nothing an author writes becomes markup. Epic 2.1 (#227) builds that AST
and its first renderer, which the content browser, the character sheet and the rules playground will all share.

The `rules/*` libraries so far were all `platform:any` and framework-free. A renderer needs Angular and frontier, and
it has to sit somewhere every feature area can import.

## Decision

- **The AST lives in `rules/sdk`** (`RichText`), beside the other content schemas. It covers Foundry's enrichers
  without loss for remaster content: dice counts may be formulas (`(@item.level)d6`), damage has instances with a type
  and a persistent or splash category, or heals; a check's DC is a number or another statistic's DC (`against`);
  a line may have a width; `basic` is only valid on saves. Line breaks are an inline node, since table cells and
  headings hold inline content only and cannot be split into paragraphs. Size and depth are bounded before the
  recursive parse.
- **Rendering lives in a new `libs/rules/ui`** (`scope:rules`, `type:ui`, `platform:web`), the one web-only `rules`
  library. It depends on `rules/sdk` and frontier only, so any feature can use it and it cannot reach into a feature.
  Alternatives were a `content/ui` library (content is data and `libs/content` is being retired) and rendering
  inside each feature (three copies of the same renderer).
- **Pages give names and links through DI** (`provideRichTextLinks`), not inputs. Lists nest rich text inside
  itself, so inputs would be threaded through every level, and the page that knows the content (browser, sheet) is
  the one that provides them. Without a provider, references show their own label and link nowhere, and statistics
  read as a generic "check" or "saving throw".
- **Tables render through `fr-table`**, the owner of table elements, with cells as components
  (`tableComponent`) and a hidden generic caption when the text gives none. The table is deferred so text without a
  table never loads TanStack Table.
- **Action glyphs render through `fr-glyph`**: shown, hidden from screen readers, and read out as their translated
  name. They are content symbols with no Lucide icon, so they are an exception to frontier's no-unicode-glyphs rule.
- **Words come from messages, units from `LocaleFormat`.** Damage types, categories, area shapes and duration units
  map to message keys through `Record`s over their const objects, so a new value fails type-checking; distances
  follow the viewer's feet or metres.

## Consequences

- The `rules/*` dependency rule in [the architecture README](../architecture/README.md) now has one web-only member.
- The importer (Epic 2.5) targets this AST; enrichers it cannot express are reported, not flattened to text.
- Rolling checks and damage from text arrives with the dice work; the nodes already carry what a roll needs.
- A table without a header still renders an empty header row until `fr-table` can leave it out.
