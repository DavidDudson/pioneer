# 0065. A docked drawer for secondary content; popovers for transient description

- Status: Proposed
- Date: 2026-10-16

## Context

The interaction rules ban every overlay: modals, popovers, toasts. Secondary content (a spell's detail beside the
list that found it, a long description behind a term) then had only two homes: expanded in place, which pushes the
rest of the page away, or its own route, which loses the list. `fr-hover-card` and tooltips want `popover` for a short,
transient description, which the rule forbids.

## Decision

1. A **docked, content-pushing drawer** (`fr-drawer`) is the preferred home for secondary content. It sits beside the
   page content, which narrows and reflows; it never covers it. It is non-modal: the page stays interactive and focus
   is not trapped. Its open state is a query parameter, so it survives reload and sharing. Below the `lg` container
   size it stacks under the content.
2. **Popovers, tooltips and hover cards are allowed** for transient, non-blocking description: they explain what is
   under the pointer or focus, hold nothing the user must act on, and disappear when attention moves. Anything the
   user acts on belongs in the page or the drawer.
3. **Toasts stay banned.** Feedback is inline, next to what caused it.
4. **Modals stay banned** wherever a page or a drawer fits. No exception is named today; one needs its own ADR.

`pioneer/no-interruptions` follows: `popover` is no longer reported; `<dialog>`, `role="dialog|alertdialog"` and
internal `href` still are. Toasts have no lint of their own (they are a library or a floating `role="status"`), so
rule 1 of the interaction rules stays a review point.

## Consequences

- Detail views can open beside their list without a route change per row.
- A popover is a description, never a control surface; reviewers hold features to that.
- `fr-drawer` is the second component (after `fr-page-aside`) allowed container-query classes, since its width beside
  the page body is its whole job.
